import { LinkButton } from '@/components/ui'

export default function NotFound() {
  return (
    <div className="py-6">
      <h1 className="text-2xl font-bold [font-stretch:112%]">Página não encontrada</h1>
      <p className="mt-2 text-tinta-suave">
        O endereço não existe ou o registro foi digitado errado. Confira o número informado.
      </p>
      <LinkButton href="/" variant="primary" className="mt-5">
        Ir para o painel
      </LinkButton>
    </div>
  )
}
