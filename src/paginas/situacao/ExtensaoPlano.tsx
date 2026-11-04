// Campos específicos de cada tipo de preparação (Sprint 3): PDI, conversa difícil,
// decisão na alçada e 1:1. O plano base (fatos, hipóteses, abordagem…) é comum a todos.
import type { ReactNode } from 'react'
import { Cartao } from '@/components/Estado'
import { Badge } from '@/components/ui/badge'
import type { Extensao } from '@/dominio/preparacao'
import { cn } from '@/lib/utils'

const ALCADA = {
  sim: { rotulo: 'Dentro da sua alçada', cor: 'bg-boomit-verde text-boomit-claro' },
  nao: { rotulo: 'Fora da sua alçada', cor: 'bg-destructive text-white' },
  incerto: { rotulo: 'Alçada incerta: confirme antes de decidir', cor: 'bg-boomit-taupe text-boomit-claro' },
} as const

export function ExtensaoPlano({ extensao, chips }: { extensao: Extensao; chips: (ids: string[]) => ReactNode }) {
  switch (extensao.tipo) {
    case 'pdi':
      return (
        <Cartao titulo="Ações de desenvolvimento propostas">
          <p className="mb-2 text-xs text-muted-foreground">Para construir com a pessoa na conversa. Viram ações registradas quando você registra a conversa.</p>
          <ul className="space-y-2 text-sm">
            {extensao.acoes_desenvolvimento.map((a) => (
              <li key={a.acao} className="rounded border p-3">
                <p className="font-medium">
                  {a.competencia}: {a.acao}
                  {a.fonte_ids.length > 0 && chips(a.fonte_ids)}
                </p>
                <p className="text-muted-foreground">
                  Apoio: {a.apoio} · prazo {a.prazo_dias} dias · evidência: {a.evidencia}
                </p>
              </li>
            ))}
          </ul>
        </Cartao>
      )
    case 'conversa_dificil':
      return (
        <Cartao titulo="Interesses e pontos de acordo">
          <div className="grid gap-3 sm:grid-cols-2">
            {extensao.interesses_de_cada_parte.map((p) => (
              <div key={p.parte} className="rounded border p-3 text-sm">
                <p className="font-medium">{p.parte}</p>
                <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                  {p.interesses.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Interesses são hipóteses: confirme com cada parte.</p>
          {extensao.pontos_de_acordo_possiveis.length > 0 && (
            <>
              <p className="mt-3 text-sm font-medium">Pontos de acordo possíveis</p>
              <ul className="list-disc pl-5 text-sm">
                {extensao.pontos_de_acordo_possiveis.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </>
          )}
        </Cartao>
      )
    case 'decisao_alcada': {
      const a = ALCADA[extensao.dentro_da_alcada]
      return (
        <Cartao titulo="Decisão na alçada">
          <p className="text-sm">
            <Badge className={a.cor}>{a.rotulo}</Badge>
            {extensao.alcada_fonte_ids.length > 0 && chips(extensao.alcada_fonte_ids)}
          </p>
          <p className="mt-2 text-sm">{extensao.justificativa_alcada}</p>
          {extensao.quem_consultar && (
            <p className="mt-1 text-sm">
              <span className="font-medium">Quem consultar:</span> {extensao.quem_consultar}
            </p>
          )}
          <p className="mt-4 text-sm font-medium">Alternativas</p>
          <p className="mb-2 text-xs text-muted-foreground">O Copiloto organiza as opções; a decisão é sua (ou de quem a alçada indicar).</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {extensao.alternativas.map((alt) => (
              <div key={alt.opcao} className="rounded border p-3 text-sm">
                <p className="font-medium">{alt.opcao}</p>
                <p className="mt-1 text-xs text-muted-foreground">Prós: {alt.pros.join('; ') || '—'}</p>
                <p className="text-xs text-muted-foreground">Contras: {alt.contras.join('; ') || '—'}</p>
              </div>
            ))}
          </div>
          {extensao.como_comunicar && (
            <p className="mt-3 text-sm">
              <span className="font-medium">Como comunicar:</span> {extensao.como_comunicar}
            </p>
          )}
        </Cartao>
      )
    }
    case 'preparacao_reuniao': {
      const total = extensao.pauta.reduce((s, p) => s + p.minutos, 0)
      return (
        <Cartao titulo={`Pauta do 1:1 · ${total} min`}>
          <ol className="space-y-2 text-sm">
            {extensao.pauta.map((p, i) => (
              <li key={p.tema} className={cn('flex gap-3', i > 0 && 'border-t pt-2')}>
                <span className="w-14 shrink-0 text-muted-foreground">{p.minutos} min</span>
                <span>
                  <span className="font-medium">{p.tema}</span>
                  <span className="block text-muted-foreground">{p.objetivo}</span>
                </span>
              </li>
            ))}
          </ol>
          {extensao.perguntas_de_desenvolvimento.length > 0 && (
            <>
              <p className="mt-4 text-sm font-medium">Perguntas de desenvolvimento</p>
              <ul className="list-disc pl-5 text-sm">
                {extensao.perguntas_de_desenvolvimento.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </>
          )}
        </Cartao>
      )
    }
  }
}
