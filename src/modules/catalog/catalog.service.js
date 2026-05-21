import { HttpError } from '../../shared/errors.js';
import { parseProductListQuery, parseProductSlug } from './catalog.validation.js';

const ACTIVE_PRODUCT_STATUS = 'active';

export async function listProducts(prisma, query) {
  const { page, pageSize } = parseProductListQuery(query);
  const where = { status: ACTIVE_PRODUCT_STATUS };
  const total = await prisma.product.count({ where });
  const products = await prisma.product.findMany({
    where,
    orderBy: { name: 'asc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: {
      category: true,
      images: {
        orderBy: { position: 'asc' },
        take: 1,
      },
      variants: {
        where: { active: true },
        orderBy: { priceCents: 'asc' },
        include: { inventory: true },
      },
    },
  });

  return {
    data: products.map(toProductListItem),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export async function getProductBySlug(prisma, slug) {
  const normalizedSlug = parseProductSlug(slug);
  const product = await prisma.product.findFirst({
    where: {
      slug: normalizedSlug,
      status: ACTIVE_PRODUCT_STATUS,
    },
    include: {
      category: true,
      images: {
        orderBy: { position: 'asc' },
      },
      variants: {
        where: { active: true },
        orderBy: { priceCents: 'asc' },
        include: { inventory: true },
      },
    },
  });

  if (!product) {
    throw new HttpError(404, 'Product not found');
  }

  return toProductDetail(product);
}

function toProductListItem(product) {
  const priceRange = getPriceRange(product.variants);
  const primaryVariant = product.variants.find(isVariantAvailable) ?? product.variants[0] ?? null;

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    category: toCategoryResponse(product.category),
    image: product.images[0] ? toImageResponse(product.images[0]) : null,
    priceRange,
    primaryVariant: primaryVariant ? toVariantSummaryResponse(primaryVariant) : null,
    available: product.variants.some(isVariantAvailable),
  };
}

function toProductDetail(product) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    category: toCategoryResponse(product.category),
    images: product.images.map(toImageResponse),
    variants: product.variants.map(toVariantResponse),
  };
}

function toCategoryResponse(category) {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
  };
}

function toImageResponse(image) {
  return {
    id: image.id,
    url: image.url,
    altText: image.altText,
  };
}

function toVariantResponse(variant) {
  return {
    id: variant.id,
    sku: variant.sku,
    name: variant.name,
    priceCents: variant.priceCents,
    currency: variant.currency,
    availableQuantity: variant.inventory?.quantityAvailable ?? 0,
    available: isVariantAvailable(variant),
  };
}

function toVariantSummaryResponse(variant) {
  return {
    id: variant.id,
    sku: variant.sku,
    name: variant.name,
    priceCents: variant.priceCents,
    currency: variant.currency,
    availableQuantity: variant.inventory?.quantityAvailable ?? 0,
    available: isVariantAvailable(variant),
  };
}

function getPriceRange(variants) {
  if (variants.length === 0) {
    return null;
  }

  const prices = variants.map((variant) => variant.priceCents);
  const currency = variants[0].currency;

  return {
    minPriceCents: Math.min(...prices),
    maxPriceCents: Math.max(...prices),
    currency,
  };
}

function isVariantAvailable(variant) {
  return (variant.inventory?.quantityAvailable ?? 0) > 0;
}
