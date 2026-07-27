#!/usr/bin/env node

/**
 * Deploy Prisma migrations to production database
 * Uses explicit --schema flag to avoid any config file parsing issues
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = resolve(__dirname, '../../../apps/server/.env');
dotenv.config({ path: envPath });

// Check required environment variables
if (!process.env.DIRECT_URL) {
  console.error('❌ ERROR: DIRECT_URL environment variable is not set');
  console.error('   Please set DIRECT_URL with your direct PostgreSQL connection string');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  // Use DIRECT_URL as fallback for DATABASE_URL
  process.env.DATABASE_URL = process.env.DIRECT_URL;
  console.log('⚠️  DATABASE_URL not set, using DIRECT_URL');
}

console.log('📋 Deploying Prisma migrations...');
console.log('');

try {
  // Migrations live at prisma/schema/migrations, resolved by Prisma relative to
  // the schema file. This script used to copy them there from a second copy at
  // prisma/migrations; that duplicate has been removed, since it silently drifted
  // out of date and shadowed the real one.

  // Run migrate deploy with explicit schema path
  const schemaPath = resolve(__dirname, '../prisma/schema/schema.prisma');
  
  execSync(
    `npx prisma migrate deploy --schema="${schemaPath}"`,
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL,
        DIRECT_URL: process.env.DIRECT_URL,
      },
      cwd: resolve(__dirname, '..'),
    }
  );
  
  console.log('');
  console.log('✅ Migrations deployed successfully!');
} catch (error) {
  console.error('');
  console.error('❌ Failed to deploy migrations');
  process.exit(1);
}

