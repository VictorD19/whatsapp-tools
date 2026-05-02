import Link from 'next/link'

export function AuthFooter() {
  return (
    <footer className="absolute bottom-0 left-0 right-0 z-10 pb-6">
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-4">
          <Link
            href="/privacy"
            className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Política de Privacidade
          </Link>
          <span className="h-3 w-px bg-zinc-800" />
          <Link
            href="/terms"
            className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Termos de Uso
          </Link>
        </div>
        <p className="text-[10px] text-zinc-700">
          &copy; {new Date().getFullYear()} SistemaZapChat. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  )
}
