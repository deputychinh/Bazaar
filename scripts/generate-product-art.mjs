// Generates the seed catalogue's product illustrations: one flat SVG per product type and colour,
// written to infra/docker/storage/placeholders/art-<type>-<colour>.svg (uploaded by storage-init),
// plus the Kubernetes ConfigMap list that ships them to the cluster.
// Run: `node scripts/generate-product-art.mjs` (deterministic output).
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';

const OUT = new URL('../infra/docker/storage/placeholders/', import.meta.url);
const K8S = new URL('../infra/k8s/overlays/local/data/storage-placeholders/', import.meta.url);

/** The five variant colours of the seed data (backend/db/catalog/data.js). */
const COLOURS = {
  indigo: '#3f4f9a',
  ivory: '#efe4cc',
  jade: '#2f9b7c',
  terracotta: '#c8643b',
  charcoal: '#3b3d42',
};
/** Background tint per top-level category. */
const SCENES = {
  kitchen: ['#fff1e6', '#ffd9bf'],
  fashion: ['#fdeef4', '#f8d1e1'],
  crafts: ['#f3efe6', '#e6dcc4'],
  audio: ['#eaf0fb', '#cfdcf5'],
  beauty: ['#eef8f1', '#cfeedb'],
  books: ['#f4f0fb', '#ddd2f3'],
};

const hex = (value) => value.match(/\w\w/g).map((part) => parseInt(part, 16));
const mix = (a, b, amount) =>
  `#${hex(a)
    .map((channel, index) => Math.round(channel + (hex(b)[index] - channel) * amount))
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')}`;
const shade = (colour) => mix(colour, '#000000', 0.28);
const light = (colour) => mix(colour, '#ffffff', 0.35);
const WOOD = '#b07a4a';
const METAL = '#a9b1ba';
const PAPER = '#fbf8f1';
const GOLD = '#d9a646';
const INK = '#2b2b2f';
const accent = (c) => (c === COLOURS.ivory ? COLOURS.indigo : PAPER);

