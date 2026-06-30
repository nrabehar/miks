import { Type } from 'class-transformer';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  IsNumber,
  IsObject,
  ValidateNested,
  Min,
  Max,
  IsIn,
} from 'class-validator';

enum SourceType {
  COTISATION = 'COTISATION',
  PROJECT_REVENUE = 'PROJECT_REVENUE',
  MANUAL = 'MANUAL',
}

enum TargetType {
  GROUP_VAULT = 'GROUP_VAULT',
  WITHDRAWABLE_VAULTS = 'WITHDRAWABLE_VAULTS',
}

/**
 * A named parameter definition stored on the FluxRule.
 * Allows overriding percent values at apply-time (flow mode).
 *
 * Example:
 *   { key: "rate", label: "Distribution rate", type: "number", default: 30 }
 *
 * At apply-time: pass { rate: 45 } to override the 30% default.
 */
export class FluxParamDefinitionDto {
  @IsString()
  key: string;

  @IsString()
  label: string;

  @IsIn(['number'])
  type: string;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(100)
  default: number;
}

/**
 * A destination in a FluxRule.
 *
 * Simple mode:  set `percent` only → always uses that fixed value.
 * Flow mode:    set `percentParam` → resolved from runtime params at apply-time,
 *               with `percent` as the fallback if the param is not provided.
 *
 * Both modes can coexist in the same destination array.
 */
export class FluxDestinationDto {
  @IsEnum(TargetType)
  targetType: string;

  @IsOptional()
  @IsString()
  targetVaultId?: string;

  /** Fixed fallback percent (required, used when percentParam is absent or param not supplied). */
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(100)
  percent: number;

  /** Key of a named param from FluxRule.params. When provided at apply-time, overrides percent. */
  @IsOptional()
  @IsString()
  percentParam?: string;
}

export class CreateFluxRuleDto {
  @IsString()
  name: string;

  @IsEnum(SourceType)
  sourceType: string;

  @IsOptional()
  @IsString()
  sourceId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  /**
   * Named parameter definitions (flow mode).
   * Omit entirely if all destinations use simple fixed percents.
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FluxParamDefinitionDto)
  params?: FluxParamDefinitionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FluxDestinationDto)
  destinations: FluxDestinationDto[];
}

export class UpdateFluxRuleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FluxParamDefinitionDto)
  params?: FluxParamDefinitionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FluxDestinationDto)
  destinations?: FluxDestinationDto[];
}

/** Runtime parameter values passed when applying a rule in flow mode. */
export class ApplyFluxRuleDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  /**
   * Runtime overrides for named params.
   * Keys must match `percentParam` values defined on destinations.
   * Omit to use defaults from FluxRule.params.
   */
  @IsOptional()
  @IsObject()
  params?: Record<string, number>;
}
