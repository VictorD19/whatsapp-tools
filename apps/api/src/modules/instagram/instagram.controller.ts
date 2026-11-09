import { Body, Controller, Delete, Get, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common'
import { RawBodyRequest } from '@nestjs/common'
import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { RoleGuard } from '@core/guards/role.guard'
import { CurrentTenant } from '@shared/decorators/current-tenant.decorator'
import { CurrentUser, Public } from '@shared/decorators/current-user.decorator'
import { Roles } from '@shared/decorators/roles.decorator'
import { ZodValidationPipe } from '@shared/pipes/zod-validation.pipe'
import { InstagramService } from './instagram.service'

const replySchema = z.object({ text: z.string().trim().min(1).max(1000), requestId: z.string().uuid() }).strict()
const simulationSchema = z.object({ accountId: z.string().min(1).max(100), participantId: z.string().regex(/^\d{1,40}$/),
  text: z.string().trim().min(1).max(1000), messageId: z.string().min(1).max(512).optional() }).strict()

@Controller('instagram')
@UseGuards(RoleGuard)
@Roles('admin')
export class InstagramController {
  constructor(private readonly service: InstagramService) {}
  @Get('status') status(@CurrentTenant() tenantId: string) { return this.service.status(tenantId) }
  @Get('accounts') accounts(@CurrentTenant() tenantId: string) { return this.service.accounts(tenantId) }
  @Post('simulated-account') simulatedAccount(@CurrentTenant() tenantId: string) { return this.service.simulatedAccount(tenantId) }
  @Post('simulate-inbound') simulate(@CurrentTenant() tenantId: string,
    @Body(new ZodValidationPipe(simulationSchema)) body: z.infer<typeof simulationSchema>) {
    return this.service.simulate(tenantId, body.accountId, body.participantId, body.text, body.messageId)
  }
  @Get('connect') connect(@CurrentTenant() tenantId: string, @CurrentUser() user: { id: string }) { return this.service.connect(tenantId, user.id) }
  @Get('callback') @Public()
  async callback(@Query('code') code: string, @Query('state') state: string, @Res() res: FastifyReply) {
    // No dynamic redirect destinations, authorization code, token or provider error in the response.
    try { await this.service.callback(code, state); return res.type('text/plain').send('Instagram conectado. Feche esta janela e atualize a aba de testes.') }
    catch { return res.status(400).type('text/plain').send('Não foi possível conectar. Inicie uma nova autorização na aba Instagram de testes.') }
  }
  @Get('webhook') @Public()
  verify(@Query() query: Record<string, string>, @Res() res: FastifyReply) { return res.type('text/plain').send(this.service.verify(query)) }
  @Post('webhook') @Public()
  webhook(@Req() request: RawBodyRequest<FastifyRequest>, @Body() body: unknown) {
    return this.service.webhook(request.rawBody || Buffer.alloc(0), request.headers['x-hub-signature-256'] as string | undefined, body)
  }
  @Delete('accounts/:id') disconnect(@CurrentTenant() tenantId: string, @Param('id') id: string) { return this.service.disconnect(tenantId, id) }
  @Get('accounts/:id/conversations') conversations(@CurrentTenant() tenantId: string, @Param('id') id: string) { return this.service.conversations(tenantId, id) }
  @Get('conversations/:id/messages') messages(@CurrentTenant() tenantId: string, @Param('id') id: string, @Query('before') before?: string) { return this.service.messages(tenantId, id, before) }
  @Post('conversations/:id/reply') reply(@CurrentTenant() tenantId: string, @Param('id') id: string,
    @Body(new ZodValidationPipe(replySchema)) body: z.infer<typeof replySchema>) { return this.service.reply(tenantId, id, body.text, body.requestId) }
}
