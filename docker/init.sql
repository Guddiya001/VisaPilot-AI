-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant CREATEDB so Prisma can create its shadow database during migrations
ALTER USER visapilot CREATEDB;
