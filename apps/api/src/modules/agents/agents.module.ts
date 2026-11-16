import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { AGENTS_REPOSITORY } from './application/ports/agents-repository.port';
import { LLM_CLIENT } from './application/ports/llm-client.port';
import { AgentToolRegistry } from './application/tool-registry';
import { AgentsAdminUseCases } from './application/use-cases/agents-admin.use-cases';
import { ChatWithAgentUseCase } from './application/use-cases/chat.use-case';
import { AgentsController } from './infrastructure/http/agents.controller';
import {
  AdminAiAgentsController,
  AdminAiModelsController,
  AdminAiSkillsController,
  AdminAiUsageController,
} from './infrastructure/http/admin-ai.controller';
import { OpenAiResponsesClient } from './infrastructure/openai/openai-responses.client';
import { PrismaAgentsRepository } from './infrastructure/persistence/prisma-agents.repository';

/**
 * Agentes de IA configurables desde el backoffice. Otros módulos aportan
 * herramientas registrándolas en `AgentToolRegistry` (se exporta para eso).
 */
@Module({
  imports: [IamModule],
  controllers: [
    AgentsController,
    AdminAiModelsController,
    AdminAiSkillsController,
    AdminAiAgentsController,
    AdminAiUsageController,
  ],
  providers: [
    { provide: AGENTS_REPOSITORY, useClass: PrismaAgentsRepository },
    { provide: LLM_CLIENT, useClass: OpenAiResponsesClient },
    AgentToolRegistry,
    AgentsAdminUseCases,
    ChatWithAgentUseCase,
  ],
  exports: [AgentToolRegistry],
})
export class AgentsModule {}
