import { SetMetadata } from '@nestjs/common';

import { IS_PUBLIC_KEY } from '../../constants/metadata.constant.js';

/** Opens a route to callers without an access token. */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);
