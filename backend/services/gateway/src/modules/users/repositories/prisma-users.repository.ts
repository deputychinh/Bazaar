import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import type { Transaction } from '../../../interfaces/transaction.interface.js';
import type { NewUser, User } from '../../../interfaces/user.interface.js';
import { UserMapper } from '../mappers/user.mapper.js';

import { type UserChangesOptions, UsersRepository } from './users.repository.js';

@Injectable()
export class PrismaUsersRepository extends UsersRepository {
  public constructor(private readonly prisma: PrismaService) {
    super();
  }

  public async findById(id: string, transaction?: Transaction): Promise<User | null> {
    const row = await (transaction ?? this.prisma).user.findUnique({ where: { id } });
    return row === null ? null : UserMapper.toDomain(row);
  }

  public async findByEmail(email: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { email } });
    return row === null ? null : UserMapper.toDomain(row);
  }

  public async create(user: NewUser, transaction: Transaction): Promise<User> {
    return UserMapper.toDomain(await transaction.user.create({ data: user }));
  }

  public async update(
    id: string,
    changes: UserChangesOptions,
    transaction: Transaction,
  ): Promise<User> {
    return UserMapper.toDomain(await transaction.user.update({ where: { id }, data: changes }));
  }
}
