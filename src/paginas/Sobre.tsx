// Sobre esta versão: o que ela é e o que falta para a produção.
import { Cartao } from '@/components/Estado'
import { modoDemo } from '@/config/ambiente'
import { PENDENCIAS_PRODUCAO } from '@/config/versao'
import { cn } from '@/lib/utils'

export function Sobre() {
  const abertas = PENDENCIAS_PRODUCAO.filter((p) => !p.concluido)
  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <header>
        <p className="text-sm text-muted-foreground">Sobre esta versão</p>
        <h1 className="text-2xl font-semibold">{modoDemo ? 'Versão de desenvolvimento para demonstração' : 'Implantação do Copiloto de Gestão'}</h1>
      </header>
      {modoDemo ? (
        <Cartao titulo="O que é esta versão">
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>Todas as funções estão ativas: equipe, frentes de gestão, preparar e ensaiar conversas, registrar, combinados, reuniões, agenda, decisões, lembretes e insights.</li>
            <li><strong>Todos os dados são fictícios</strong> (empresa Exemplo Tech, 13 pessoas, 5 personas). Nenhum dado real da EasyJur ou da Plataforma Boomit está aqui.</li>
            <li>A IA é real (Claude, da Anthropic), mas trabalha só sobre esses dados fictícios.</li>
            <li>E-mails da régua não saem: ficam na caixa de saída, em "Lembretes e insights".</li>
            <li>Roda nas contas de desenvolvimento da Leadrix, com acesso protegido por login.</li>
          </ul>
        </Cartao>
      ) : (
        <Cartao titulo="Situação">
          <p className="text-sm">{abertas.length ? `O sistema está em implantação. ${abertas.length} item(ns) abaixo ainda dependem de integração ou de definição; enquanto isso, as partes afetadas funcionam com limitações.` : 'Implantação concluída.'}</p>
        </Cartao>
      )}
      <Cartao titulo={`O que falta para a produção (${abertas.length} de ${PENDENCIAS_PRODUCAO.length})`}>
        <ul className="divide-y text-sm">
          {PENDENCIAS_PRODUCAO.map((p) => (
            <li key={p.id} className="flex flex-wrap items-start justify-between gap-2 py-2">
              <span className="min-w-0">
                <span className="font-medium">{p.titulo}</span>
                <span className="block text-xs text-muted-foreground">{p.impacto}</span>
                <span className="block text-xs text-muted-foreground">Depende de: {p.responsavel} · {p.id}</span>
              </span>
              <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs', p.concluido ? 'bg-boomit-verde text-white' : 'bg-amber-100 text-amber-900')}>{p.concluido ? 'Concluído' : 'Pendente'}</span>
            </li>
          ))}
        </ul>
      </Cartao>
    </div>
  )
}
