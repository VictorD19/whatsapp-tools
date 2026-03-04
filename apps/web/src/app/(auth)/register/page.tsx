'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MessageSquare, Eye, EyeOff, Loader2, Zap, Users, BarChart3 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiPost } from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'
import { toast } from '@/components/ui/toaster'

const registerSchema = z.object({
  tenantName: z.string().min(2, 'Minimo 2 caracteres'),
  name: z.string().min(2, 'Minimo 2 caracteres'),
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'Minimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'As senhas nao conferem',
  path: ['confirmPassword'],
})

type RegisterFormData = z.infer<typeof registerSchema>

interface RegisterResponse {
  data: {
    accessToken: string
    user: {
      id: string
      name: string
      email: string
      role: string
      isSuperAdmin: boolean
      tenant: { id: string; name: string; slug: string; plan: string }
    }
  }
}

const features = [
  { icon: Zap, text: 'Configure em menos de 5 minutos' },
  { icon: Users, text: 'Equipe ilimitada no plano Pro' },
  { icon: BarChart3, text: 'Relatorios e metricas em tempo real' },
]

export default function RegisterPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  async function onSubmit(data: RegisterFormData) {
    try {
      const res = await apiPost<RegisterResponse>('auth/register', {
        tenantName: data.tenantName,
        name: data.name,
        email: data.email,
        password: data.password,
      })
      const { accessToken, user } = res.data
      setAuth(
        {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as 'admin' | 'agent' | 'viewer',
          tenantId: user.tenant.id,
          isSuperAdmin: user.isSuperAdmin,
        },
        accessToken,
      )
      router.push('/inbox')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar conta'
      toast({ title: 'Erro', description: message, variant: 'destructive' })
      setError('root', { message })
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-zinc-950 overflow-hidden px-6 py-12">
      {/* Glows globais */}
      <div className="pointer-events-none absolute -top-48 -left-48 h-[600px] w-[600px] rounded-full bg-primary/10 blur-[140px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-primary/10 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[160px]" />

      <div className="relative z-10 flex w-full max-w-5xl items-center gap-16 lg:gap-24">

        {/* -- Branding -- */}
        <div className="hidden lg:flex flex-1 flex-col space-y-10">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-lg shadow-primary/30">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
            <span className="text-[14px] font-semibold text-white tracking-tight">WhatsApp Tools</span>
          </div>

          {/* Copy */}
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-500 animate-pulse" />
              <span className="text-[11px] font-medium text-primary-400 tracking-wide uppercase">Gratuito para comecar</span>
            </div>
            <h2 className="text-[38px] font-bold leading-[1.1] text-white">
              Comece a vender<br />
              <span className="text-primary-400">hoje mesmo</span>
            </h2>
            <p className="text-[14px] leading-relaxed text-zinc-400 max-w-[380px]">
              Crie sua conta em segundos e conecte seu WhatsApp. Sem cartao de credito.
            </p>
          </div>

          {/* Features */}
          <ul className="space-y-3">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/12 border border-primary/20">
                  <Icon className="h-3.5 w-3.5 text-primary-400" />
                </div>
                <span className="text-[13px] text-zinc-300">{text}</span>
              </li>
            ))}
          </ul>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 max-w-[380px]">
            {[
              { value: '10k+', label: 'Mensagens/dia' },
              { value: '98%', label: 'Uptime' },
              { value: '4.9', label: 'Avaliacao' },
            ].map(({ value, label }) => (
              <div key={label} className="rounded-xl border border-white/6 bg-white/4 p-3 text-center">
                <p className="text-[18px] font-bold text-white">{value}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* -- Card do formulario -- */}
        <div className="w-full lg:w-[360px] shrink-0">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <MessageSquare className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-[13px] font-semibold text-white">WhatsApp Tools</span>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/5 p-8 shadow-2xl shadow-black/50 backdrop-blur-md">
            <div className="mb-6">
              <h1 className="text-[20px] font-bold tracking-tight text-white">Criar sua conta</h1>
              <p className="mt-1 text-[12.5px] text-zinc-400">Preencha seus dados para comecar</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
              <div className="space-y-1.5">
                <label htmlFor="tenantName" className="block text-[12px] font-medium text-zinc-300">Nome da empresa</label>
                <input
                  id="tenantName"
                  placeholder="Minha Empresa LTDA"
                  autoComplete="organization"
                  className="w-full h-9 rounded-lg border border-white/10 bg-white/6 px-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
                  {...register('tenantName')}
                />
                {errors.tenantName && <p className="text-[11px] text-red-400">{errors.tenantName.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="name" className="block text-[12px] font-medium text-zinc-300">Seu nome</label>
                <input
                  id="name"
                  placeholder="Joao Silva"
                  autoComplete="name"
                  className="w-full h-9 rounded-lg border border-white/10 bg-white/6 px-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
                  {...register('name')}
                />
                {errors.name && <p className="text-[11px] text-red-400">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-[12px] font-medium text-zinc-300">Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="voce@empresa.com"
                  autoComplete="email"
                  className="w-full h-9 rounded-lg border border-white/10 bg-white/6 px-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
                  {...register('email')}
                />
                {errors.email && <p className="text-[11px] text-red-400">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-[12px] font-medium text-zinc-300">Senha</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimo 6 caracteres"
                    autoComplete="new-password"
                    className="w-full h-9 rounded-lg border border-white/10 bg-white/6 px-3 pr-9 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
                    {...register('password')}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {errors.password && <p className="text-[11px] text-red-400">{errors.password.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirmPassword" className="block text-[12px] font-medium text-zinc-300">Confirmar senha</label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Repita a senha"
                    autoComplete="new-password"
                    className="w-full h-9 rounded-lg border border-white/10 bg-white/6 px-3 pr-9 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
                    {...register('confirmPassword')}
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
                    {showConfirm ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-[11px] text-red-400">{errors.confirmPassword.message}</p>}
              </div>

              {errors.root && (
                <div className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-[12px] text-red-400">
                  {errors.root.message}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-9 rounded-lg bg-primary text-[13px] font-medium text-white shadow-lg shadow-primary/25 hover:bg-primary-500 active:bg-primary-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-0.5"
              >
                {isSubmitting ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" />Criando conta...</>
                ) : 'Criar conta gratis'}
              </button>

              <p className="text-center text-[11px] text-zinc-600 pt-0.5">
                Ao criar conta voce concorda com os{' '}
                <Link href="/terms" className="text-zinc-400 underline underline-offset-2 hover:text-white transition-colors">Termos</Link>
                {' '}e{' '}
                <Link href="/privacy" className="text-zinc-400 underline underline-offset-2 hover:text-white transition-colors">Privacidade</Link>
              </p>
            </form>

            <p className="mt-5 text-center text-[12px] text-zinc-500">
              Ja tem uma conta?{' '}
              <Link href="/login" className="font-medium text-primary-400 hover:text-primary-300 transition-colors">
                Entrar
              </Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
