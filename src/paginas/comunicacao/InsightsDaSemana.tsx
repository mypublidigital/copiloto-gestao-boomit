// Cartão dos insights da semana: resumo, recomendações ativas dos agentes e a pergunta de reflexão.
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { z } from 'zod'
import { Cartao } from '@/components/Estado'
import { formatarData } from '@/lib/datas'
import { supabase } from '@/lib/supabase'
import { useConsulta } from '@/lib/useConsulta'
import { cn } from '@/lib/utils'

const insightsSchema = z.object({
  resumo_da_semana: z.string(),
  destaques: z.array(z.object({ texto: z.string() })).default([]),
  recomendacoes: z.array(z.object({ titulo: z.string(), acao: z.string(), por_que: z.string(), prioridade: z.enum(['alta', 'media', 'baixa']), prazo_sugerido_dias: z.number(), link: z.string().optional() })),
  pergunta_reflexao: z.string().default(''),
  sinais: z.array(z.object({ agente: z.string() })).default([]),
  gerado_por: z.enum(['modelo', 'regras']).default('modelo'),
})

const COR = { alta: 'text-destructive', media: 'text-boomit-verde', baixa: 'text-boomit-taupe' } as const
const ROTULO = { alta: 'Prioridade alta', media: 'Prioridade média', baixa: 'Prioridade baixa' } as const

export function InsightsDaSemana({ recarga = 0, acoes, resumido }: { recarga?: number; acoes?: ReactNode; resumido?: boolean }) {
  const consulta = useConsulta(async () => {
    const { data, error } = await supabase.from('insight_semanal').select('semana_inicio, conteudo, gerado_em').order('semana_inicio', { ascending: false }).limit(1).maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return null
    const conteudo = insightsSchema.safeParse(data.conteudo)
    return conteudo.success ? { ...data, insights: conteudo.data } : null
  }, [recarga])

  const dados = consulta.estado === 'pronto' ? consulta.dados : null
  if (resumido && !dados) return null
  const recs = dados ? (resumido ? dados.insights.recomendacoes.slice(0, 3) : dados.insights.recomendacoes) : []

  return (
    <Cartao titulo={dados ? `Insights da semana de ${formatarData(dados.semana_inicio)}` : 'Insights da semana'}>
      {consulta.estado === 'carregando' && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {consulta.estado === 'erro' && <p className="text-sm text-destructive">{consulta.mensagem}</p>}
      {consulta.estado === 'pronto' && !dados && <p className="text-sm text-muted-foreground">Os insights saem toda segunda às 7h. Você também pode gerar os desta semana agora.</p>}
      {dados && (
        <div className="flex flex-col gap-3 text-sm">
          <p>{dados.insights.resumo_da_semana}</p>
          <ol className="flex flex-col gap-2">
            {recs.map((r) => (
              <li key={r.titulo} className="rounded-md border p-3">
                <p className={cn('text-xs font-semibold', COR[r.prioridade])}>{ROTULO[r.prioridade]} · em até {r.prazo_sugerido_dias} dia(s)</p>
                <p className="font-semibold">{r.titulo}</p>
                <p>{r.acao}</p>
                <p className="text-xs text-muted-foreground">{r.por_que}</p>
                {r.link && <Link to={r.link} className="text-xs underline">Fazer agora</Link>}
              </li>
            ))}
          </ol>
          {!resumido && dados.insights.destaques.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Destaques</p>
              <ul className="list-disc pl-5">{dados.insights.destaques.map((d) => <li key={d.texto}>{d.texto}</li>)}</ul>
            </div>
          )}
          {!resumido && dados.insights.pergunta_reflexao && <p className="rounded bg-secondary p-2"><strong>Para pensar:</strong> {dados.insights.pergunta_reflexao}</p>}
          <p className="text-xs text-muted-foreground">
            {dados.insights.sinais.length} sinal(is) levantado(s) pelos agentes · {dados.insights.gerado_por === 'modelo' ? 'redigido pela IA a partir dos sinais' : 'montado pelas regras'} · são sugestões: quem decide é você.
            {resumido && <> <Link to="/comunicacao" className="underline">Ver tudo</Link></>}
          </p>
        </div>
      )}
      {acoes && <div className="mt-3">{acoes}</div>}
    </Cartao>
  )
}
