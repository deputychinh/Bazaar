-- Variant labels become localized ({ "en": …, "vi": … }). Existing plain labels are kept in both
-- languages, so no history is lost.
ALTER TABLE `order_items` ADD COLUMN `variant_label_json` JSON NULL;
UPDATE `order_items` SET `variant_label_json` = JSON_OBJECT('en', `variant_label`, 'vi', `variant_label`);
ALTER TABLE `order_items` DROP COLUMN `variant_label`;
ALTER TABLE `order_items` RENAME COLUMN `variant_label_json` TO `variant_label`;
ALTER TABLE `order_items` MODIFY `variant_label` JSON NOT NULL;
