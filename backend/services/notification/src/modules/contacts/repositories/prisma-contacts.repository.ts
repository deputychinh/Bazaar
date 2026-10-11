import { Locale } from '@bazaar/contracts';
import { EnumUtil } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import type { Contact } from '../../../interfaces/contact.interface.js';
import type { Transaction } from '../../../interfaces/transaction.interface.js';

import { ContactsRepository } from './contacts.repository.js';

@Injectable()
export class PrismaContactsRepository extends ContactsRepository {
  public constructor(private readonly prisma: PrismaService) {
    super();
  }

  public async save(contact: Contact, transaction: Transaction): Promise<void> {
    const data = { email: contact.email, preferredLocale: contact.preferredLocale };
    await transaction.contact.upsert({
      where: { id: contact.userId },
      create: { id: contact.userId, ...data },
      update: data,
    });
  }

  public async find(userId: string, transaction?: Transaction): Promise<Contact | null> {
    const row = await (transaction ?? this.prisma).contact.findUnique({ where: { id: userId } });
    return row === null
      ? null
      : {
          userId: row.id,
          email: row.email,
          preferredLocale: EnumUtil.parse(Locale, row.preferredLocale),
        };
  }
}
