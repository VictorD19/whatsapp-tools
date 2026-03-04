import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Default plans
  const freePlan = await prisma.plan.upsert({
    where: { slug: 'free' },
    update: {},
    create: {
      name: 'Free',
      slug: 'free',
      description: 'Plano gratuito para comecar',
      benefits: ['3 instancias', '5 usuarios', '1 assistente', '5 disparos/dia'],
      maxInstances: 3,
      maxUsers: 5,
      maxAssistants: 1,
      maxBroadcastsPerDay: 5,
      maxContactsPerBroadcast: 500,
      isDefault: true,
      isActive: true,
      sortOrder: 0,
    },
  })
  console.log(`✅ Plan: ${freePlan.name} (${freePlan.id})`)

  const proPlan = await prisma.plan.upsert({
    where: { slug: 'pro' },
    update: {},
    create: {
      name: 'Pro',
      slug: 'pro',
      description: 'Plano profissional para equipes',
      benefits: ['10 instancias', '20 usuarios', '5 assistentes', '50 disparos/dia', '2000 contatos/disparo'],
      maxInstances: 10,
      maxUsers: 20,
      maxAssistants: 5,
      maxBroadcastsPerDay: 50,
      maxContactsPerBroadcast: 2000,
      price: 97.00,
      isDefault: false,
      isActive: true,
      sortOrder: 1,
    },
  })
  console.log(`✅ Plan: ${proPlan.name} (${proPlan.id})`)

  const enterprisePlan = await prisma.plan.upsert({
    where: { slug: 'enterprise' },
    update: {},
    create: {
      name: 'Enterprise',
      slug: 'enterprise',
      description: 'Plano empresarial sem limites',
      benefits: ['Instancias ilimitadas', 'Usuarios ilimitados', 'Assistentes ilimitados', 'Disparos ilimitados'],
      maxInstances: 999,
      maxUsers: 999,
      maxAssistants: 999,
      maxBroadcastsPerDay: 999,
      maxContactsPerBroadcast: 99999,
      price: 297.00,
      isDefault: false,
      isActive: true,
      sortOrder: 2,
    },
  })
  console.log(`✅ Plan: ${enterprisePlan.name} (${enterprisePlan.id})`)

  // Tenant padrão
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      name: 'Default',
      slug: 'default',
      planId: proPlan.id,
    },
  })

  console.log(`✅ Tenant: ${tenant.name} (${tenant.id})`)

  // Admin
  const passwordHash = await bcrypt.hash('admin123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@admin.com' },
    update: { isSuperAdmin: true },
    create: {
      tenantId: tenant.id,
      name: 'Admin',
      email: 'admin@admin.com',
      password: passwordHash,
      role: 'admin',
      isSuperAdmin: true,
    },
  })

  console.log(`✅ Admin: ${admin.email}`)

  // Default pipeline with stages
  const existingPipeline = await prisma.pipeline.findFirst({
    where: { tenantId: tenant.id, isDefault: true },
  })

  if (!existingPipeline) {
    const pipeline = await prisma.pipeline.create({
      data: {
        tenantId: tenant.id,
        name: 'Pipeline Padrao',
        isDefault: true,
        stages: {
          create: [
            { name: 'Novo Lead', type: 'ACTIVE', color: '#6B7280', order: 1, isDefault: true },
            { name: 'Contatado', type: 'ACTIVE', color: '#3B82F6', order: 2, isDefault: false },
            { name: 'Qualificado', type: 'ACTIVE', color: '#8B5CF6', order: 3, isDefault: false },
            { name: 'Proposta Enviada', type: 'ACTIVE', color: '#F59E0B', order: 4, isDefault: false },
            { name: 'Negociacao', type: 'ACTIVE', color: '#F97316', order: 5, isDefault: false },
            { name: 'Convertido', type: 'WON', color: '#22C55E', order: 6, isDefault: false },
            { name: 'Perdido', type: 'LOST', color: '#EF4444', order: 7, isDefault: false },
          ],
        },
      },
    })
    console.log(`✅ Pipeline: ${pipeline.name} (${pipeline.id})`)
  } else {
    console.log(`✅ Pipeline: ${existingPipeline.name} (already exists)`)
  }

  // Default tags
  const defaultTags = [
    { name: 'VIP', color: '#22C55E' },
    { name: 'Novo Cliente', color: '#3B82F6' },
    { name: 'Indicacao', color: '#F59E0B' },
    { name: 'Recompra', color: '#F97316' },
    { name: 'Urgente', color: '#EF4444' },
    { name: 'Parceiro', color: '#8B5CF6' },
  ]

  const tagResult = await prisma.tag.createMany({
    data: defaultTags.map((t) => ({ tenantId: tenant.id, name: t.name, color: t.color })),
    skipDuplicates: true,
  })

  console.log(`✅ Tags: ${tagResult.count} created (${defaultTags.length - tagResult.count} already existed)`)

  console.log('')
  console.log('─────────────────────────────')
  console.log('  Login: admin@admin.com')
  console.log('  Senha: admin123')
  console.log('─────────────────────────────')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
