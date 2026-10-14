# ADR 0004 — MySQL for identity and orders, MongoDB for catalog and notifications

- Status: Accepted
- Date: 2026-10-11
- Plan: §6, DS-02, BZ-006

## Context
Orders and accounts are relational and money-critical: they need transactions across rows,
constraints and exact reporting. Products are documents with variants, bilingual text, images and
attributes that differ by category, read far more often than written; notifications are append-heavy.

## Decision
- **MySQL 8.4**: `bazaar_identity` (users, sessions, seller applications, outbox) and `bazaar_order`
  (orders, seller orders, items, payments, outbox). Money is stored as USD cents in integers.
- **MongoDB 8 (replica set)**: `bazaar_catalog` (shops, products with embedded variants, stock
  reservations, outbox) and `bazaar_notification` (event log, contacts, emails, in-app notifications).
- Both through Prisma 6.19 (ADR 0011); MongoDB validators and indexes in `backend/db/*/schema.js`.
- Stock is decremented with one conditional update (`stock >= qty`) — atomic without a lock (NFR-05,
  drill R3).

## Consequences
- Each store does what it is good at: text search, flexible attributes and embedded variants in
  MongoDB; joins and reports in MySQL.
- Two stores to operate and back up; on AWS they become Aurora MySQL and MongoDB Atlas (ADR 0010).
