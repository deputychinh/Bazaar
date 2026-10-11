// Seed for bazaar_notification: contacts of the users seeded in db/identity/data.sql (they never
// produced a UserRegistered event). Idempotent upserts.

const contacts = [
  ['0199a000-0000-7000-8000-000000000001', 'admin@bazaar.test', 'en'],
  ['0199a000-0000-7000-8000-000000000011', 'seller.minh@bazaar.test', 'vi'],
  ['0199a000-0000-7000-8000-000000000012', 'seller.anna@bazaar.test', 'en'],
  ['0199a000-0000-7000-8000-000000000013', 'seller.lan@bazaar.test', 'vi'],
  ['0199a000-0000-7000-8000-000000000021', 'shopper.linh@bazaar.test', 'vi'],
  ['0199a000-0000-7000-8000-000000000022', 'shopper.tom@bazaar.test', 'en'],
  ['0199a000-0000-7000-8000-000000000023', 'shopper.new@bazaar.test', 'en'],
];
const seededAt = new Date('2026-10-01T00:00:00.000Z');

db.contacts.bulkWrite(
  contacts.map(([id, email, preferredLocale]) => ({
    replaceOne: {
      filter: { _id: id },
      replacement: { _id: id, email, preferredLocale, updatedAt: seededAt },
      upsert: true,
    },
  })),
);

print(`bazaar_notification seeded: ${contacts.length} contacts`);
