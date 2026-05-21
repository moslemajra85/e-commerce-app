import { createPrismaClient } from '../src/db/prisma.js';

const prisma = createPrismaClient();
const CUSTOMER_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$Elju2B1RagJyGVZhDioFQg$Jq2AESiY7ZaznhYkGeGkxTMFrHlWtXf6W9RQXyxxf+Y';

async function main() {
  await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      id: 'user_customer_1',
      email: 'customer@example.com',
      passwordHash: CUSTOMER_PASSWORD_HASH,
      role: 'customer',
      status: 'active',
    },
  });

  await seedCatalog();
}

async function seedCatalog() {
  await resetCatalog();

  const categories = [
    { id: 'cat_apparel', name: 'Apparel', slug: 'apparel' },
    { id: 'cat_footwear', name: 'Footwear', slug: 'footwear' },
    { id: 'cat_bags', name: 'Bags', slug: 'bags' },
    { id: 'cat_accessories', name: 'Accessories', slug: 'accessories' },
    { id: 'cat_home', name: 'Home', slug: 'home' },
    { id: 'cat_drinkware', name: 'Drinkware', slug: 'drinkware' },
    { id: 'cat_office', name: 'Office', slug: 'office' },
  ];

  await prisma.category.createMany({ data: categories });

  for (const product of getSeedProducts()) {
    await seedProduct(product);
  }
}

async function resetCatalog() {
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
}

