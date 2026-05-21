import { HttpError } from '../../shared/errors.js';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export function parseProductListQuery(query) {
  return {
    page: parsePositiveInteger(query.page, DEFAULT_PAGE, 'page'),
    pageSize: parsePageSize(query.pageSize),
  };
}

export function parseProductSlug(slug) {
  if (typeof slug !== 'string' || slug.trim().length === 0) {
    throw new HttpError(400, 'Product slug is required');
  }

  return slug.trim().toLowerCase();
}

function parsePageSize(value) {
  const pageSize = parsePositiveInteger(value, DEFAULT_PAGE_SIZE, 'pageSize');

  if (pageSize > MAX_PAGE_SIZE) {
    throw new HttpError(400, `pageSize must be ${MAX_PAGE_SIZE} or less`);
  }

  return pageSize;
}

function parsePositiveInteger(value, defaultValue, fieldName) {
  if (value === undefined) {
    return defaultValue;
  }

  const parsedValue = Number(value);
  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    throw new HttpError(400, `${fieldName} must be a positive integer`);
  }

  return parsedValue;
}
