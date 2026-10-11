// Fails when a frontend's design tokens drift from docs/design-system.md, or when the two
// frontends' token files differ from each other. Run from anywhere: `node scripts/check-tokens.mjs`.
import { existsSync, readdirSync, readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const FRONTENDS = ['frontend-web', 'frontend-admin'];
const TOKENS_DIR = 'src/styles/tokens/';

/** Lower-case, single spaces, double quotes, 6-digit hex, `var(--color-ink-900)` → `ink-900`. */
const normalize = (value) =>
  value
    .trim()
    .toLowerCase()
    .replaceAll("'", '"')
    .replace(/\s+/g, ' ')
    .replace(/#([0-9a-f])([0-9a-f])([0-9a-f])\b/g, '#$1$1$2$2$3$3')
    .replace(/^var\(--color-([a-z]+-\d+)\)$/, '$1');

// --- CSS ---------------------------------------------------------------------------------------

/** Token values per theme from a frontend's tokens folder; responsive overrides are ignored. */
const readCssTokens = (frontend) => {
  const dir = new URL(`${frontend}/${TOKENS_DIR}`, root);
  const tokens = { light: new Map(), dark: new Map(), files: new Map() };
  for (const file of readdirSync(dir)
    .filter((name) => name.endsWith('.css'))
    .sort()) {
    const raw = readFileSync(new URL(file, dir), 'utf8');
    tokens.files.set(file, raw);
    // Drop comments and responsive blocks (@media { :root { … } }) — the document lists base values.
    const css = raw
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/@media[^{]+\{[^{}]*\{[^{}]*\}\s*\}/g, '');
    for (const [, name, query] of css.matchAll(/@custom-media\s+(--[\w-]+)\s+([^;]+);/g)) {
      tokens.light.set(name, normalize(query));
    }
    for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const scope = selector.trim();
      const theme = scope === ':root' ? 'light' : scope.includes('data-theme') ? 'dark' : null;
      if (theme === null) continue;
      for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
        tokens[theme].set(name, normalize(value));
      }
    }
  }
  return tokens;
};

// --- Design system document ---------------------------------------------------------------------

const cells = (row) =>
  row
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim());
const ticks = (text) => [...text.matchAll(/`([^`]+)`/g)].map((match) => match[1]);

/** "`--color-success` / `-subtle` / `--color-on-success-subtle`" → three full names. */
const expandNames = (cell) => {
  const parts = ticks(cell);
  return parts.map((part) => (part.startsWith('--') ? part : `${parts[0]}${part}`));
};

/** Expected tokens: name → { light, dark }; an undefined value means "must exist". */
const readDocTokens = () => {
  const lines = readFileSync(new URL('docs/design-system.md', root), 'utf8').split('\n');
  const expected = new Map();
  const expect = (name, light, dark) =>
    expected.set(name, {
      light: light === undefined ? undefined : normalize(light),
      dark: dark === undefined ? undefined : normalize(dark),
    });
  const scaleSteps = cells(lines.find((line) => line.startsWith('| Scale')) ?? '').slice(1);

  lines.forEach((line, index) => {
    if (!line.startsWith('|')) return;
    const row = cells(line);
    // Primitive colour scales: | `--color-saffron-*` (brand) | #FFF4ED | … |
    const scale = row[0].match(/^`(--color-[a-z]+)-\*`/);
    if (scale !== null) {
      scaleSteps.forEach((step, i) => expect(`${scale[1]}-${step}`, row[i + 1]));
      return;
    }
    // Spacing scale: a row of names, the |---| row, then a row of values.
    if (row[0] === '`--space-0`') {
      const values = cells(lines[index + 2]);
      row.forEach((cell, i) => {
        const name = ticks(cell)[0];
        expect(name.startsWith('--') ? name : `--space${name}`, values[i]);
      });
      return;
    }
    if (!row[0].startsWith('`--')) {
      // Groups written inline: `--radius-sm 4px` · `--radius-md 8px` …
      for (const span of ticks(row.slice(1).join(' '))) {
        const match = span.match(/^(--[\w-]+)\s+(.+)$/);
        if (match !== null) expect(match[1], match[2]);
      }
      return;
    }
    const names = expandNames(row[0]);
    if (row.length >= 4 && /^(#|[a-z]+-\d)/i.test(row[1])) {
      // Semantic colours: | names | light | dark | use |
      const light = row[1].split('/').map((value) => value.trim());
      const dark = row[2].split('/').map((value) => value.trim());
      names.forEach((name, i) => expect(name, light[i], dark[i]));
      return;
    }
    // Semantic spacing and fonts: | names | `value` [/ `value`] [→ responsive value] |
    const values = ticks(row[1].split('→')[0]);
    names.forEach((name, i) => expect(name, values[i]));
  });
  return expected;
};

// --- Checks ------------------------------------------------------------------------------------

const problems = [];
const expected = readDocTokens();
const present = FRONTENDS.filter((frontend) =>
  existsSync(new URL(`${frontend}/${TOKENS_DIR}`, root)),
);
const parsed = present.map(readCssTokens);

present.forEach((frontend, index) => {
  const tokens = parsed[index];
  for (const [name, { light, dark }] of expected) {
    const actual = tokens.light.get(name);
    if (actual === undefined) problems.push(`${frontend}: ${name} is missing`);
    else if (light !== undefined && actual !== light) {
      problems.push(`${frontend}: ${name} is "${actual}", the design system says "${light}"`);
    }
    if (dark !== undefined && tokens.dark.get(name) !== dark) {
      problems.push(
        `${frontend}: dark ${name} is "${tokens.dark.get(name)}", the design system says "${dark}"`,
      );
    }
  }
});

if (parsed.length === 2) {
  const [first, second] = parsed;
  const files = new Set([...first.files.keys(), ...second.files.keys()]);
  for (const file of files) {
    if (first.files.get(file) !== second.files.get(file)) {
      problems.push(`${TOKENS_DIR}${file} differs between ${present.join(' and ')}`);
    }
  }
}

if (problems.length > 0) {
  console.error('Design tokens are out of sync with docs/design-system.md:');
  problems.forEach((problem) => console.error(`  - ${problem}`));
  process.exit(1);
}
console.log(
  `Design tokens match docs/design-system.md (${expected.size} tokens in ${present.join(', ')})`,
);
