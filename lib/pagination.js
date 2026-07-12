'use strict';

function clampInteger(value, min, max, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function parsePagination(searchParams, { defaultLimit = 50, maxLimit = 200 } = {}) {
  const page = clampInteger(searchParams?.get?.('page'), 1, 100000, 1);
  const limit = clampInteger(searchParams?.get?.('limit'), 1, maxLimit, defaultLimit);
  return { page, limit, offset: (page - 1) * limit };
}

function paginate(items, options) {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / options.limit));
  const page = Math.min(options.page, pageCount);
  const offset = (page - 1) * options.limit;
  return {
    items: items.slice(offset, offset + options.limit),
    pagination: {
      page,
      limit: options.limit,
      total,
      pageCount,
      hasPrevious: page > 1,
      hasNext: page < pageCount
    }
  };
}

module.exports = { clampInteger, parsePagination, paginate };
