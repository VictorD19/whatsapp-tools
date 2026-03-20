import { Controller, Get, Post, Patch, Delete, Param, Body, HttpCode, HttpStatus, UseGuards, Res, Header } from '@nestjs/common'
import type { FastifyReply } from 'fastify'
import { CurrentTenant } from '@shared/decorators/current-tenant.decorator'
import { ZodValidationPipe } from '@shared/pipes/zod-validation.pipe'
import { Roles } from '@shared/decorators/roles.decorator'
import { RoleGuard } from '@core/guards/role.guard'
import { AssistantsService } from './assistants.service'
import { CreateAssistantSchema, type CreateAssistantDto } from './dto/create-assistant.dto'
import { UpdateAssistantSchema, type UpdateAssistantDto } from './dto/update-assistant.dto'
import { LinkKnowledgeBaseSchema, type LinkKnowledgeBaseDto } from './dto/link-kb.dto'
import { LinkToolSchema, type LinkToolDto } from './dto/link-tool.dto'
import { SetConversationAssistantSchema, type SetConversationAssistantDto } from './dto/set-conversation-assistant.dto'
import { UpdateAssistantSettingsSchema, type UpdateAssistantSettingsDto } from './dto/update-assistant-settings.dto'

@UseGuards(RoleGuard)
@Roles('admin')
@Controller()
export class AssistantsController {
  constructor(private readonly assistantsService: AssistantsService) {}

  @Get('assistants/settings')
  getSettings(@CurrentTenant() tenantId: string) {
    return this.assistantsService.getSettings(tenantId)
  }

  @Patch('assistants/settings')
  updateSettings(
    @CurrentTenant() tenantId: string,
    @Body(new ZodValidationPipe(UpdateAssistantSettingsSchema)) dto: UpdateAssistantSettingsDto,
  ) {
    return this.assistantsService.updateSettings(tenantId, dto)
  }

  @Get('assistants')
  findAll(@CurrentTenant() tenantId: string) {
    return this.assistantsService.findAll(tenantId)
  }

  @Get('assistants/:id')
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.assistantsService.findById(tenantId, id)
  }

  @Post('assistants/voice-preview')
  async previewVoice(
    @Body() body: { voiceId: string },
    @Res() reply: FastifyReply,
  ) {
    const { buffer, contentType } = await this.assistantsService.previewVoice(body.voiceId)
    reply.header('Content-Type', contentType)
    reply.header('Content-Length', buffer.length)
    reply.header('Cache-Control', 'public, max-age=86400')
    return reply.send(buffer)
  }

  @Post('assistants')
  create(
    @CurrentTenant() tenantId: string,
    @Body(new ZodValidationPipe(CreateAssistantSchema)) dto: CreateAssistantDto,
  ) {
    return this.assistantsService.create(tenantId, dto)
  }

  @Patch('assistants/:id')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateAssistantSchema)) dto: UpdateAssistantDto,
  ) {
    return this.assistantsService.update(tenantId, id, dto)
  }

  @Delete('assistants/:id')
  @HttpCode(HttpStatus.OK)
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.assistantsService.delete(tenantId, id)
  }

  @Post('assistants/:id/knowledge-bases')
  linkKnowledgeBase(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(LinkKnowledgeBaseSchema)) dto: LinkKnowledgeBaseDto,
  ) {
    return this.assistantsService.linkKnowledgeBase(tenantId, id, dto.knowledgeBaseId)
  }

  @Delete('assistants/:id/knowledge-bases/:kbId')
  @HttpCode(HttpStatus.OK)
  unlinkKnowledgeBase(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Param('kbId') kbId: string,
  ) {
    return this.assistantsService.unlinkKnowledgeBase(tenantId, id, kbId)
  }

  @Post('assistants/:id/tools')
  linkTool(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(LinkToolSchema)) dto: LinkToolDto,
  ) {
    return this.assistantsService.linkTool(tenantId, id, dto.aiToolId)
  }

  @Delete('assistants/:id/tools/:toolId')
  @HttpCode(HttpStatus.OK)
  unlinkTool(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Param('toolId') toolId: string,
  ) {
    return this.assistantsService.unlinkTool(tenantId, id, toolId)
  }

  @Patch('inbox/conversations/:conversationId/assistant')
  @Roles('admin', 'agent')
  setConversationAssistant(
    @CurrentTenant() tenantId: string,
    @Param('conversationId') conversationId: string,
    @Body(new ZodValidationPipe(SetConversationAssistantSchema)) dto: SetConversationAssistantDto,
  ) {
    return this.assistantsService.setConversationAssistant(tenantId, conversationId, dto)
  }
}
