// Local lab only; synthetic data and forced transaction rollback. No Meta calls.
import assert from 'node:assert/strict'
import { createHmac, randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const require = createRequire(join(root, 'apps/api/package.json'))
require('tsconfig-paths').register({ baseUrl: join(root, 'apps/api/dist'), paths: {
  '@core/*': ['core/*'], '@shared/*': ['shared/*'], '@modules/*': ['modules/*'], '@config/*': ['config/*'],
} })
const { PrismaClient } = require('@prisma/client')
const { ConfigService } = require('@nestjs/config')
const { InstagramConfig } = require(join(root, 'apps/api/dist/modules/instagram/instagram.config.js'))
const { InstagramService } = require(join(root, 'apps/api/dist/modules/instagram/instagram.service.js'))
const db = new PrismaClient({ datasources: { db: { url: 'postgresql://instagram_lab:instagram_lab_local_only@127.0.0.1:15432/instagram_lab?schema=public' } } })
const rollback = new Error('ROLLBACK_SYNTHETIC_UNSEND'); const fixtureId = 'unsend-' + randomUUID();
let sends = 0;
try {
 await assert.rejects(db.$transaction(async tx => {
 const account=await tx.instagramAccount.create({data:{id:fixtureId,tenantId:'instagram-other',instagramId:'991'+Date.now(),username:'__synthetic_unsend__',mode:'meta',accessToken:'fixture-only'}});
 const config=new InstagramConfig(new ConfigService({NODE_ENV:'test',INSTAGRAM_ENABLED:'true',INSTAGRAM_MODE:'meta',INSTAGRAM_PILOT_TENANT_IDS:'instagram-other,instagram-review',INSTAGRAM_APP_SECRET:'synthetic-secret'}));
 const models={instagramAccount:tx.instagramAccount,instagramConversation:tx.instagramConversation,instagramMessage:tx.instagramMessage,$transaction:fn=>fn(tx)};
 const service=new InstagramService(models,{getClient:()=>({get:async()=>null})},{},config,{sendText:async()=>{sends++;throw Error('Forbidden transport')}});
 const at=Date.now()-10000;
 const event=(mid,deleted=false,participant='999123',out=false)=>({sender:{id:out?account.instagramId:participant},recipient:{id:out?participant:account.instagramId},timestamp:at,message:{mid,...(deleted?{is_deleted:true}:{text:'Synthetic removable text'})}});
 const deliver=async(events,channel='messaging',signatureValid=true)=>{const body={object:'instagram',entry:[{id:account.instagramId,[channel]:events}]};const raw=Buffer.from(JSON.stringify(body));return service.webhook(raw,signatureValid?'sha256='+createHmac('sha256','synthetic-secret').update(raw).digest('hex'):undefined,body)};
 const row=mid=>tx.instagramMessage.findUniqueOrThrow({where:{accountId_providerMessageId:{accountId:account.id,providerMessageId:mid}}});
 await deliver([event('normal')]);const first=await row('normal');const conv=()=>tx.instagramConversation.findUniqueOrThrow({where:{id:first.conversationId}});const window=(await conv()).lastInboundAt.getTime();
 await deliver([event('normal',true)],'standby');assert.equal((await row('normal')).text,'');assert.equal((await row('normal')).status,'unsent');assert.equal((await conv()).lastInboundAt.getTime(),window);
 const version=(await conv()).updatedAt.getTime();await deliver([event('normal',true)]);assert.equal((await conv()).updatedAt.getTime(),version);
 await deliver([event('normal')]);assert.equal((await row('normal')).text,'');
 await service.persistIncoming(account,{accountId:account.instagramId,participantId:'999123',messageId:'normal',text:'History must not restore this',at:new Date(at)});assert.equal((await row('normal')).text,'');
 await deliver([event('before',true)]);await deliver([event('before')]);assert.equal((await row('before')).status,'unsent');assert.equal((await row('before')).text,'');
 await deliver([event('batch'),event('batch',true)]);assert.equal((await row('batch')).text,'');
 await deliver([event('normal',true,'888222')]);assert.equal((await row('normal')).conversationId,first.conversationId);
 await assert.rejects(deliver([event('unsigned',true)],'messaging',false));assert.equal(await tx.instagramMessage.count({where:{accountId:account.id,providerMessageId:'unsigned'}}),0);
 const outgoing=await tx.instagramMessage.create({data:{tenantId:account.tenantId,accountId:account.id,conversationId:first.conversationId,direction:'out',text:'Synthetic outgoing',providerMessageId:'outgoing',status:'sent'}});
 await deliver([event('outgoing',true,'999123',true)]);assert.equal((await row('outgoing')).text,'');assert.equal((await row('outgoing')).status,'unsent');
 await deliver([event('operator')]);const operatorMessage=await row('operator');
 await assert.rejects(service.deleteMessage('instagram-review',operatorMessage.id));assert.equal((await row('operator')).text,'Synthetic removable text');
 const replyWindowBefore=(await conv()).lastInboundAt.getTime();
 assert.deepEqual(await service.deleteMessage(account.tenantId,operatorMessage.id),{deleted:true});
 assert.equal((await row('operator')).text,'');assert.equal((await row('operator')).status,'deleted');
 assert.deepEqual(await service.deleteMessage(account.tenantId,operatorMessage.id),{deleted:true});
 await deliver([event('operator')]);await deliver([event('operator',true)]);
 await service.persistIncoming(account,{accountId:account.instagramId,participantId:'999123',messageId:'operator',text:'History must not restore an operator deletion',at:new Date(at)});
 assert.equal((await row('operator')).text,'');assert.equal((await row('operator')).status,'deleted');
 assert.equal((await conv()).lastInboundAt.getTime(),replyWindowBefore);
 for(const status of ['pending','sending','unknown']){
  const uncertain=await tx.instagramMessage.create({data:{tenantId:account.tenantId,accountId:account.id,conversationId:first.conversationId,direction:'out',text:'Synthetic unconfirmed attempt',status}});
  await assert.rejects(service.deleteMessage(account.tenantId,uncertain.id));
  assert.equal((await tx.instagramMessage.findUniqueOrThrow({where:{id:uncertain.id}})).text,'Synthetic unconfirmed attempt');
 }
 assert.equal(sends,0);throw rollback;
 },{timeout:15000}),e=>e===rollback);
 assert.equal(await db.instagramAccount.count({where:{id:fixtureId}}),0);
 console.log('PostgreSQL unsend/operator deletion verified: content erased; cancellation-first, batch, replay/history, passive events, outgoing, tenant/participant isolation, invalid signatures, unchanged reply window, idempotence, uncertain-send preservation; full rollback; zero Meta calls.');
} finally {await db.$disconnect()}
