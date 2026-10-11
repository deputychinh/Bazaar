// Initiates the single-node replica set on first run (Prisma and transactions need one),
// then reports healthy once this node is primary.
try {
  rs.status();
} catch (error) {
  rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: 'mongo:27017' }] });
}
if (!db.hello().isWritablePrimary) {
  quit(1);
}