/** Each type: its scene and the shapes, given the main colour `c`. Coordinates on an 800×800 canvas. */
const TYPES = {
  'frying-pan': [
    'kitchen',
    (c) => `
    <rect x="470" y="372" width="250" height="44" rx="22" fill="${WOOD}" transform="rotate(-18 470 394)"/>
    <ellipse cx="350" cy="430" rx="215" ry="150" fill="${shade(c)}"/>
    <ellipse cx="350" cy="410" rx="215" ry="150" fill="${c}"/>
    <ellipse cx="350" cy="405" rx="170" ry="112" fill="${INK}"/>
    <ellipse cx="300" cy="370" rx="60" ry="22" fill="#ffffff" opacity=".12"/>`,
  ],
  'clay-pot': [
    'kitchen',
    (c) => `
    <path d="M210 380 Q200 600 400 610 Q600 600 590 380 Z" fill="${c}"/>
    <path d="M210 380 Q200 600 400 610 Q300 590 290 380 Z" fill="${light(c)}" opacity=".35"/>
    <rect x="185" y="350" width="430" height="48" rx="24" fill="${shade(c)}"/>
    <path d="M230 352 Q400 250 570 352 Z" fill="${c}"/>
    <circle cx="400" cy="282" r="26" fill="${shade(c)}"/>
    <rect x="150" y="410" width="60" height="26" rx="13" fill="${shade(c)}"/>
    <rect x="590" y="410" width="60" height="26" rx="13" fill="${shade(c)}"/>`,
  ],
  'knife-set': [
    'kitchen',
    (c) => `
    <path d="M300 230 L330 230 L330 380 L300 380 Z" fill="${METAL}"/>
    <path d="M370 190 L405 190 L405 380 L370 380 Z" fill="${light(METAL)}"/>
    <path d="M445 250 L472 250 L472 380 L445 380 Z" fill="${METAL}"/>
    <path d="M250 380 L550 380 L590 620 L210 620 Z" fill="${WOOD}"/>
    <path d="M250 380 L550 380 L560 430 L240 430 Z" fill="${shade(WOOD)}"/>
    <rect x="292" y="330" width="46" height="70" rx="12" fill="${c}"/>
    <rect x="364" y="320" width="48" height="80" rx="12" fill="${c}"/>
    <rect x="438" y="335" width="42" height="65" rx="12" fill="${c}"/>`,
  ],
  'rice-bowl': [
    'kitchen',
    (c) => `
    <path d="M180 380 Q190 600 400 600 Q610 600 620 380 Z" fill="${c}"/>
    <path d="M250 450 Q400 520 550 450" stroke="${light(c)}" stroke-width="14" fill="none" stroke-linecap="round"/>
    <ellipse cx="400" cy="380" rx="220" ry="46" fill="${shade(c)}"/>
    <ellipse cx="400" cy="372" rx="190" ry="34" fill="${PAPER}"/>
    <rect x="380" y="590" width="40" height="30" fill="${shade(c)}"/>
    <rect x="300" y="250" width="16" height="300" rx="8" fill="${WOOD}" transform="rotate(38 300 250)"/>
    <rect x="340" y="240" width="16" height="300" rx="8" fill="${shade(WOOD)}" transform="rotate(42 340 240)"/>`,
  ],
  'dinner-plate': [
    'kitchen',
    (c) => `
    <ellipse cx="400" cy="440" rx="270" ry="150" fill="${shade(c)}"/>
    <ellipse cx="400" cy="425" rx="270" ry="150" fill="${c}"/>
    <ellipse cx="400" cy="425" rx="195" ry="105" fill="${PAPER}"/>
    <ellipse cx="400" cy="425" rx="195" ry="105" fill="none" stroke="${light(c)}" stroke-width="10" stroke-dasharray="18 14"/>`,
  ],
  'chopstick-set': [
    'kitchen',
    (c) => `
    <rect x="200" y="360" width="440" height="22" rx="11" fill="${c}" transform="rotate(-12 420 371)"/>
    <rect x="190" y="410" width="440" height="22" rx="11" fill="${shade(c)}" transform="rotate(-8 410 421)"/>
    <rect x="200" y="360" width="90" height="22" rx="11" fill="${GOLD}" transform="rotate(-12 420 371)"/>
    <rect x="190" y="410" width="90" height="22" rx="11" fill="${GOLD}" transform="rotate(-8 410 421)"/>
    <rect x="470" y="440" width="120" height="44" rx="22" fill="${WOOD}"/>`,
  ],
  'linen-shirt': [
    'fashion',
    (c) => `
    <path d="M300 200 L250 220 L150 320 L210 390 L260 350 L260 620 L540 620 L540 350 L590 390 L650 320 L550 220 L500 200 Q400 260 300 200 Z" fill="${c}"/>
    <path d="M300 200 L360 300 L400 250 L440 300 L500 200 Q400 240 300 200 Z" fill="${shade(c)}"/>
    <line x1="400" y1="260" x2="400" y2="620" stroke="${shade(c)}" stroke-width="6"/>
    <circle cx="400" cy="330" r="7" fill="${accent(c)}"/><circle cx="400" cy="410" r="7" fill="${accent(c)}"/>
    <circle cx="400" cy="490" r="7" fill="${accent(c)}"/><circle cx="400" cy="570" r="7" fill="${accent(c)}"/>`,
  ],
  'ao-dai': [
    'fashion',
    (c) => `
    <path d="M350 170 L450 170 L455 220 L530 250 L600 420 L560 435 L510 330 L520 680 L280 680 L290 330 L240 435 L200 420 L270 250 L345 220 Z" fill="${c}"/>
    <path d="M350 170 L450 170 L455 215 Q400 235 345 215 Z" fill="${shade(c)}"/>
    <path d="M400 230 Q470 280 455 340" stroke="${GOLD}" stroke-width="8" fill="none"/>
    <path d="M330 480 L400 680 L470 480" fill="${shade(c)}" opacity=".35"/>`,
  ],
  'cotton-dress': [
    'fashion',
    (c) => `
    <path d="M330 180 L370 180 Q400 230 430 180 L470 180 L500 330 L620 640 L180 640 L300 330 Z" fill="${c}"/>
    <rect x="300" y="320" width="200" height="34" fill="${shade(c)}"/>
    <path d="M250 520 Q400 560 550 520" stroke="${light(c)}" stroke-width="10" fill="none"/>`,
  ],
  'conical-hat': [
    'fashion',
    (c) => `
    <ellipse cx="400" cy="560" rx="300" ry="70" fill="${shade(c)}"/>
    <path d="M400 190 L700 555 Q400 640 100 555 Z" fill="${c === COLOURS.ivory ? '#e8d3a2' : c}"/>
    <path d="M400 190 L250 570 M400 190 L330 590 M400 190 L470 590 M400 190 L550 570" stroke="${shade(c)}" stroke-width="5" opacity=".5"/>
    <path d="M130 545 Q400 615 670 545" stroke="${GOLD}" stroke-width="12" fill="none"/>`,
  ],
  'leather-wallet': [
    'fashion',
    (c) => `
    <rect x="190" y="290" width="420" height="270" rx="34" fill="${shade(c)}"/>
    <rect x="190" y="270" width="420" height="270" rx="34" fill="${c}"/>
    <rect x="212" y="292" width="376" height="226" rx="22" fill="none" stroke="${light(c)}" stroke-width="5" stroke-dasharray="14 10"/>
    <path d="M420 330 L610 330 L610 450 L420 450 Q380 390 420 330 Z" fill="${shade(c)}"/>
    <circle cx="455" cy="390" r="16" fill="${GOLD}"/>`,
  ],
  'silk-scarf': [
    'fashion',
    (c) => `
    <path d="M160 300 Q300 220 420 300 T680 300 L640 420 Q520 340 400 420 T150 420 Z" fill="${c}"/>
    <path d="M150 420 Q280 500 400 420 T640 420 L600 560 Q480 480 380 560 T190 560 Z" fill="${shade(c)}"/>
    <path d="M190 330 Q300 280 420 330" stroke="${GOLD}" stroke-width="6" fill="none"/>`,
  ],
  'ceramic-vase': [
    'crafts',
    (c) => `
    <path d="M340 190 L460 190 L450 260 Q600 340 560 500 Q530 640 400 640 Q270 640 240 500 Q200 340 350 260 Z" fill="${c}"/>
    <rect x="325" y="180" width="150" height="30" rx="12" fill="${shade(c)}"/>
    <path d="M270 430 Q400 470 530 430" stroke="${accent(c)}" stroke-width="12" fill="none"/>
    <path d="M300 480 Q400 520 500 480" stroke="${accent(c)}" stroke-width="6" fill="none" opacity=".7"/>
    <path d="M300 330 Q280 420 310 520" stroke="#ffffff" stroke-width="14" fill="none" opacity=".18" stroke-linecap="round"/>`,
  ],
  'ceramic-tea-set': [
    'crafts',
    (c) => `
    <path d="M250 330 Q230 520 360 530 Q490 520 470 330 Z" fill="${c}"/>
    <path d="M470 370 Q560 360 600 300" stroke="${c}" stroke-width="22" fill="none" stroke-linecap="round"/>
    <path d="M250 380 Q190 400 210 450 Q230 480 255 460" stroke="${shade(c)}" stroke-width="18" fill="none"/>
    <ellipse cx="360" cy="330" rx="112" ry="22" fill="${shade(c)}"/>
    <circle cx="360" cy="300" r="20" fill="${shade(c)}"/>
    <path d="M520 520 Q520 600 580 600 Q640 600 640 520 Z" fill="${c}"/>
    <path d="M160 540 Q160 610 210 610 Q260 610 260 540 Z" fill="${c}"/>
    <ellipse cx="580" cy="520" rx="60" ry="12" fill="${shade(c)}"/><ellipse cx="210" cy="540" rx="50" ry="10" fill="${shade(c)}"/>`,
  ],
  'incense-holder': [
    'crafts',
    (c) => `
    <path d="M230 420 Q240 560 400 560 Q560 560 570 420 Z" fill="${c}"/>
    <ellipse cx="400" cy="420" rx="170" ry="34" fill="${shade(c)}"/>
    <rect x="300" y="555" width="40" height="50" rx="8" fill="${shade(c)}"/><rect x="460" y="555" width="40" height="50" rx="8" fill="${shade(c)}"/>
    <rect x="380" y="230" width="8" height="190" fill="${WOOD}"/><rect x="410" y="250" width="8" height="170" fill="${WOOD}" transform="rotate(8 414 420)"/>
    <path d="M384 225 Q360 190 390 160 Q420 130 395 95" stroke="#9aa3ad" stroke-width="5" fill="none" opacity=".7"/>`,
  ],
  'silk-pillowcase': [
    'crafts',
    (c) => `
    <path d="M190 300 Q400 260 610 300 Q650 420 610 540 Q400 580 190 540 Q150 420 190 300 Z" fill="${c}"/>
    <path d="M190 300 Q400 340 610 300" stroke="${light(c)}" stroke-width="8" fill="none" opacity=".6"/>
    <path d="M260 420 Q400 460 540 420" stroke="${shade(c)}" stroke-width="6" fill="none" opacity=".5"/>`,
  ],
  'silk-fabric': [
    'crafts',
    (c) => `
    <rect x="200" y="470" width="400" height="80" rx="16" fill="${shade(c)}"/>
    <rect x="215" y="400" width="370" height="80" rx="16" fill="${c}"/>
    <rect x="230" y="330" width="340" height="80" rx="16" fill="${light(c)}"/>
    <path d="M570 370 Q650 420 600 520 Q560 600 640 640" stroke="${c}" stroke-width="40" fill="none" stroke-linecap="round"/>`,
  ],
  'silk-robe': [
    'crafts',
    (c) => `
    <path d="M330 190 L470 190 L560 240 L650 430 L590 450 L540 360 L560 660 L240 660 L260 360 L210 450 L150 430 L240 240 Z" fill="${c}"/>
    <path d="M330 190 L400 420 L470 190" stroke="${shade(c)}" stroke-width="18" fill="none"/>
    <rect x="250" y="420" width="300" height="34" fill="${shade(c)}"/>
    <path d="M500 454 L540 560 M520 454 L580 540" stroke="${shade(c)}" stroke-width="14" stroke-linecap="round"/>`,
  ],
  'wireless-earbuds': [
    'audio',
    (c) => `
    <rect x="250" y="340" width="300" height="230" rx="80" fill="${c}"/>
    <path d="M250 430 L550 430" stroke="${shade(c)}" stroke-width="6"/>
    <circle cx="400" cy="500" r="9" fill="#5be3a0"/>
    <ellipse cx="335" cy="300" rx="44" ry="40" fill="${light(c)}"/><rect x="322" y="300" width="26" height="90" rx="13" fill="${light(c)}"/>
    <ellipse cx="470" cy="290" rx="44" ry="40" fill="${light(c)}"/><rect x="457" y="290" width="26" height="90" rx="13" fill="${light(c)}"/>`,
  ],
  'bluetooth-speaker': [
    'audio',
    (c) => `
    <rect x="200" y="320" width="400" height="220" rx="110" fill="${c}"/>
    <rect x="240" y="350" width="320" height="160" rx="80" fill="${shade(c)}"/>
    <g fill="${light(c)}" opacity=".55">${Array.from({ length: 24 }, (_, i) => `<circle cx="${290 + (i % 8) * 31}" cy="${385 + Math.floor(i / 8) * 45}" r="7"/>`).join('')}</g>
    <rect x="360" y="290" width="80" height="22" rx="11" fill="${shade(c)}"/>`,
  ],
  headphones: [
    'audio',
    (c) => `
    <path d="M220 470 Q220 210 400 210 Q580 210 580 470" stroke="${shade(c)}" stroke-width="34" fill="none" stroke-linecap="round"/>
    <rect x="175" y="420" width="110" height="170" rx="46" fill="${c}"/>
    <rect x="515" y="420" width="110" height="170" rx="46" fill="${c}"/>
    <rect x="235" y="445" width="45" height="120" rx="20" fill="${shade(c)}"/>
    <rect x="520" y="445" width="45" height="120" rx="20" fill="${shade(c)}"/>`,
  ],
  'rice-water-toner': [
    'beauty',
    (c) => `
    <rect x="300" y="290" width="200" height="330" rx="40" fill="${c}"/>
    <rect x="300" y="290" width="70" height="330" rx="40" fill="#ffffff" opacity=".12"/>
    <rect x="345" y="220" width="110" height="80" rx="14" fill="${shade(c)}"/>
    <rect x="325" y="390" width="150" height="140" rx="12" fill="${PAPER}"/>
    <path d="M360 470 Q400 420 440 470 Q400 500 360 470 Z" fill="#9bd18b"/>
    <rect x="350" y="495" width="100" height="10" rx="5" fill="#c9c2b4"/>`,
  ],
  'coconut-oil': [
    'beauty',
    (c) => `
    <rect x="250" y="330" width="260" height="280" rx="46" fill="${c}" opacity=".9"/>
    <rect x="240" y="290" width="280" height="64" rx="20" fill="${shade(c)}"/>
    <rect x="285" y="420" width="190" height="110" rx="12" fill="${PAPER}"/>
    <circle cx="380" cy="475" r="30" fill="#7a5130"/><circle cx="380" cy="475" r="18" fill="#f7f1e3"/>
    <path d="M520 600 Q520 470 620 470 Q720 470 720 600 Z" fill="#7a5130"/>
    <path d="M540 600 Q540 495 620 495 Q700 495 700 600 Z" fill="#f7f1e3"/>`,
  ],
  'herbal-soap': [
    'beauty',
    (c) => `
    <path d="M190 400 L600 400 L620 520 Q400 560 180 520 Z" fill="${shade(c)}"/>
    <rect x="190" y="320" width="420" height="140" rx="44" fill="${c}"/>
    <path d="M330 390 Q400 300 470 390 Q400 440 330 390 Z" fill="#7bbf6a"/>
    <path d="M400 330 L400 420" stroke="#4f8f43" stroke-width="5"/>
    <circle cx="560" cy="300" r="22" fill="#ffffff" opacity=".6"/><circle cx="600" cy="260" r="12" fill="#ffffff" opacity=".6"/>`,
  ],
  cookbook: [
    'books',
    (c) => `
    <rect x="235" y="210" width="330" height="420" rx="18" fill="${shade(c)}"/>
    <rect x="250" y="200" width="320" height="420" rx="14" fill="${c}"/>
    <rect x="250" y="200" width="36" height="420" fill="${shade(c)}"/>
    <rect x="320" y="270" width="200" height="16" rx="8" fill="${accent(c)}"/>
    <circle cx="420" cy="420" r="64" fill="${PAPER}"/>
    <path d="M395 380 L395 460 M445 380 Q470 420 445 460" stroke="${c === COLOURS.ivory ? COLOURS.indigo : c}" stroke-width="12" stroke-linecap="round" fill="none"/>`,
  ],
  'travel-guide': [
    'books',
    (c) => `
    <rect x="235" y="210" width="330" height="420" rx="18" fill="${shade(c)}"/>
    <rect x="250" y="200" width="320" height="420" rx="14" fill="${c}"/>
    <path d="M300 300 L360 280 L430 300 L500 280 L500 470 L430 490 L360 470 L300 490 Z" fill="${PAPER}"/>
    <path d="M360 280 L360 470 M430 300 L430 490" stroke="#d8cfbd" stroke-width="4"/>
    <path d="M410 340 Q440 340 440 370 Q440 395 410 430 Q380 395 380 370 Q380 340 410 340 Z" fill="#e5484d"/>
    <rect x="320" y="540" width="180" height="16" rx="8" fill="${accent(c)}"/>`,
  ],
  'poetry-collection': [
    'books',
    (c) => `
    <rect x="235" y="210" width="330" height="420" rx="18" fill="${shade(c)}"/>
    <rect x="250" y="200" width="320" height="420" rx="14" fill="${c}"/>
    <rect x="290" y="240" width="240" height="340" rx="8" fill="none" stroke="${GOLD}" stroke-width="5"/>
    <path d="M470 290 Q380 380 360 500 Q420 420 490 300 Z" fill="${accent(c)}"/>
    <path d="M360 500 L340 540" stroke="${accent(c)}" stroke-width="6"/>
    <rect x="330" y="540" width="160" height="10" rx="5" fill="${GOLD}"/>`,
  ],
};

