import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service.js';
import { VaultsService } from '../vaults/vaults.service.js';
import type { CreateFluxRuleDto, UpdateFluxRuleDto } from './dto/create-flux-rule.dto.js';

interface ParamDef {
  key: string;
  label: string;
  type: string;
  default: number;
}

/** Resolve the effective percent for a destination.
 *
 * Priority:
 * 1. Runtime override: runtimeParams[percentParam]
 * 2. Rule default:     paramDefs.find(k === percentParam).default
 * 3. Fixed fallback:   dest.percent
 */
function resolvePercent(
  destPercent: number,
  percentParam: string | null,
  paramDefs: ParamDef[],
  runtimeParams: Record<string, number>,
): number {
  if (!percentParam) return destPercent;

  if (Object.prototype.hasOwnProperty.call(runtimeParams, percentParam)) {
    return runtimeParams[percentParam];
  }

  const def = paramDefs.find((p) => p.key === percentParam);
  if (def !== undefined) return def.default;

  return destPercent;
}

function validateTotalPercent(
  destinations: { percent: number }[],
  label = 'Destinations',
) {
  const total = destinations.reduce((s, d) => s + d.percent, 0);
  if (Math.abs(total - 100) > 0.001) {
    throw new BadRequestException(`${label} percents must sum to 100 (got ${total})`);
  }
}

@Injectable()
export class FluxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vaults: VaultsService,
  ) {}

  async create(workspaceId: string, dto: CreateFluxRuleDto) {
    validateTotalPercent(dto.destinations, 'Destinations');

    return this.prisma.fluxRule.create({
      data: {
        workspaceId,
        name: dto.name,
        sourceType: dto.sourceType,
        sourceId: dto.sourceId ?? null,
        description: dto.description ?? null,
        params: dto.params ? (dto.params as any) : null,
        destinations: {
          create: dto.destinations.map((d) => ({
            targetType: d.targetType,
            targetVaultId: d.targetVaultId ?? null,
            percent: d.percent,
            percentParam: d.percentParam ?? null,
          })),
        },
      },
      include: {
        destinations: { include: { targetVault: { select: { id: true, name: true } } } },
      },
    });
  }

  async list(workspaceId: string) {
    return this.prisma.fluxRule.findMany({
      where: { workspaceId },
      include: {
        destinations: { include: { targetVault: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(ruleId: string, workspaceId: string) {
    const rule = await this.prisma.fluxRule.findFirst({
      where: { id: ruleId, workspaceId },
      include: {
        destinations: { include: { targetVault: { select: { id: true, name: true } } } },
      },
    });
    if (!rule) throw new NotFoundException('Flux rule not found');
    return rule;
  }

  async update(ruleId: string, workspaceId: string, dto: UpdateFluxRuleDto) {
    await this.findOne(ruleId, workspaceId);

    if (dto.destinations !== undefined) {
      validateTotalPercent(dto.destinations, 'Destinations');
      await this.prisma.fluxRuleDestination.deleteMany({ where: { fluxRuleId: ruleId } });
    }

    return this.prisma.fluxRule.update({
      where: { id: ruleId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.params !== undefined ? { params: dto.params as any } : {}),
        ...(dto.destinations !== undefined
          ? {
              destinations: {
                create: dto.destinations.map((d) => ({
                  targetType: d.targetType,
                  targetVaultId: d.targetVaultId ?? null,
                  percent: d.percent,
                  percentParam: d.percentParam ?? null,
                })),
              },
            }
          : {}),
      },
      include: {
        destinations: { include: { targetVault: { select: { id: true, name: true } } } },
      },
    });
  }

  /**
   * Apply a flux rule manually.
   *
   * Simple mode:  `params` omitted — fixed percents from destinations are used.
   * Flow mode:    `params` provided — named params override destination percents.
   *
   * Example (flow):
   *   rule.params = [{ key: "reserveRate", default: 20 }]
   *   destination.percentParam = "reserveRate"
   *   apply({ amount: 1000, params: { reserveRate: 35 } }) → uses 35%, not 20%
   */
  async applyManual(
    ruleId: string,
    workspaceId: string,
    amount: number,
    authorId: string,
    runtimeParams: Record<string, number> = {},
    description?: string,
  ) {
    const rule = await this.findOne(ruleId, workspaceId);
    if (!rule.isActive) throw new BadRequestException('Flux rule is not active');

    const paramDefs: ParamDef[] = Array.isArray(rule.params) ? (rule.params as any) : [];

    const allMembers = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: { id: true, sharePercent: true },
    });

    await this.prisma.$transaction(async (tx) => {
      for (const dest of rule.destinations) {
        const effectivePercent = resolvePercent(
          Number(dest.percent),
          dest.percentParam,
          paramDefs,
          runtimeParams,
        );
        const destAmount = (amount * effectivePercent) / 100;
        if (destAmount <= 0) continue;

        if (dest.targetType === 'GROUP_VAULT' && dest.targetVaultId) {
          await (this.vaults as any).creditGroupVault(tx, {
            vaultId: dest.targetVaultId,
            workspaceId,
            authorId,
            amount: destAmount,
            category: 'FLUX_MANUAL',
            description: description ?? `Manual flux: ${rule.name}`,
          });
        }

        if (dest.targetType === 'WITHDRAWABLE_VAULTS') {
          for (const m of allMembers) {
            const memberShare = (destAmount * Number(m.sharePercent)) / 100;
            if (memberShare <= 0) continue;
            await (this.vaults as any).creditWithdrawableVault(tx, {
              memberId: m.id,
              workspaceId,
              authorId,
              amount: memberShare,
              category: 'FLUX_MANUAL',
              description: description ?? `Manual flux: ${rule.name}`,
            });
          }
        }
      }
    });

    return { applied: true, ruleId, amount, runtimeParams };
  }

  /** Compute the effective percent for each destination given runtime params — for preview/dry-run. */
  async previewParams(
    ruleId: string,
    workspaceId: string,
    runtimeParams: Record<string, number> = {},
  ): Promise<Record<string, unknown>> {
    const rule = await this.findOne(ruleId, workspaceId);
    const paramDefs: ParamDef[] = Array.isArray((rule as any).params)
      ? ((rule as any).params as ParamDef[])
      : [];

    return {
      rule: { id: rule.id, name: rule.name, params: paramDefs },
      resolvedDestinations: rule.destinations.map((d: any) => ({
        id: d.id,
        targetType: d.targetType,
        targetVaultId: d.targetVaultId,
        percentParam: d.percentParam ?? null,
        fixedPercent: Number(d.percent),
        effectivePercent: resolvePercent(Number(d.percent), d.percentParam ?? null, paramDefs, runtimeParams),
        mode: d.percentParam
          ? Object.hasOwn(runtimeParams, d.percentParam)
            ? 'flow-override'
            : 'flow-default'
          : 'simple',
      })),
    };
  }
}
