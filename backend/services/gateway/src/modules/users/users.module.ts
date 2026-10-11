import { Module } from '@nestjs/common';

import { PrismaUsersRepository } from './repositories/prisma-users.repository.js';
import { UsersRepository } from './repositories/users.repository.js';

@Module({
  providers: [{ provide: UsersRepository, useClass: PrismaUsersRepository }],
  exports: [UsersRepository],
})
export class UsersModule {}
