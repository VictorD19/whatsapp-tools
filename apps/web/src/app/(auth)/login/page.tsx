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

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

type LoginFormData = z.infer<typeof loginSchema>

interface LoginResponse {
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
  { icon: Zap, text: 'Disparo em massa com personalização' },
  { icon: Users, text: 'Inbox multi-atendente em tempo real' },
  { icon: BarChart3, text: 'CRM integrado com funil Kanban' },
]

export default function LoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginFormData) {
    try {
      const res = await apiPost<LoginResponse>('auth/login', data)
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
    } catch {
      setError('root', { message: 'Email ou senha incorretos' })
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-zinc-950 overflow-hidden px-6 py-12">
      {/* Glows globais */}
      <div className="pointer-events-none absolute -top-48 -left-48 h-[600px] w-[600px] rounded-full bg-primary/10 blur-[140px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-primary/10 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[160px]" />

      <div className="relative z-10 flex w-full max-w-5xl items-center gap-16 lg:gap-24">

        {/* ── Branding ── */}
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
              <span className="text-[11px] font-medium text-primary-400 tracking-wide uppercase">Plataforma completa</span>
            </div>
            <h2 className="text-[38px] font-bold leading-[1.1] text-white">
              Venda mais pelo<br />
              <span className="text-primary-400">WhatsApp</span>
            </h2>
            <p className="text-[14px] leading-relaxed text-zinc-400 max-w-[380px]">
              Gerencie conversas, dispare campanhas e feche negócios — tudo em um só lugar.
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

          {/* Testimonial */}
          <div className="rounded-xl border border-white/6 bg-white/4 p-4 backdrop-blur-sm max-w-[380px]">
            <p className="text-[13px] leading-relaxed text-zinc-400 italic">
              &quot;Triplicamos nossas vendas em 60 dias usando a plataforma para atendimento e disparos.&quot;
            </p>
            <div className="mt-3.5 flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 ring-1 ring-primary/30">
                <span className="text-[10px] font-bold text-primary-400">MO</span>
              </div>
              <div>
                <p className="text-[12px] font-medium text-white/80">Marcos Oliveira</p>
                <p className="text-[11px] text-zinc-500">CEO · VendaMais Brasil</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Card do formulário ── */}
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
              <h1 className="text-[20px] font-bold tracking-tight text-white">Bem-vindo de volta</h1>
              <p className="mt-1 text-[12.5px] text-zinc-400">Entre com sua conta para continuar</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-[12px] font-medium text-zinc-300">Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="voce@empresa.com"
                  autoComplete="email"
                  className="w-full h-9 rounded-lg border border-white/10 bg-white/6 px-3 text-sm text-gray-900 dark:text-white placeholder:text-zinc-600 outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
                  {...register('email')}
                />
                {errors.email && <p className="text-[11px] text-red-400">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-[12px] font-medium text-zinc-300">Senha</label>
                  <Link href="/forgot-password" className="text-[11px] text-zinc-500 hover:text-primary-400 transition-colors">
                    Esqueceu a senha?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full h-9 rounded-lg border border-white/10 bg-white/6 px-3 pr-9 text-sm text-gray-900 dark:text-white placeholder:text-zinc-600 outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {errors.password && <p className="text-[11px] text-red-400">{errors.password.message}</p>}
              </div>

              {errors.root && (
                <div className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-[12px] text-red-400">
                  {errors.root.message}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-9 rounded-lg bg-primary text-[13px] font-medium text-white shadow-lg shadow-primary/25 hover:bg-primary-500 active:bg-primary-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" />Entrando...</>
                ) : 'Entrar'}
              </button>
            </form>

            <p className="mt-5 text-center text-[12px] text-zinc-500">
              Não tem uma conta?{' '}
              <Link href="/register" className="font-medium text-primary-400 hover:text-primary-300 transition-colors">
                Criar conta grátis
              </Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
