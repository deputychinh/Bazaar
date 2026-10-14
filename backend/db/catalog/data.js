// Seed data for bazaar_catalog. Deterministic (fixed ids, seeded random) and idempotent.
// Shops belong to the sellers seeded in db/identity/data.sql.

const SEEDED_AT = new Date('2026-10-01T08:00:00.000Z');
const PRODUCT_COUNT = 1000;
const oid = (prefix, n) => ObjectId(prefix + n.toString(16).padStart(24 - prefix.length, '0'));
const int = (value) => NumberInt(Math.round(value));

// Small deterministic random generator (LCG) so every run produces the same catalog.
let seed = 20261011;
const random = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};
const pick = (items) => items[Math.floor(random() * items.length)];
const slugify = (text) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// --- categories -----------------------------------------------------------------------
const categoryTree = [
  {
    slug: 'home-kitchen',
    en: 'Home & Kitchen',
    vi: 'Nhà cửa & Bếp',
    children: [
      { slug: 'cookware', en: 'Cookware', vi: 'Dụng cụ nấu ăn' },
      { slug: 'tableware', en: 'Tableware', vi: 'Bát đĩa' },
    ],
  },
  {
    slug: 'fashion',
    en: 'Fashion',
    vi: 'Thời trang',
    children: [
      { slug: 'clothing', en: 'Clothing', vi: 'Quần áo' },
      { slug: 'accessories', en: 'Accessories', vi: 'Phụ kiện' },
    ],
  },
  {
    slug: 'crafts',
    en: 'Arts & Crafts',
    vi: 'Thủ công mỹ nghệ',
    children: [
      { slug: 'ceramics', en: 'Ceramics', vi: 'Gốm sứ' },
      { slug: 'silk', en: 'Silk', vi: 'Lụa' },
    ],
  },
  {
    slug: 'electronics',
    en: 'Electronics',
    vi: 'Điện tử',
    children: [{ slug: 'audio', en: 'Audio', vi: 'Âm thanh' }],
  },
  { slug: 'beauty', en: 'Beauty', vi: 'Làm đẹp', children: [] },
  { slug: 'books', en: 'Books', vi: 'Sách', children: [] },
];

const categories = [];
let categoryNumber = 0;
categoryTree.forEach((top, topIndex) => {
  const topId = oid('ca', (categoryNumber += 1));
  categories.push({
    _id: topId,
    slug: top.slug,
    name: { en: top.en, vi: top.vi },
    parentId: null,
    path: `/${top.slug}`,
    sortOrder: int(topIndex),
    createdAt: SEEDED_AT,
    top: top.slug,
    isLeaf: top.children.length === 0,
  });
  top.children.forEach((child, childIndex) => {
    categories.push({
      _id: oid('ca', (categoryNumber += 1)),
      slug: child.slug,
      name: { en: child.en, vi: child.vi },
      parentId: topId,
      path: `/${top.slug}/${child.slug}`,
      sortOrder: int(childIndex),
      createdAt: SEEDED_AT,
      top: top.slug,
      isLeaf: true,
    });
  });
});
db.categories.bulkWrite(
  categories.map(({ top, isLeaf, ...category }) => ({
    replaceOne: { filter: { _id: category._id }, replacement: category, upsert: true },
  })),
);

// --- shops ----------------------------------------------------------------------------
const shops = [
  {
    _id: oid('5b', 1),
    sellerId: '0199a000-0000-7000-8000-000000000011',
    slug: 'gom-minh-long',
    name: 'Gốm Minh Long',
    description: {
      en: 'Hand-made ceramics from Bát Tràng.',
      vi: 'Gốm thủ công từ làng Bát Tràng.',
    },
  },
  {
    _id: oid('5b', 2),
    sellerId: '0199a000-0000-7000-8000-000000000012',
    slug: 'annas-studio',
    name: "Anna's Studio",
    description: {
      en: 'Everyday design for home and wardrobe.',
      vi: 'Thiết kế cho nhà cửa và tủ đồ hằng ngày.',
    },
  },
  {
    _id: oid('5b', 3),
    sellerId: '0199a000-0000-7000-8000-000000000013',
    slug: 'lua-lan',
    name: 'Lụa Lan',
    description: { en: 'Silk woven in Hà Đông.', vi: 'Lụa dệt tại Hà Đông.' },
  },
].map((shop) => ({ ...shop, status: 'ACTIVE', createdAt: SEEDED_AT, updatedAt: SEEDED_AT }));
db.shops.bulkWrite(
  shops.map((shop) => ({
    replaceOne: { filter: { _id: shop._id }, replacement: shop, upsert: true },
  })),
);

