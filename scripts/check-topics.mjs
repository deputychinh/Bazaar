// Fails when infra/docker/kafka/topics.txt, TopicUtil.allTopicNames() and the Strimzi KafkaTopic
// manifests disagree. topics.txt is the source; `--write` regenerates the manifests from it.
// Run after building the backend: `node scripts/check-topics.mjs [--write]`.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const TOPICS_FILE = new URL('../infra/docker/kafka/topics.txt', import.meta.url);
const MANIFEST_FILE = new URL(
  '../infra/k8s/overlays/local/data/kafka-topics.yaml',
  import.meta.url,
);

const topics = readFileSync(TOPICS_FILE, 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.length > 0 && !line.startsWith('#'))
  .map((line) => {
    const [name, partitions, retentionMs] = line.split(/\s+/);
    return { name, partitions: Number(partitions), retentionMs };
  });

const manifest = [
  '# Generated from infra/docker/kafka/topics.txt by `node scripts/check-topics.mjs --write`.',
  '# Do not edit by hand: CI fails when this file and topics.txt disagree.',
  ...topics.map(({ name, partitions, retentionMs }) =>
    [
      '---',
      'apiVersion: kafka.strimzi.io/v1',
      'kind: KafkaTopic',
      'metadata:',
      `  name: ${name}`,
      '  labels: { strimzi.io/cluster: bazaar }',
      'spec:',
      `  partitions: ${partitions}`,
      '  replicas: 1',
      ...(retentionMs === undefined ? [] : ['  config:', `    retention.ms: ${retentionMs}`]),
    ].join('\n'),
  ),
  '',
].join('\n');

if (process.argv.includes('--write')) {
  writeFileSync(MANIFEST_FILE, manifest);
  console.log(`wrote ${topics.length} KafkaTopic manifests`);
}

const require = createRequire(new URL('../backend/package.json', import.meta.url));
const { TopicUtil } = await import(require.resolve('@bazaar/contracts'));
const listed = topics.map((topic) => topic.name);
const expected = TopicUtil.allTopicNames();
const missing = expected.filter((topic) => !listed.includes(topic));
const extra = listed.filter((topic) => !expected.includes(topic));
let failed = false;

if (missing.length > 0 || extra.length > 0) {
  console.error('topics.txt is out of sync with @bazaar/contracts');
  if (missing.length > 0) console.error('  missing:', missing.join(', '));
  if (extra.length > 0) console.error('  unknown:', extra.join(', '));
  failed = true;
}
let current = '';
try {
  current = readFileSync(MANIFEST_FILE, 'utf8');
} catch {
  // Missing file: reported below.
}
if (current !== manifest) {
  console.error('kafka-topics.yaml is stale: run `node scripts/check-topics.mjs --write`');
  failed = true;
}
if (failed) process.exit(1);
console.log(`topics.txt matches contracts and KafkaTopic manifests (${expected.length} topics)`);
