-- Seed for bazaar_order: past orders of shopper.linh@bazaar.test in every final or settled state.
-- Idempotent (INSERT … ON DUPLICATE KEY UPDATE). Products, shops and sellers come from the
-- catalog and identity seeds. Money is USD cents. No PENDING/RESERVED orders on purpose: the
-- reservation-timeout sweep would cancel them at once. Seeded orders send no events.

SET @shopper = '0199a000-0000-7000-8000-000000000021';
SET @minh = '0199a000-0000-7000-8000-000000000011';
SET @anna = '0199a000-0000-7000-8000-000000000012';
SET @lan = '0199a000-0000-7000-8000-000000000013';
SET @img = 'http://127.0.0.1:9002/bazaar-images/placeholders/';

INSERT INTO orders (id, shopper_id, status, total_usd_cents, cancel_reason, idempotency_key, created_at, updated_at) VALUES
  ('01990000-0000-7000-9000-000000000001', @shopper, 'COMPLETED', 31900, NULL,                  'seed-order-0001', '2026-09-02 09:15:00.000', '2026-09-06 16:00:00.000'),
  ('01990000-0000-7000-9000-000000000002', @shopper, 'CONFIRMED', 15500, NULL,                  'seed-order-0002', '2026-10-08 20:40:00.000', '2026-10-09 10:00:00.000'),
  ('01990000-0000-7000-9000-000000000003', @shopper, 'CANCELLED', 23800, 'PAYMENT_FAILED',      'seed-order-0003', '2026-09-20 11:05:00.000', '2026-09-20 11:05:04.000'),
  ('01990000-0000-7000-9000-000000000004', @shopper, 'CANCELLED', 11450, 'OUT_OF_STOCK',        'seed-order-0004', '2026-09-25 18:30:00.000', '2026-09-25 18:30:02.000'),
  ('01990000-0000-7000-9000-000000000005', @shopper, 'CANCELLED',  4050, 'RESERVATION_TIMEOUT', 'seed-order-0005', '2026-09-28 07:00:00.000', '2026-09-28 07:15:30.000')
ON DUPLICATE KEY UPDATE status = VALUES(status), total_usd_cents = VALUES(total_usd_cents),
  cancel_reason = VALUES(cancel_reason), updated_at = VALUES(updated_at);

INSERT INTO seller_orders (id, order_id, seller_id, shop_id, shop_name, status, subtotal_usd_cents, cancel_reason, shipped_at, delivered_at, cancelled_at, created_at, updated_at) VALUES
  -- 0001 COMPLETED: one part delivered, one cancelled by the shopper before shipping.
  ('01990000-0000-7000-9100-000000000011', '01990000-0000-7000-9000-000000000001', @minh, '5b0000000000000000000001', 'Gốm Minh Long', 'DELIVERED', 8100,  NULL, '2026-09-03 10:00:00.000', '2026-09-06 16:00:00.000', NULL, '2026-09-02 09:15:00.000', '2026-09-06 16:00:00.000'),
  ('01990000-0000-7000-9100-000000000012', '01990000-0000-7000-9000-000000000001', @anna, '5b0000000000000000000002', "Anna's Studio", 'CANCELLED', 23800, 'SHOPPER_CANCELLED', NULL, NULL, '2026-09-02 12:00:00.000', '2026-09-02 09:15:00.000', '2026-09-02 12:00:00.000'),
  -- 0002 CONFIRMED: shipped by one seller, waiting for the other.
  ('01990000-0000-7000-9100-000000000021', '01990000-0000-7000-9000-000000000002', @lan,  '5b0000000000000000000003', 'Lụa Lan',       'SHIPPED',   11450, NULL, '2026-10-09 10:00:00.000', NULL, NULL, '2026-10-08 20:40:00.000', '2026-10-09 10:00:00.000'),
  ('01990000-0000-7000-9100-000000000022', '01990000-0000-7000-9000-000000000002', @minh, '5b0000000000000000000001', 'Gốm Minh Long', 'CONFIRMED', 4050,  NULL, NULL, NULL, NULL, '2026-10-08 20:40:00.000', '2026-10-08 20:40:05.000'),
  -- 0003–0005 cancelled by the saga before any seller saw them.
  ('01990000-0000-7000-9100-000000000031', '01990000-0000-7000-9000-000000000003', @anna, '5b0000000000000000000002', "Anna's Studio", 'CANCELLED', 23800, 'PAYMENT_FAILED',      NULL, NULL, '2026-09-20 11:05:04.000', '2026-09-20 11:05:00.000', '2026-09-20 11:05:04.000'),
  ('01990000-0000-7000-9100-000000000041', '01990000-0000-7000-9000-000000000004', @lan,  '5b0000000000000000000003', 'Lụa Lan',       'CANCELLED', 11450, 'OUT_OF_STOCK',        NULL, NULL, '2026-09-25 18:30:02.000', '2026-09-25 18:30:00.000', '2026-09-25 18:30:02.000'),
  ('01990000-0000-7000-9100-000000000051', '01990000-0000-7000-9000-000000000005', @minh, '5b0000000000000000000001', 'Gốm Minh Long', 'CANCELLED', 4050,  'RESERVATION_TIMEOUT', NULL, NULL, '2026-09-28 07:15:30.000', '2026-09-28 07:00:00.000', '2026-09-28 07:15:30.000')
ON DUPLICATE KEY UPDATE status = VALUES(status), cancel_reason = VALUES(cancel_reason),
  shipped_at = VALUES(shipped_at), delivered_at = VALUES(delivered_at),
  cancelled_at = VALUES(cancelled_at), updated_at = VALUES(updated_at);