function getSeedProducts() {
  return [
    {
      id: 'prod_everyday_tee',
      categoryId: 'cat_apparel',
      name: 'Everyday Cotton Tee',
      slug: 'everyday-cotton-tee',
      description: 'A soft cotton T-shirt designed for daily wear and easy layering.',
      status: 'active',
      image: pexelsImage(
        'img_everyday_tee_1',
        '34156907',
        'Folded black and mint cotton T-shirts on a light background',
      ),
      variants: [
        variant('var_everyday_tee_black_s', 'TEE-BLK-S', 'Black / Small', 2500, 14),
        variant('var_everyday_tee_black_m', 'TEE-BLK-M', 'Black / Medium', 2500, 25),
        variant('var_everyday_tee_white_m', 'TEE-WHT-M', 'White / Medium', 2500, 18),
        variant('var_everyday_tee_mint_l', 'TEE-MNT-L', 'Mint / Large', 2700, 9),
      ],
    },
    {
      id: 'prod_denim_jacket',
      categoryId: 'cat_apparel',
      name: 'Washed Denim Jacket',
      slug: 'washed-denim-jacket',
      description: 'A mid-weight denim jacket with a relaxed fit and durable hardware.',
      status: 'active',
      image: pexelsImage(
        'img_denim_jacket_1',
        '298863',
        'Denim jacket and casual clothing on display',
      ),
      variants: [
        variant('var_denim_jacket_s', 'JKT-DNM-S', 'Small', 7900, 7),
        variant('var_denim_jacket_m', 'JKT-DNM-M', 'Medium', 7900, 11),
        variant('var_denim_jacket_l', 'JKT-DNM-L', 'Large', 7900, 4),
      ],
    },
    {
      id: 'prod_canvas_sneakers',
      categoryId: 'cat_footwear',
      name: 'Canvas Low-Top Sneakers',
      slug: 'canvas-low-top-sneakers',
      description: 'Comfortable canvas sneakers with a clean low-top profile.',
      status: 'active',
      image: pexelsImage(
        'img_canvas_sneakers_1',
        '2529148',
        'Pair of casual sneakers on a neutral surface',
      ),
      variants: [
        variant('var_canvas_sneakers_8', 'SNK-CAN-8', 'US 8', 5800, 8),
        variant('var_canvas_sneakers_9', 'SNK-CAN-9', 'US 9', 5800, 13),
        variant('var_canvas_sneakers_10', 'SNK-CAN-10', 'US 10', 5800, 6),
      ],
    },
    {
      id: 'prod_runner_sneakers',
      categoryId: 'cat_footwear',
      name: 'Everyday Runner Sneakers',
      slug: 'everyday-runner-sneakers',
      description: 'Lightweight sneakers made for commutes, errands, and weekend walks.',
      status: 'active',
      image: pexelsImage(
        'img_runner_sneakers_1',
        '1598505',
        'Athletic sneakers photographed from the side',
      ),
      variants: [
        variant('var_runner_sneakers_8', 'SNK-RUN-8', 'US 8', 7200, 5),
        variant('var_runner_sneakers_9', 'SNK-RUN-9', 'US 9', 7200, 10),
        variant('var_runner_sneakers_10', 'SNK-RUN-10', 'US 10', 7200, 0),
      ],
    },
    {
      id: 'prod_travel_backpack',
      categoryId: 'cat_bags',
      name: 'Compact Travel Backpack',
      slug: 'compact-travel-backpack',
      description: 'A compact backpack with padded storage for everyday travel.',
      status: 'active',
      image: pexelsImage(
        'img_travel_backpack_1',
        '18510444',
        'Olive green backpack on a wooden surface',
      ),
      variants: [
        variant('var_travel_backpack_charcoal', 'BAG-CHARCOAL', 'Charcoal', 6400, 12),
        variant('var_travel_backpack_olive', 'BAG-OLIVE', 'Olive', 6400, 6),
      ],
    },
    {
      id: 'prod_weekender_duffel',
      categoryId: 'cat_bags',
      name: 'Canvas Weekender Duffel',
      slug: 'canvas-weekender-duffel',
      description: 'A spacious duffel bag for overnight trips and gym sessions.',
      status: 'active',
      image: pexelsImage(
        'img_weekender_duffel_1',
        '1152077',
        'Brown travel bag placed on a wooden table',
      ),
      variants: [
        variant('var_weekender_duffel_tan', 'DUF-TAN', 'Tan', 8900, 5),
        variant('var_weekender_duffel_black', 'DUF-BLK', 'Black', 8900, 3),
      ],
    },
    {
      id: 'prod_minimal_watch',
      categoryId: 'cat_accessories',
      name: 'Minimal Leather Watch',
      slug: 'minimal-leather-watch',
      description: 'A clean analog watch with a leather strap and stainless case.',
      status: 'active',
      image: pexelsImage(
        'img_minimal_watch_1',
        '277390',
        'Analog wristwatch with a leather strap',
      ),
      variants: [
        variant('var_minimal_watch_brown', 'WCH-BRN', 'Brown Leather', 12900, 8),
        variant('var_minimal_watch_black', 'WCH-BLK', 'Black Leather', 12900, 4),
      ],
    },
    {
      id: 'prod_aviator_sunglasses',
      categoryId: 'cat_accessories',
      name: 'Aviator Sunglasses',
      slug: 'aviator-sunglasses',
      description: 'Lightweight metal-frame sunglasses with UV-protective lenses.',
      status: 'active',
      image: pexelsImage(
        'img_aviator_sunglasses_1',
        '46710',
        'Classic sunglasses on a bright surface',
      ),
      variants: [
        variant('var_aviator_sunglasses_gold', 'SUN-AVI-GLD', 'Gold Frame', 4600, 16),
        variant('var_aviator_sunglasses_black', 'SUN-AVI-BLK', 'Black Frame', 4600, 9),
      ],
    },
    {
      id: 'prod_wireless_headphones',
      categoryId: 'cat_accessories',
      name: 'Wireless Over-Ear Headphones',
      slug: 'wireless-over-ear-headphones',
      description: 'Comfortable wireless headphones for focused listening and travel.',
      status: 'active',
      image: pexelsImage(
        'img_wireless_headphones_1',
        '3394666',
        'Wireless headphones on a clean background',
      ),
      variants: [
        variant('var_wireless_headphones_black', 'AUD-OE-BLK', 'Black', 9900, 15),
        variant('var_wireless_headphones_silver', 'AUD-OE-SLV', 'Silver', 10900, 7),
      ],
    },
    {
      id: 'prod_ceramic_mug',
      categoryId: 'cat_drinkware',
      name: 'Ceramic Coffee Mug',
      slug: 'ceramic-coffee-mug',
      description: 'A sturdy ceramic mug for coffee, tea, and slow mornings.',
      status: 'active',
      image: pexelsImage(
        'img_ceramic_mug_1',
        '373945',
        'White ceramic coffee mug on a table',
      ),
      variants: [
        variant('var_ceramic_mug_white', 'MUG-CER-WHT', 'White', 1800, 30),
        variant('var_ceramic_mug_blue', 'MUG-CER-BLU', 'Blue', 1900, 22),
      ],
    },
    {
      id: 'prod_insulated_bottle',
      categoryId: 'cat_drinkware',
      name: 'Insulated Water Bottle',
      slug: 'insulated-water-bottle',
      description: 'A stainless steel bottle that keeps drinks hot or cold for hours.',
      status: 'active',
      image: pexelsImage(
        'img_insulated_bottle_1',
        '1188649',
        'Reusable water bottle beside outdoor gear',
      ),
      variants: [
        variant('var_insulated_bottle_500_black', 'BOT-500-BLK', '500 ml / Black', 3200, 20),
        variant('var_insulated_bottle_750_steel', 'BOT-750-STL', '750 ml / Steel', 3900, 14),
      ],
    },
    {
      id: 'prod_desk_lamp',
      categoryId: 'cat_home',
      name: 'Adjustable Desk Lamp',
      slug: 'adjustable-desk-lamp',
      description: 'A compact lamp with an adjustable arm for workspaces and reading corners.',
      status: 'active',
      image: pexelsImage(
        'img_desk_lamp_1',
        '1112598',
        'Desk lamp on a minimal workspace',
      ),
      variants: [
        variant('var_desk_lamp_black', 'LMP-DSK-BLK', 'Black', 5400, 11),
        variant('var_desk_lamp_white', 'LMP-DSK-WHT', 'White', 5400, 8),
      ],
    },
    {
      id: 'prod_linen_throw',
      categoryId: 'cat_home',
      name: 'Textured Linen Throw',
      slug: 'textured-linen-throw',
      description: 'A soft woven throw blanket for couches, beds, and cool evenings.',
      status: 'active',
      image: pexelsImage(
        'img_linen_throw_1',
        '6297088',
        'Folded neutral blanket on a sofa',
      ),
      variants: [
        variant('var_linen_throw_oat', 'THR-LIN-OAT', 'Oat', 6800, 6),
        variant('var_linen_throw_gray', 'THR-LIN-GRY', 'Gray', 6800, 0),
      ],
    },
    {
      id: 'prod_hardcover_notebook',
      categoryId: 'cat_office',
      name: 'Hardcover Notebook Set',
      slug: 'hardcover-notebook-set',
      description: 'A set of durable notebooks for planning, journaling, and meeting notes.',
      status: 'active',
      image: pexelsImage(
        'img_hardcover_notebook_1',
        '159751',
        'Notebook and pen on a desk',
      ),
      variants: [
        variant('var_hardcover_notebook_black', 'NTB-HRD-BLK', 'Black / 2 Pack', 2400, 18),
        variant('var_hardcover_notebook_kraft', 'NTB-HRD-KFT', 'Kraft / 2 Pack', 2400, 12),
      ],
    },
    {
      id: 'prod_wood_pen',
      categoryId: 'cat_office',
      name: 'Refillable Wooden Pen',
      slug: 'refillable-wooden-pen',
      description: 'A refillable pen with a natural wood barrel and smooth black ink.',
      status: 'active',
      image: pexelsImage(
        'img_wood_pen_1',
        '261763',
        'Pen resting on paper',
      ),
      variants: [
        variant('var_wood_pen_oak', 'PEN-WOD-OAK', 'Oak', 1600, 25),
        variant('var_wood_pen_walnut', 'PEN-WOD-WAL', 'Walnut', 1800, 13),
      ],
    },
    {
      id: 'prod_archive_sample',
      categoryId: 'cat_apparel',
      name: 'Archived Sample Product',
      slug: 'archived-sample-product',
      description: 'A hidden seed product used to confirm inactive catalog filtering.',
      status: 'draft',
      image: pexelsImage(
        'img_archive_sample_1',
        '934070',
        'Clothing samples on hangers',
      ),
      variants: [
        variant('var_archive_sample', 'ARCHIVE-SAMPLE', 'Sample', 1000, 4, false),
      ],
    },
  ];
}

