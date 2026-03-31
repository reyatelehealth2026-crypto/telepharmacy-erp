import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ScopeValidatorService } from './scope-validator.service';
import { ScopeRulesService } from './scope-rules.service';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import {
  ValidateConsultationScopeSchema,
  OverrideScopeValidationSchema,
  CreateScopeRuleSchema,
  UpdateScopeRuleSchema,
  type ValidateConsultationScopeDto,
  type OverrideScopeValidationDto,
  type CreateScopeRuleDto,
  type UpdateScopeRuleDto,
  type ScopeValidationResult,
  type ScopeRuleDto,
  type ScopeValidationHistoryDto,
} from './dto/validate-scope.dto';

@Controller('v1/telemedicine/scope')
export class ScopeController {
  constructor(
    private readonly scopeValidatorService: ScopeValidatorService,
    private readonly scopeRulesService: ScopeRulesService,
  ) {}

  /**
   * Validate consultation scope
   * POST /v1/telemedicine/scope/validate
   */
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validateScope(
    @Body(new ZodValidationPipe(ValidateConsultationScopeSchema))
    dto: ValidateConsultationScopeDto,
    @Request() req: any,
  ): Promise<ScopeValidationResult> {
    const actorId = req.user?.id || dto.patientId;
    const actorType = req.user?.role === 'pharmacist' ? 'pharmacist' : 'patient';

    return await this.scopeValidatorService.validateConsultationScope(
      dto,
      actorId,
      actorType,
    );
  }

  /**
   * Override validation result (pharmacist only)
   * POST /v1/telemedicine/scope/override
   */
  @Post('override')
  @HttpCode(HttpStatus.OK)
  async overrideValidation(
    @Body(new ZodValidationPipe(OverrideScopeValidationSchema))
    dto: OverrideScopeValidationDto,
    @Request() req: any,
  ): Promise<{ success: boolean; message: string }> {
    const pharmacistId = req.user?.id;

    if (!pharmacistId || req.user?.role !== 'pharmacist') {
      return {
        success: false,
        message: 'Only pharmacists can override validation results',
      };
    }

    await this.scopeValidatorService.overrideValidation(
      dto.validationId,
      pharmacistId,
      dto.reason,
    );

    return {
      success: true,
      message: 'Validation override recorded successfully',
    };
  }

  /**
   * Get validation history for a consultation
   * GET /v1/telemedicine/scope/history/:consultationId
   */
  @Get('history/:consultationId')
  async getValidationHistory(
    @Param('consultationId') consultationId: string,
  ): Promise<ScopeValidationHistoryDto[]> {
    return await this.scopeValidatorService.getValidationHistory(
      consultationId,
    );
  }

  /**
   * Get all scope rules
   * GET /v1/telemedicine/scope/rules
   */
  @Get('rules')
  async getAllRules(
    @Query('includeInactive') includeInactive?: string,
  ): Promise<ScopeRuleDto[]> {
    const showInactive = includeInactive === 'true';
    return await this.scopeRulesService.getAllRules(showInactive);
  }

  /**
   * Get a specific scope rule
   * GET /v1/telemedicine/scope/rules/:ruleId
   */
  @Get('rules/:ruleId')
  async getRule(@Param('ruleId') ruleId: string): Promise<ScopeRuleDto> {
    return await this.scopeRulesService.getRule(ruleId);
  }

  /**
   * Create a new scope rule (admin only)
   * POST /v1/telemedicine/scope/rules
   */
  @Post('rules')
  @HttpCode(HttpStatus.CREATED)
  async createRule(
    @Body(new ZodValidationPipe(CreateScopeRuleSchema))
    dto: CreateScopeRuleDto,
    @Request() req: any,
  ): Promise<ScopeRuleDto> {
    const createdBy = req.user?.id;
    return await this.scopeRulesService.createRule(dto, createdBy);
  }

  /**
   * Update a scope rule (admin only)
   * PUT /v1/telemedicine/scope/rules/:ruleId
   */
  @Put('rules/:ruleId')
  async updateRule(
    @Param('ruleId') ruleId: string,
    @Body(new ZodValidationPipe(UpdateScopeRuleSchema))
    dto: UpdateScopeRuleDto,
    @Request() req: any,
  ): Promise<ScopeRuleDto> {
    return await this.scopeRulesService.updateRule(ruleId, dto);
  }

  /**
   * Deactivate a scope rule (admin only)
   * POST /v1/telemedicine/scope/rules/:ruleId/deactivate
   */
  @Post('rules/:ruleId/deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivateRule(
    @Param('ruleId') ruleId: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.scopeRulesService.deactivateRule(ruleId);
    return {
      success: true,
      message: 'Rule deactivated successfully',
    };
  }

  /**
   * Activate a scope rule (admin only)
   * POST /v1/telemedicine/scope/rules/:ruleId/activate
   */
  @Post('rules/:ruleId/activate')
  @HttpCode(HttpStatus.OK)
  async activateRule(
    @Param('ruleId') ruleId: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.scopeRulesService.activateRule(ruleId);
    return {
      success: true,
      message: 'Rule activated successfully',
    };
  }
}
