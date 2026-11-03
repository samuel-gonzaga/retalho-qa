'use client'

import { Button } from '@/components/ui'

/** RNF-08: diz o que não carregou e oferece tentar de novo. */
export default function LoadError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="border-l-4 border-carmim bg-papel px-5 py-6">
      <h1 className="text-lg font-semibold">Não foi possível carregar esta tela.</h1>
      <p className="mt-1 text-tinta-suave">Verifique a conexão e tente de novo.</p>
      <Button variant="primary" className="mt-4" onClick={reset}>
        Tentar de novo
      </Button>
    </div>
  )
}
