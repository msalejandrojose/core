import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  REASONING_EFFORTS,
  type AiAgent,
  type AiModel,
  type AiSkill,
  type ReasoningEffort,
} from '../../../domain/agents';
import type {
  MessageRow,
  RequestRow,
  UsageTotals,
} from '../../../application/ports/agents-repository.port';

// ── Modelos ───────────────────────────────────────────────────────────────

export class AiModelDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'OPENAI' }) provider!: string;
  @ApiProperty({ example: 'gpt-6-luna' }) modelId!: string;
  @ApiProperty() label!: string;
  @ApiProperty({ description: 'USD por millón de tokens de entrada.' })
  inputPricePerM!: number;
  @ApiProperty() cachedInputPricePerM!: number;
  @ApiProperty() outputPricePerM!: number;
  @ApiProperty({ enum: REASONING_EFFORTS, isArray: true })
  efforts!: ReasoningEffort[];
  @ApiProperty() enabled!: boolean;

  static from(m: AiModel): AiModelDto {
    return {
      id: m.id,
      provider: m.provider,
      modelId: m.modelId,
      label: m.label,
      inputPricePerM: m.inputPricePerM,
      cachedInputPricePerM: m.cachedInputPricePerM,
      outputPricePerM: m.outputPricePerM,
      efforts: m.efforts,
      enabled: m.enabled,
    };
  }
}

export class UpdateAiModelDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  inputPricePerM?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  cachedInputPricePerM?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  outputPricePerM?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enabled?: boolean;
}

// ── Skills ────────────────────────────────────────────────────────────────

export class AiSkillDto {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: String }) description!: string | null;
  @ApiProperty() instructions!: string;
  @ApiProperty() enabled!: boolean;

  static from(s: AiSkill): AiSkillDto {
    return { ...s };
  }
}

export class SaveAiSkillDto {
  @ApiProperty({ example: 'nutricion' })
  @Matches(/^[a-z0-9][a-z0-9-_]{1,63}$/, {
    message: 'code: minúsculas, números, - o _.',
  })
  code!: string;

  @ApiProperty() @IsString() @MinLength(2) @MaxLength(120) name!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  instructions!: string;
  @ApiProperty() @IsBoolean() enabled!: boolean;
}

// ── Herramientas ──────────────────────────────────────────────────────────

export class AiToolDto {
  @ApiProperty() code!: string;
  @ApiProperty() label!: string;
  @ApiProperty() description!: string;
}

// ── Agentes ───────────────────────────────────────────────────────────────

export class AiAgentDto {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: String }) description!: string | null;
  @ApiProperty() instructions!: string;
  @ApiProperty({ type: AiModelDto }) model!: AiModelDto;
  @ApiProperty({ enum: REASONING_EFFORTS }) reasoningEffort!: ReasoningEffort;
  @ApiProperty() maxOutputTokens!: number;
  @ApiProperty({ type: [String] }) tools!: string[];
  @ApiProperty({ type: [AiSkillDto] }) skills!: AiSkillDto[];
  @ApiProperty() enabled!: boolean;

  static from(a: AiAgent): AiAgentDto {
    return {
      id: a.id,
      code: a.code,
      name: a.name,
      description: a.description,
      instructions: a.instructions,
      model: AiModelDto.from(a.model),
      reasoningEffort: a.reasoningEffort,
      maxOutputTokens: a.maxOutputTokens,
      tools: a.tools,
      skills: a.skills.map((x) => AiSkillDto.from(x)),
      enabled: a.enabled,
    };
  }
}

export class SaveAiAgentDto {
  @ApiProperty({ example: 'brio-coach' })
  @Matches(/^[a-z0-9][a-z0-9-_]{1,63}$/, {
    message: 'code: minúsculas, números, - o _.',
  })
  code!: string;

  @ApiProperty() @IsString() @MinLength(2) @MaxLength(120) name!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(30000)
  instructions!: string;
  @ApiProperty({ description: 'Id interno del modelo.' })
  @IsUUID()
  modelId!: string;
  @ApiProperty({ enum: REASONING_EFFORTS })
  @IsIn(REASONING_EFFORTS)
  reasoningEffort!: ReasoningEffort;
  @ApiProperty() @IsInt() @Min(100) @Max(32000) maxOutputTokens!: number;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  tools!: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(40)
  @IsUUID('all', { each: true })
  skillIds!: string[];

