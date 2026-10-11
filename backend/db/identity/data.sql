-- Seed data for bazaar_identity. Idempotent: safe to run again (`make seed`).
-- Every demo account uses the password  Bazaar@2026!  (argon2id hash below).
-- Ids are fixed UUID v7 values so other seeds (catalog shops, orders) can refer to them.

SET @password_hash = '$argon2id$v=19$m=19456,t=2,p=1$TZVhkW9wiNQkPJw7+Oy5Xg$nTVchdfZFLbUui/2fxTnn+LbhYN4SKYopWHag/Jup3Q';
SET @seeded_at = '2026-10-01 08:00:00.000';

INSERT INTO users (id, email, password_hash, role, status, preferred_locale, email_verified_at, created_at, updated_at) VALUES
  ('0199a000-0000-7000-8000-000000000001', 'admin@bazaar.test',        @password_hash, 'ADMIN',   'ACTIVE',               'en', @seeded_at, @seeded_at, @seeded_at),
  ('0199a000-0000-7000-8000-000000000011', 'seller.minh@bazaar.test',  @password_hash, 'SELLER',  'ACTIVE',               'vi', @seeded_at, @seeded_at, @seeded_at),
  ('0199a000-0000-7000-8000-000000000012', 'seller.anna@bazaar.test',  @password_hash, 'SELLER',  'ACTIVE',               'en', @seeded_at, @seeded_at, @seeded_at),
  ('0199a000-0000-7000-8000-000000000013', 'seller.lan@bazaar.test',   @password_hash, 'SELLER',  'ACTIVE',               'vi', @seeded_at, @seeded_at, @seeded_at),
  ('0199a000-0000-7000-8000-000000000021', 'shopper.linh@bazaar.test', @password_hash, 'SHOPPER', 'ACTIVE',               'vi', @seeded_at, @seeded_at, @seeded_at),
  ('0199a000-0000-7000-8000-000000000022', 'shopper.tom@bazaar.test',  @password_hash, 'SHOPPER', 'ACTIVE',               'en', @seeded_at, @seeded_at, @seeded_at),
  ('0199a000-0000-7000-8000-000000000023', 'shopper.new@bazaar.test',  @password_hash, 'SHOPPER', 'PENDING_VERIFICATION', 'en', NULL,       @seeded_at, @seeded_at)
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash), role = VALUES(role), status = VALUES(status),
  preferred_locale = VALUES(preferred_locale), email_verified_at = VALUES(email_verified_at);

INSERT INTO seller_applications (id, user_id, shop_name, status, reviewed_by, reviewed_at, created_at, updated_at) VALUES
  ('0199a000-0000-7000-8000-000000000111', '0199a000-0000-7000-8000-000000000011', 'Gốm Minh Long',  'APPROVED', '0199a000-0000-7000-8000-000000000001', @seeded_at, @seeded_at, @seeded_at),
  ('0199a000-0000-7000-8000-000000000112', '0199a000-0000-7000-8000-000000000012', 'Anna''s Studio', 'APPROVED', '0199a000-0000-7000-8000-000000000001', @seeded_at, @seeded_at, @seeded_at),
  ('0199a000-0000-7000-8000-000000000113', '0199a000-0000-7000-8000-000000000013', 'Lụa Lan',        'APPROVED', '0199a000-0000-7000-8000-000000000001', @seeded_at, @seeded_at, @seeded_at),
  ('0199a000-0000-7000-8000-000000000122', '0199a000-0000-7000-8000-000000000022', 'Tom''s Tools',   'PENDING',  NULL,                                   NULL,       @seeded_at, @seeded_at)
ON DUPLICATE KEY UPDATE
  shop_name = VALUES(shop_name), status = VALUES(status),
  reviewed_by = VALUES(reviewed_by), reviewed_at = VALUES(reviewed_at);