// --- products -------------------------------------------------------------------------
const nouns = {
  cookware: [
    ['Frying pan', 'Chảo chống dính'],
    ['Clay pot', 'Nồi đất'],
    ['Knife set', 'Bộ dao'],
  ],
  tableware: [
    ['Rice bowl', 'Bát ăn cơm'],
    ['Dinner plate', 'Đĩa ăn'],
    ['Chopstick set', 'Bộ đũa'],
  ],
  clothing: [
    ['Linen shirt', 'Áo sơ mi linen'],
    ['Áo dài', 'Áo dài'],
    ['Cotton dress', 'Váy cotton'],
  ],
  accessories: [
    ['Conical hat', 'Nón lá'],
    ['Leather wallet', 'Ví da'],
    ['Silk scarf', 'Khăn lụa'],
  ],
  ceramics: [
    ['Ceramic vase', 'Bình hoa gốm'],
    ['Ceramic tea set', 'Bộ ấm chén gốm'],
    ['Incense holder', 'Lư hương gốm'],
  ],
  silk: [
    ['Silk pillowcase', 'Vỏ gối lụa'],
    ['Silk fabric', 'Vải lụa'],
    ['Silk robe', 'Áo choàng lụa'],
  ],
  audio: [
    ['Wireless earbuds', 'Tai nghe không dây'],
    ['Bluetooth speaker', 'Loa bluetooth'],
    ['Headphones', 'Tai nghe chụp tai'],
  ],
  beauty: [
    ['Rice water toner', 'Nước hoa hồng gạo'],
    ['Coconut oil', 'Dầu dừa'],
    ['Herbal soap', 'Xà phòng thảo mộc'],
  ],
  books: [
    ['Cookbook', 'Sách nấu ăn'],
    ['Travel guide', 'Cẩm nang du lịch'],
    ['Poetry collection', 'Tập thơ'],
  ],
};
const adjectives = [
  ['Hand-made', 'thủ công'],
  ['Classic', 'cổ điển'],
  ['Modern', 'hiện đại'],
  ['Rustic', 'mộc mạc'],
  ['Premium', 'cao cấp'],
  ['Everyday', 'dùng hằng ngày'],
  ['Limited edition', 'bản giới hạn'],
];
const colours = [
  ['Indigo', 'Chàm'],
  ['Ivory', 'Ngà'],
  ['Jade', 'Ngọc bích'],
  ['Terracotta', 'Đất nung'],
  ['Charcoal', 'Than chì'],
];
const leaves = categories.filter((category) => category.isLeaf);

const products = [];
for (let index = 0; index < PRODUCT_COUNT; index += 1) {
  const number = index + 1;
  const category = leaves[index % leaves.length];
  const shop = shops[index % shops.length];
  const [nounEn, nounVi] = pick(nouns[category.slug]);
  const [adjectiveEn, adjectiveVi] = pick(adjectives);
  const titleEn = `${adjectiveEn} ${nounEn.toLowerCase()}`.replace(/^\w/, (letter) =>
    letter.toUpperCase(),
  );
  const titleVi = `${nounVi} ${adjectiveVi}`;
  const variantCount = 1 + Math.floor(random() * 3);
  const basePrice = 300 + Math.floor(random() * 500) * 50;
  const variants = Array.from({ length: variantCount }, (_, variantIndex) => {
    const [colourEn, colourVi] = colours[(index + variantIndex) % colours.length];
    return {
      sku: `BZ-${String(number).padStart(4, '0')}-${variantIndex + 1}`,
      priceUsdCents: int(basePrice + variantIndex * 250),
      stock: int(random() < 0.08 ? 0 : Math.floor(random() * 120)),
      attributes: { colour: { en: colourEn, vi: colourVi } },
    };
  });
  const status = random() < 0.95 ? 'PUBLISHED' : random() < 0.6 ? 'DRAFT' : 'HIDDEN';
  const createdAt = new Date(SEEDED_AT.getTime() - Math.floor(random() * 270) * 86400000);
  products.push({
    _id: oid('b0', number),
    shopId: shop._id,
    sellerId: shop.sellerId,
    slug: `${slugify(titleEn)}-${number}`,
    title: { en: titleEn, vi: titleVi },
    description: {
      en: `${titleEn} from ${shop.name}. Carefully made and checked before shipping.`,
      vi: `${titleVi} từ ${shop.name}. Được làm cẩn thận và kiểm tra trước khi giao hàng.`,
    },
    categoryId: category._id,
    attributes: { origin: { en: 'Vietnam', vi: 'Việt Nam' } },
    variants,
    // One illustration per variant colour (scripts/generate-product-art.mjs); the first is the cover.
    images: variants.map((variant) => ({
      key: `placeholders/art-${slugify(nounEn)}-${slugify(variant.attributes.colour.en)}.svg`,
      alt: {
        en: `${titleEn} — ${variant.attributes.colour.en}`,
        vi: `${titleVi} — ${variant.attributes.colour.vi}`,
      },
    })),
    status,
    minPriceUsdCents: int(Math.min(...variants.map((variant) => variant.priceUsdCents))),
    totalStock: int(variants.reduce((total, variant) => total + variant.stock, 0)),
    rating: {
      average: Math.round((3 + random() * 2) * 10) / 10,
      count: int(Math.floor(random() * 500)),
    },
    hiddenReason: status === 'HIDDEN' ? 'Seed: hidden by moderation' : null,
    publishedAt: status === 'PUBLISHED' ? createdAt : null,
    createdAt,
    updatedAt: createdAt,
  });
}
for (let start = 0; start < products.length; start += 500) {
  db.products.bulkWrite(
    products.slice(start, start + 500).map((product) => ({
      replaceOne: { filter: { _id: product._id }, replacement: product, upsert: true },
    })),
  );
}

print(
  `bazaar_catalog seeded: ${categories.length} categories, ${shops.length} shops, ${products.length} products`,
);
