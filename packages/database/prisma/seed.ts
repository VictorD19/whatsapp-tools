import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Tenant padrão
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      name: 'Default',
      slug: 'default',
      plan: 'pro',
      maxInstances: 10,
    },
  })

  console.log(`✅ Tenant: ${tenant.name} (${tenant.id})`)

  // Admin
  const passwordHash = await bcrypt.hash('admin123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@admin.com' },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Admin',
      email: 'admin@admin.com',
      password: passwordHash,
      role: 'admin',
    },
  })

  console.log(`✅ Admin: ${admin.email}`)
  console.log('')
  console.log('─────────────────────────────')
  console.log('  Login: admin@admin.com')
  console.log('  Senha: admin123')
  console.log('─────────────────────────────')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
