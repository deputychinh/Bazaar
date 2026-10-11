-- CreateTable
CREATE TABLE `orders` (
    `id` CHAR(36) NOT NULL,
    `shopper_id` CHAR(36) NOT NULL,
    `status` VARCHAR(16) NOT NULL,
    `total_usd_cents` INTEGER NOT NULL,
    `cancel_reason` VARCHAR(32) NULL,
    `idempotency_key` VARCHAR(64) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `orders_shopper_id_created_at_idx`(`shopper_id`, `created_at`),
    INDEX `orders_status_created_at_idx`(`status`, `created_at`),
    UNIQUE INDEX `orders_shopper_id_idempotency_key_key`(`shopper_id`, `idempotency_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `seller_orders` (
    `id` CHAR(36) NOT NULL,
    `order_id` CHAR(36) NOT NULL,
    `seller_id` CHAR(36) NOT NULL,
    `shop_id` VARCHAR(36) NOT NULL,
    `shop_name` VARCHAR(80) NOT NULL,
    `status` VARCHAR(16) NOT NULL,
    `subtotal_usd_cents` INTEGER NOT NULL,
    `cancel_reason` VARCHAR(32) NULL,
    `shipped_at` DATETIME(3) NULL,
    `delivered_at` DATETIME(3) NULL,
    `cancelled_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `seller_orders_order_id_idx`(`order_id`),
    INDEX `seller_orders_seller_id_status_id_idx`(`seller_id`, `status`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_items` (
    `id` CHAR(36) NOT NULL,
    `seller_order_id` CHAR(36) NOT NULL,
    `product_id` VARCHAR(36) NOT NULL,
    `product_slug` VARCHAR(160) NOT NULL,
    `variant_sku` VARCHAR(64) NOT NULL,
    `title_snapshot` JSON NOT NULL,
    `variant_label` VARCHAR(120) NOT NULL,
    `image_url` VARCHAR(512) NULL,
    `quantity` INTEGER NOT NULL,
    `unit_price_usd_cents` INTEGER NOT NULL,

    INDEX `order_items_seller_order_id_idx`(`seller_order_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` CHAR(36) NOT NULL,
    `order_id` CHAR(36) NOT NULL,
    `status` VARCHAR(16) NOT NULL,
    `provider_token` VARCHAR(64) NOT NULL,
    `provider_ref` VARCHAR(64) NULL,
    `card_last4` CHAR(4) NOT NULL,
    `amount_usd_cents` INTEGER NOT NULL,
    `failure_reason` VARCHAR(64) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payments_order_id_key`(`order_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `outbox` (
    `id` CHAR(36) NOT NULL,
    `topic` VARCHAR(128) NOT NULL,
    `msg_key` VARCHAR(128) NOT NULL,
    `value` TEXT NOT NULL,
    `headers` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sent_at` DATETIME(3) NULL,

    INDEX `outbox_sent_at_id_idx`(`sent_at`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `processed_events` (
    `event_id` CHAR(36) NOT NULL,
    `processed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`event_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `seller_orders` ADD CONSTRAINT `seller_orders_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_seller_order_id_fkey` FOREIGN KEY (`seller_order_id`) REFERENCES `seller_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

