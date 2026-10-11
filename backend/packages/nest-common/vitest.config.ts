import { mergeConfig } from 'vitest/config';

import shared from '../../vitest.shared.ts';

export default mergeConfig(shared, {
  test: {
    coverage: {
      // Wiring and Kafka adapters need a real broker: covered by `npm run test:int` instead.
      exclude: [
        'src/**/*.module.ts',
        'src/kafka/kafka-connection.ts',
        'src/kafka/event-producer.ts',
        'src/kafka/event-consumer.ts',
        'src/health/kafka-health.indicator.ts',
      ],
    },
  },
});
