import { z } from 'zod'

export const changePasswordSchema = z.object({
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
})

export type ChangePasswordDto = z.infer<typeof changePasswordSchema>
