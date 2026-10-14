// OpenTelemetry starts here, before anything else loads (BZ-079): keep this the first import of
// main.ts. Off unless OTEL_EXPORTER_OTLP_ENDPOINT is set.
import { Tracing } from '@bazaar/nest-common/tracing';

import { CATALOG_SERVICE_NAME } from './constants/catalog.constant.js';

Tracing.start({ serviceName: CATALOG_SERVICE_NAME });
