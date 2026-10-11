import { z } from 'zod';

import { Locale } from '../enums/locale.enum.js';
import { UserRole } from '../enums/user-role.enum.js';

import { localeSchema, userRoleSchema } from './enum.schema.js';

describe('named enum schemas', () => {
  it('emit one shared definition named after the enum', () => {
    const jsonSchema = z.toJSONSchema(
      z.object({ role: userRoleSchema, locale: localeSchema.default(Locale.En) }),
      { target: 'openapi-3.0', io: 'input' },
    );

    expect(jsonSchema).toMatchObject({
      properties: { role: { $ref: '#/definitions/UserRole' } },
      definitions: {
        UserRole: { type: 'string', enum: Object.values(UserRole) },
        Locale: { type: 'string', enum: Object.values(Locale) },
      },
    });
  });

  it('still validates like a plain enum', () => {
    expect(userRoleSchema.parse(UserRole.Seller)).toBe(UserRole.Seller);
    expect(userRoleSchema.safeParse('wizard').success).toBe(false);
  });
});