  @ApiProperty() @IsBoolean() enabled!: boolean;
}

// ── Consumo ───────────────────────────────────────────────────────────────

export class UsageQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() agentId?: string;
  @ApiPropertyOptional({ description: 'Desde (ISO).' })
  @IsOptional()
  @IsString()
  from?: string;
  @ApiPropertyOptional({ description: 'Hasta, sin incluir (ISO).' })
  @IsOptional()
  @IsString()
  to?: string;
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class UsageTotalsDto {
  @ApiProperty() requests!: number;
  @ApiProperty() errors!: number;
  @ApiProperty() inputTokens!: number;
  @ApiProperty() cachedInputTokens!: number;
  @ApiProperty() outputTokens!: number;
  @ApiProperty() reasoningTokens!: number;
  @ApiProperty({ description: 'USD.' }) costUsd!: number;
}

export class UsageByAgentDto extends UsageTotalsDto {
  @ApiProperty({ nullable: true, type: String }) agentId!: string | null;
  @ApiProperty({ nullable: true, type: String }) agentName!: string | null;
}

export class AiRequestDto {
  @ApiProperty() id!: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty({ nullable: true, type: String }) agentName!: string | null;
  @ApiProperty({ nullable: true, type: String }) userEmail!: string | null;
  @ApiProperty() modelId!: string;
  @ApiProperty({ nullable: true, type: String }) reasoningEffort!:
    | string
    | null;
  @ApiProperty() inputTokens!: number;
  @ApiProperty() cachedInputTokens!: number;
  @ApiProperty() outputTokens!: number;
  @ApiProperty() reasoningTokens!: number;
  @ApiProperty() costUsd!: number;
  @ApiProperty() durationMs!: number;
  @ApiProperty({ enum: ['OK', 'ERROR'] }) status!: 'OK' | 'ERROR';
  @ApiProperty({ nullable: true, type: String }) error!: string | null;
  @ApiProperty({ type: [String] }) toolCalls!: string[];

  static from(r: RequestRow): AiRequestDto {
    return {
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      agentName: r.agentName,
      userEmail: r.userEmail,
      modelId: r.modelId,
      reasoningEffort: r.reasoningEffort,
      inputTokens: r.inputTokens,
      cachedInputTokens: r.cachedInputTokens,
      outputTokens: r.outputTokens,
      reasoningTokens: r.reasoningTokens,
      costUsd: r.costUsd,
      durationMs: r.durationMs,
      status: r.status,
      error: r.error,
      toolCalls: r.toolCalls,
    };
  }
}

export class UsageResponseDto {
  @ApiProperty({ type: [AiRequestDto] }) data!: AiRequestDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty({ type: UsageTotalsDto }) totals!: UsageTotals;
  @ApiProperty({ type: [UsageByAgentDto] }) byAgent!: UsageByAgentDto[];
}

// ── Chat (app) ────────────────────────────────────────────────────────────

export class ChatRequestDto {
  @ApiProperty({ example: '¿Qué ceno hoy?' })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  message!: string;
  @ApiPropertyOptional({
    type: [String],
    description:
      'Fotos como data URL JPEG/PNG/WebP (máx. 4, ~2 MB cada una). No se guardan.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @IsString({ each: true })
  @MaxLength(3_000_000, { each: true })
  @Matches(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, {
    each: true,
    message: 'images: data URL de imagen JPEG, PNG o WebP.',
  })
  images?: string[];
  @ApiPropertyOptional() @IsOptional() @IsUUID() conversationId?: string;
  @ApiPropertyOptional({ example: 'Europe/Madrid' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timeZone?: string;
}

export class AiMessageDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ['USER', 'ASSISTANT'] }) role!: 'USER' | 'ASSISTANT';
  @ApiProperty() content!: string;
  @ApiProperty({ type: [String] }) toolsUsed!: string[];
  @ApiProperty() imageCount!: number;
  @ApiProperty() createdAt!: string;

  static from(m: MessageRow): AiMessageDto {
    return { ...m, createdAt: m.createdAt.toISOString() };
  }
}

export class ChatResponseDto {
  @ApiProperty() conversationId!: string;
  @ApiProperty({ type: AiMessageDto }) message!: AiMessageDto;
}

export class AiConversationDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() updatedAt!: string;
}
