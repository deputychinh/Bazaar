import type { Contact } from '../../../interfaces/contact.interface.js';
import type { Transaction } from '../../../interfaces/transaction.interface.js';

export abstract class ContactsRepository {
  public abstract save(contact: Contact, transaction: Transaction): Promise<void>;

  public abstract find(userId: string, transaction?: Transaction): Promise<Contact | null>;
}
