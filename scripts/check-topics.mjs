// Fails when infra/docker/kafka/topics.txt and TopicUtil.allTopicNames() disagree.
// Run after building the backend: `node scripts/check-topics.mjs`.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../backend/package.json', import.meta.url));
const { TopicUtil } = await import(require.resolve('@bazaar/contracts'));

const listed = readFileSync(new URL('../infra/docker/kafka/topics.txt', import.meta.url), 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.length > 0 && !line.startsWith('#'))
  .map((line) => line.split(/\s+/)[0]);

const expected = TopicUtil.allTopicNames();
const missing = expected.filter((topic) => !listed.includes(topic));
const extra = listed.filter((topic) => !expected.includes(topic));

if (missing.length > 0 || extra.length > 0) {
  console.error('topics.txt is out of sync with @bazaar/contracts');
  if (missing.length > 0) console.error('  missing:', missing.join(', '));
  if (extra.length > 0) console.error('  unknown:', extra.join(', '));
  process.exit(1);
}
console.log(`topics.txt matches contracts (${expected.length} topics)`);
