import { z } from 'zod'

export const createTenantSchema = z.object({
  name: z.string().min(1, 'Nome e obrigatorio').max(100),
  slug: z
    .string()
    .min(1, 'Slug e obrigatorio')
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug deve conter apenas letras minusculas, numeros e hifens'),
  planId: z.string().min(1, 'Plano e obrigatorio'),
  adminName: z.string().min(1, 'Nome do admin e obrigatorio').max(100),
  adminEmail: z.string().email('Email invalido'),
  adminPassword: z.string().min(6, 'Senha deve ter no minimo 6 caracteres'),
})

export type CreateTenantDto = z.infer<typeof createTenantSchema>
