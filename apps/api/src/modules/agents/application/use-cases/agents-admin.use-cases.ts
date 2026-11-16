import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AiAgent, AiModel, AiSkill } from '../../domain/agents';
import {
  AGENTS_REPOSITORY,
  type AgentData,
  type AgentsRepositoryPort,
  type ModelPatch,
  type SkillData,
  type UsageFilter,
} from '../ports/agents-repository.port';
import { AgentToolRegistry } from '../tool-registry';

/**
 * Lo que se configura desde el backoffice: precios de los modelos, skills,
 * agentes y el consumo. Valida lo que la base de datos no puede: que el
 * esfuerzo lo admita el modelo y que las herramientas existan.
 */
@Injectable()
export class AgentsAdminUseCases {
  constructor(
    @Inject(AGENTS_REPOSITORY)
    private readonly repo: AgentsRepositoryPort,
    private readonly registry: AgentToolRegistry,
  ) {}

  listModels(): Promise<AiModel[]> {
    return this.repo.listModels();
  }

  async updateModel(id: string, patch: ModelPatch): Promise<AiModel> {
    const model = await this.repo.updateModel(id, patch);
    if (!model) throw new NotFoundException('AI_MODEL_NOT_FOUND');
    return model;
  }

  listSkills(): Promise<AiSkill[]> {
    return this.repo.listSkills();
  }

  createSkill(data: SkillData): Promise<AiSkill> {
    return this.repo.createSkill(data);
  }

  async updateSkill(id: string, data: SkillData): Promise<AiSkill> {
    const skill = await this.repo.updateSkill(id, data);
    if (!skill) throw new NotFoundException('AI_SKILL_NOT_FOUND');
    return skill;
  }

  async deleteSkill(id: string): Promise<void> {
    if (!(await this.repo.deleteSkill(id)))
      throw new NotFoundException('AI_SKILL_NOT_FOUND');
  }

  listTools() {
    return this.registry.list().map((t) => ({
      code: t.code,
      label: t.label,
      description: t.description,
    }));
  }

  listAgents(): Promise<AiAgent[]> {
    return this.repo.listAgents();
  }

  async getAgent(id: string): Promise<AiAgent> {
    const agent = await this.repo.findAgent(id);
    if (!agent) throw new NotFoundException('AGENT_NOT_FOUND');
    return agent;
  }

  async createAgent(data: AgentData): Promise<AiAgent> {
    await this.validate(data);
    return this.repo.createAgent(data);
  }

  async updateAgent(id: string, data: AgentData): Promise<AiAgent> {
    await this.validate(data);
    const agent = await this.repo.updateAgent(id, data);
    if (!agent) throw new NotFoundException('AGENT_NOT_FOUND');
    return agent;
  }

  async usage(filter: UsageFilter, page: number, limit: number) {
    const [list, totals, byAgent] = await Promise.all([
      this.repo.listRequests(filter, page, limit),
      this.repo.usageTotals(filter),
      this.repo.usageByAgent(filter),
    ]);
    return { ...list, totals, byAgent };
  }

  private async validate(data: AgentData): Promise<void> {
    const model = await this.repo.findModel(data.modelId);
    if (!model) throw new BadRequestException('AI_MODEL_NOT_FOUND');
    if (model.efforts.length && !model.efforts.includes(data.reasoningEffort)) {
      throw new BadRequestException(
        `El modelo ${model.label} admite estos esfuerzos: ${model.efforts.join(', ')}.`,
      );
    }
    const unknown = data.tools.filter((t) => !this.registry.get(t));
    if (unknown.length)
      throw new BadRequestException(
        `Herramientas desconocidas: ${unknown.join(', ')}`,
      );
  }
}