function pexelsImage(id, photoId, altText) {
  return {
    id,
    url: `https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=1200`,
    altText,
  };
}

function variant(id, sku, name, priceCents, quantityAvailable, active = true) {
  return {
    id,
    sku,
    name,
    priceCents,
    currency: 'USD',
    active,
    quantityAvailable,
  };
}

async function seedProduct(product) {
  await prisma.product.upsert({
    where: { slug: product.slug },
    update: {
      categoryId: product.categoryId,
      name: product.name,
      description: product.description,
      status: product.status,
    },
    create: {
      id: product.id,
      categoryId: product.categoryId,
      name: product.name,
      slug: product.slug,
      description: product.description,
      status: product.status,
    },
  });

  await prisma.productImage.upsert({
    where: { id: product.image.id },
    update: {
      url: product.image.url,
      altText: product.image.altText,
      position: 0,
    },
    create: {
      id: product.image.id,
      productId: product.id,
      url: product.image.url,
      altText: product.image.altText,
      position: 0,
    },
  });

  for (const variant of product.variants) {
    const savedVariant = await prisma.productVariant.upsert({
      where: { sku: variant.sku },
      update: {
        productId: product.id,
        name: variant.name,
        priceCents: variant.priceCents,
        currency: variant.currency,
        active: variant.active,
      },
      create: {
        id: variant.id,
        productId: product.id,
        sku: variant.sku,
        name: variant.name,
        priceCents: variant.priceCents,
        currency: variant.currency,
        active: variant.active,
      },
    });

    await prisma.inventory.upsert({
      where: { variantId: savedVariant.id },
      update: {
        quantityAvailable: variant.quantityAvailable,
        quantityReserved: 0,
      },
      create: {
        variantId: savedVariant.id,
        quantityAvailable: variant.quantityAvailable,
        quantityReserved: 0,
      },
    });
  }
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
