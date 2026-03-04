import { z } from 'zod'

export const registerSchema = z.object({
  tenantName: z.string().min(2).max(100),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6),
})

export type RegisterDto = z.infer<typeof registerSchema>