const svg = (type, colourName) => {
  const [scene, draw] = TYPES[type];
  const [from, to] = SCENES[scene];
  const colour = COLOURS[colourName];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" role="img" aria-label="${type} ${colourName}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
<rect width="800" height="800" fill="url(#g)"/>
<circle cx="640" cy="160" r="120" fill="#ffffff" opacity=".35"/>
<ellipse cx="400" cy="660" rx="260" ry="34" fill="#000000" opacity=".08"/>
<g transform="translate(400 430) scale(1.12) translate(-400 -430)">
${draw(colour).replace(/\n\s+/g, '\n').trim()}
</g>
</svg>
`;
};

mkdirSync(OUT, { recursive: true });
let count = 0;
for (const type of Object.keys(TYPES)) {
  for (const colourName of Object.keys(COLOURS)) {
    writeFileSync(new URL(`art-${type}-${colourName}.svg`, OUT), svg(type, colourName));
    count += 1;
  }
}

// The cluster gets every placeholder through one generated ConfigMap (keys cannot contain "/").
const all = readdirSync(OUT)
  .filter((file) => file.endsWith('.svg'))
  .sort();
mkdirSync(K8S, { recursive: true });
writeFileSync(
  new URL('kustomization.yaml', K8S),
  [
    '# Generated by `node scripts/generate-product-art.mjs` — do not edit by hand.',
    '# Every file of infra/docker/storage/placeholders, uploaded to the images bucket by storage-init.',
    'apiVersion: kustomize.config.k8s.io/v1beta1',
    'kind: Kustomization',
    'namespace: bazaar-data',
    'configMapGenerator:',
    '  - name: storage-placeholders',
    '    files:',
    ...all.map((file) => `      - ../../../../../docker/storage/placeholders/${file}`),
    '',
  ].join('\n'),
);
console.log(`wrote ${count} illustrations; ${all.length} placeholders listed for Kubernetes`);
