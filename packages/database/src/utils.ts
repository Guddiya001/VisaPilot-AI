import { Prisma } from '@prisma/client';

export function parsePrismaError(error: unknown): {
  code: string;
  message: string;
  details?: Record<string, unknown>;
} {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2000':
        return {
          code: 'VALUE_TOO_LONG',
          message: 'The provided value is too long for the field.',
          details: { meta: error.meta },
        };
      case 'P2001':
        return {
          code: 'RECORD_NOT_FOUND',
          message: 'The requested record was not found.',
          details: { meta: error.meta },
        };
      case 'P2002':
        return {
          code: 'UNIQUE_CONSTRAINT',
          message: 'A record with this value already exists.',
          details: { meta: error.meta },
        };
      case 'P2003':
        return {
          code: 'FOREIGN_KEY_CONSTRAINT',
          message: 'Referenced record does not exist.',
          details: { meta: error.meta },
        };
      case 'P2025':
        return {
          code: 'RECORD_NOT_FOUND',
          message: 'Record not found for update or delete.',
          details: { meta: error.meta },
        };
      default:
        return {
          code: 'DATABASE_ERROR',
          message: error.message,
          details: { meta: error.meta, code: error.code },
        };
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      code: 'VALIDATION_ERROR',
      message: 'Invalid data provided to the database.',
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: error instanceof Error ? error.message : 'An unknown database error occurred.',
  };
}

export function buildPaginationParams(page: number, limit: number): {
  skip: number;
  take: number;
} {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(Math.max(1, limit), 100);

  return {
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
  };
}

export function buildSearchFilter(query: string, fields: string[]): Prisma.Sql {
  const searchTerms = query
    .split(' ')
    .filter(Boolean)
    .map((term) => term.replace(/[^\w\s]/g, ''))
    .filter(Boolean);

  if (searchTerms.length === 0) {
    return Prisma.sql`1=1`;
  }

  const conditions = searchTerms
    .map((term) => {
      const fieldConditions = fields
        .map((field) => Prisma.sql`${Prisma.raw(field)} ILIKE ${'%' + term + '%'}`)
        .reduce((acc, curr) => Prisma.sql`${acc} OR ${curr}`);

      return Prisma.sql`(${fieldConditions})`;
    })
    .reduce((acc, curr) => Prisma.sql`${acc} AND ${curr}`);

  return conditions;
}

export function calculatePaginationMeta(total: number, page: number, limit: number) {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