INSERT INTO order_items (id, seller_order_id, product_id, product_slug, variant_sku, title_snapshot, variant_label, image_url, quantity, unit_price_usd_cents) VALUES
  ('01990000-0000-7000-9200-000000000111', '01990000-0000-7000-9100-000000000011', 'b00000000000000000000001', 'everyday-knife-set-1', 'BZ-0001-1',
   JSON_OBJECT('en', 'Everyday knife set', 'vi', 'Bộ dao dùng hằng ngày'), JSON_OBJECT('en', 'Indigo', 'vi', 'Chàm'), CONCAT(@img, 'home-kitchen.svg'), 2, 4050),
  ('01990000-0000-7000-9200-000000000121', '01990000-0000-7000-9100-000000000012', 'b00000000000000000000002', 'rustic-dinner-plate-2', 'BZ-0002-1',
   JSON_OBJECT('en', 'Rustic dinner plate', 'vi', 'Đĩa ăn mộc mạc'), JSON_OBJECT('en', 'Ivory', 'vi', 'Ngà'), CONCAT(@img, 'home-kitchen.svg'), 1, 23800),
  ('01990000-0000-7000-9200-000000000211', '01990000-0000-7000-9100-000000000021', 'b00000000000000000000003', 'hand-made-cotton-dress-3', 'BZ-0003-1',
   JSON_OBJECT('en', 'Hand-made cotton dress', 'vi', 'Váy cotton thủ công'), JSON_OBJECT('en', 'Jade', 'vi', 'Ngọc bích'), CONCAT(@img, 'fashion.svg'), 1, 11450),
  ('01990000-0000-7000-9200-000000000221', '01990000-0000-7000-9100-000000000022', 'b00000000000000000000001', 'everyday-knife-set-1', 'BZ-0001-1',
   JSON_OBJECT('en', 'Everyday knife set', 'vi', 'Bộ dao dùng hằng ngày'), JSON_OBJECT('en', 'Indigo', 'vi', 'Chàm'), CONCAT(@img, 'home-kitchen.svg'), 1, 4050),
  ('01990000-0000-7000-9200-000000000311', '01990000-0000-7000-9100-000000000031', 'b00000000000000000000002', 'rustic-dinner-plate-2', 'BZ-0002-1',
   JSON_OBJECT('en', 'Rustic dinner plate', 'vi', 'Đĩa ăn mộc mạc'), JSON_OBJECT('en', 'Ivory', 'vi', 'Ngà'), CONCAT(@img, 'home-kitchen.svg'), 1, 23800),
  ('01990000-0000-7000-9200-000000000411', '01990000-0000-7000-9100-000000000041', 'b00000000000000000000003', 'hand-made-cotton-dress-3', 'BZ-0003-1',
   JSON_OBJECT('en', 'Hand-made cotton dress', 'vi', 'Váy cotton thủ công'), JSON_OBJECT('en', 'Jade', 'vi', 'Ngọc bích'), CONCAT(@img, 'fashion.svg'), 1, 11450),
  ('01990000-0000-7000-9200-000000000511', '01990000-0000-7000-9100-000000000051', 'b00000000000000000000001', 'everyday-knife-set-1', 'BZ-0001-1',
   JSON_OBJECT('en', 'Everyday knife set', 'vi', 'Bộ dao dùng hằng ngày'), JSON_OBJECT('en', 'Indigo', 'vi', 'Chàm'), CONCAT(@img, 'home-kitchen.svg'), 1, 4050)
ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), unit_price_usd_cents = VALUES(unit_price_usd_cents);

INSERT INTO payments (id, order_id, status, provider_token, provider_ref, card_last4, amount_usd_cents, failure_reason, created_at, updated_at) VALUES
  ('01990000-0000-7000-9300-000000000001', '01990000-0000-7000-9000-000000000001', 'REFUND_PENDING', 'tok_fake_succeed_seed0001', 'ch_fake_seed0001', '4242', 31900, NULL,             '2026-09-02 09:15:00.000', '2026-09-02 12:00:00.000'),
  ('01990000-0000-7000-9300-000000000002', '01990000-0000-7000-9000-000000000002', 'SUCCEEDED',      'tok_fake_succeed_seed0002', 'ch_fake_seed0002', '4242', 15500, NULL,             '2026-10-08 20:40:00.000', '2026-10-08 20:40:05.000'),
  ('01990000-0000-7000-9300-000000000003', '01990000-0000-7000-9000-000000000003', 'FAILED',         'tok_fake_decline_seed0003', NULL,               '0002', 23800, 'card_declined',  '2026-09-20 11:05:00.000', '2026-09-20 11:05:04.000'),
  ('01990000-0000-7000-9300-000000000004', '01990000-0000-7000-9000-000000000004', 'FAILED',         'tok_fake_succeed_seed0004', NULL,               '4242', 11450, 'not_charged',    '2026-09-25 18:30:00.000', '2026-09-25 18:30:02.000'),
  ('01990000-0000-7000-9300-000000000005', '01990000-0000-7000-9000-000000000005', 'FAILED',         'tok_fake_succeed_seed0005', NULL,               '4242', 4050,  'reservation_timeout', '2026-09-28 07:00:00.000', '2026-09-28 07:15:30.000')
ON DUPLICATE KEY UPDATE status = VALUES(status), failure_reason = VALUES(failure_reason), updated_at = VALUES(updated_at);
