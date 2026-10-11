import { SetMetadata } from '@nestjs/common';

import { IS_INTERNAL_KEY } from '../../constants/metadata.constant.js';

/**
 * Marks a service-to-service route (`/internal/*`): only callers holding the shared internal key —
 * the gateway — may use it. The gateway never proxies these paths to the outside.
 */
export const Internal = (): MethodDecorator & ClassDecorator => SetMetadata(IS_INTERNAL_KEY, true);
