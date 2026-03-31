/**
 * Seed Script for Scope Rules
 *
 * This script seeds the default scope rules into the database.
 * Run this after database migrations are complete.
 *
 * Usage:
 *   pnpm tsx packages/db/src/seed/seed-scope-rules.script.ts
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../schema';
import { defaultScopeRules } from './scope-rules';

const { scopeRules } = schema;

async function main() {
  // Database connection
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'telepharmacy',
  });

  const db = drizzle(pool, { schema });

  console.log('🌱 Starting scope rules seeding...\n');

  try {
    // Check if rules already exist
    const existingRules = await db.select().from(scopeRules);

    if (existingRules.length > 0) {
      console.log(
        `⚠️  Found ${existingRules.length} existing rules. Skipping seed.`,
      );
      console.log(
        '   To re-seed, delete existing rules first or use --force flag.\n',
      );
      process.exit(0);
    }

    // Insert default rules
    let insertedCount = 0;

    for (const rule of defaultScopeRules) {
      await db.insert(scopeRules).values({
        ruleType: rule.ruleType,
        ruleName: rule.ruleName,
        condition: rule.condition,
        action: rule.action,
        severity: rule.severity,
        message: rule.message,
        priority: rule.priority,
        isActive: true,
      });

      insertedCount++;
      console.log(`✅ [${insertedCount}/${defaultScopeRules.length}] ${rule.ruleName}`);
    }

    console.log(`\n✨ Successfully seeded ${insertedCount} scope rules!\n`);

    // Display summary by rule type
    console.log('📊 Summary by Rule Type:');
    const rulesByType = defaultScopeRules.reduce(
      (acc, rule) => {
        acc[rule.ruleType] = (acc[rule.ruleType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    Object.entries(rulesByType).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count} rules`);
    });

    console.log('\n📊 Summary by Action:');
    const rulesByAction = defaultScopeRules.reduce(
      (acc, rule) => {
        acc[rule.action] = (acc[rule.action] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    Object.entries(rulesByAction).forEach(([action, count]) => {
      console.log(`   - ${action}: ${count} rules`);
    });

    console.log('\n📊 Summary by Severity:');
    const rulesBySeverity = defaultScopeRules.reduce(
      (acc, rule) => {
        acc[rule.severity] = (acc[rule.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    Object.entries(rulesBySeverity).forEach(([severity, count]) => {
      console.log(`   - ${severity}: ${count} rules`);
    });

    console.log('\n');
  } catch (error) {
    console.error('❌ Error seeding scope rules:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
