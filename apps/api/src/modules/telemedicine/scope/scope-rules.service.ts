import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from '../../../database/database.constants';
import * as schema from '@telepharmacy/db';
import { eq } from 'drizzle-orm';
import type {
  CreateScopeRuleDto,
  UpdateScopeRuleDto,
  ScopeRuleDto,
} from './dto/validate-scope.dto';

const { scopeRules } = schema;

@Injectable()
export class ScopeRulesService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  /**
   * Get all scope rules
   */
  async getAllRules(includeInactive = false): Promise<ScopeRuleDto[]> {
    const query = this.db.select().from(scopeRules).orderBy(scopeRules.priority);

    if (!includeInactive) {
      query.where(eq(scopeRules.isActive, true));
    }

    return await query;
  }

  /**
   * Get a specific rule by ID
   */
  async getRule(ruleId: string): Promise<ScopeRuleDto> {
    const [rule] = await this.db
      .select()
      .from(scopeRules)
      .where(eq(scopeRules.id, ruleId));

    if (!rule) {
      throw new NotFoundException(`Scope rule with ID ${ruleId} not found`);
    }

    return rule;
  }

  /**
   * Create a new scope rule
   */
  async createRule(
    dto: CreateScopeRuleDto,
    createdBy?: string,
  ): Promise<ScopeRuleDto> {
    const [rule] = await this.db
      .insert(scopeRules)
      .values({
        ruleType: dto.ruleType,
        ruleName: dto.ruleName,
        condition: dto.condition,
        action: dto.action,
        severity: dto.severity || null,
        message: dto.message || null,
        priority: dto.priority,
        isActive: true,
        createdBy: createdBy || null,
      })
      .returning();

    return rule;
  }

  /**
   * Update an existing scope rule
   */
  async updateRule(
    ruleId: string,
    dto: UpdateScopeRuleDto,
  ): Promise<ScopeRuleDto> {
    const [rule] = await this.db
      .update(scopeRules)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(eq(scopeRules.id, ruleId))
      .returning();

    if (!rule) {
      throw new NotFoundException(`Scope rule with ID ${ruleId} not found`);
    }

    return rule;
  }

  /**
   * Deactivate a scope rule
   */
  async deactivateRule(ruleId: string): Promise<void> {
    const result = await this.db
      .update(scopeRules)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(scopeRules.id, ruleId));

    if (result.rowCount === 0) {
      throw new NotFoundException(`Scope rule with ID ${ruleId} not found`);
    }
  }

  /**
   * Activate a scope rule
   */
  async activateRule(ruleId: string): Promise<void> {
    const result = await this.db
      .update(scopeRules)
      .set({
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(scopeRules.id, ruleId));

    if (result.rowCount === 0) {
      throw new NotFoundException(`Scope rule with ID ${ruleId} not found`);
    }
  }
}
