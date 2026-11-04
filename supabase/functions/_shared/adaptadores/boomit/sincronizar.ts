// Sincronização Boomit → Copiloto (roda com service role, só no conector).
// FonteBoomit → boomit_snapshot (imutável, por hash) → normalizador → colaborador + contexto_*.
// Idempotente: rodar de novo com o mesmo payload não cria snapshots nem linhas novas.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '../../tipos/banco.ts'
import type { FonteBoomit } from './fonte.ts'
import { normalizarColaborador, normalizarEmpresa } from './normalizador.ts'
import { mapaDeSinonimos, type Sinonimo } from './sinonimos.ts'

type Db = SupabaseClient<Database>
type Fonte = Database['public']['Enums']['fonte_snapshot']

export interface ResumoSincronizacao {
  execucao_id: string
  empresa_id: string
  status: 'sucesso' | 'parcial' | 'erro'
  registros_lidos: number
  snapshots_novos: number
  alertas: number
  erros: string[]
}

/** JSON com chaves ordenadas: o mesmo conteúdo sempre gera o mesmo hash. */
export function jsonCanonico(valor: unknown): string {
  if (Array.isArray(valor)) return `[${valor.map(jsonCanonico).join(',')}]`
  if (valor && typeof valor === 'object') {
    const pares = Object.entries(valor as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return `{${pares.map(([k, v]) => `${JSON.stringify(k)}:${jsonCanonico(v)}`).join(',')}}`
  }
  return JSON.stringify(valor)
}

export async function hashSha256(texto: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto))
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function falhou(erro: { message: string } | null, contexto: string): void {
  if (erro) throw new Error(`${contexto}: ${erro.message}`)
}

const comoJson = (v: unknown) => v as Json

async function gravarSnapshot(
  db: Db,
  p: { empresa_id: string; execucao_id: string; entidade: 'empresa' | 'colaborador'; entidade_id: string; schema_version: string; fonte: Fonte; payload: unknown },
): Promise<{ id: string; novo: boolean }> {
  const hash = await hashSha256(jsonCanonico(p.payload))
  const chave = { empresa_id: p.empresa_id, entidade: p.entidade, entidade_id: p.entidade_id, hash }
  const existente = await db.from('boomit_snapshot').select('id').match(chave).maybeSingle()
  falhou(existente.error, 'ler snapshot')
  if (existente.data) return { id: existente.data.id, novo: false }
  const novo = await db
    .from('boomit_snapshot')
    .insert({ ...chave, execucao_id: p.execucao_id, schema_version: p.schema_version, fonte: p.fonte, payload: comoJson(p.payload) })
    .select('id')
    .single()
  falhou(novo.error, 'gravar snapshot')
  return { id: novo.data!.id, novo: true }
}

export async function sincronizar(db: Db, fonte: FonteBoomit): Promise<ResumoSincronizacao> {
  const payload = await fonte.buscar({})
  const origem: Fonte = fonte.nome === 'mock' ? 'mock' : 'api'
  const agora = () => new Date().toISOString()

  // Empresa: localizada pelo id Boomit; no modo mock é criada na primeira execução.
  const achada = await db.from('empresa').select('id').eq('boomit_empresa_id', payload.empresa.id).maybeSingle()
  falhou(achada.error, 'ler empresa')
  let empresaId = achada.data?.id
  if (!empresaId) {
    if (origem !== 'mock') throw new Error(`Empresa Boomit ${payload.empresa.id} não cadastrada no Copiloto`)
    const criada = await db.from('empresa').insert({ boomit_empresa_id: payload.empresa.id, nome: payload.empresa.nome_fantasia }).select('id').single()
    falhou(criada.error, 'criar empresa')
    empresaId = criada.data!.id
  }

  const exec = await db.from('conector_execucao').insert({ empresa_id: empresaId, fonte: origem }).select('id').single()
  falhou(exec.error, 'abrir execução')
  const execucaoId = exec.data!.id

  const alertas: { entidade: string; id: string; alerta: string }[] = []
  const erros: string[] = []
  let snapshotsNovos = 0
  let lidos = 0

  try {
    const sin = await db.from('competencia_sinonimo').select('chave_normalizada, competencia_canonica, categoria')
    falhou(sin.error, 'ler sinônimos')
    const sinonimos = mapaDeSinonimos((sin.data ?? []) as Sinonimo[])
    const base = { empresa_id: empresaId, execucao_id: execucaoId, schema_version: payload.schema_version, fonte: origem }

    // Empresa
    const snapEmpresa = await gravarSnapshot(db, { ...base, entidade: 'empresa', entidade_id: payload.empresa.id, payload: payload.empresa })
    if (snapEmpresa.novo) snapshotsNovos++
    const empresaNorm = normalizarEmpresa(payload.empresa)
    for (const a of empresaNorm.alertas) alertas.push({ entidade: 'empresa', id: payload.empresa.id, alerta: a })
    const ctxEmp = await db.from('contexto_empresa').upsert({
      empresa_id: empresaId,
      snapshot_id: snapEmpresa.id,
      dados: comoJson(empresaNorm.contexto),
      alertas_qualidade: empresaNorm.alertas,
      atualizado_em: agora(),
    })
    falhou(ctxEmp.error, 'gravar contexto_empresa')

    // Colaboradores: um erro em uma pessoa não derruba as outras (R9).
    for (const bruto of payload.colaboradores) {
      lidos++
      try {
        const snap = await gravarSnapshot(db, { ...base, entidade: 'colaborador', entidade_id: bruto.id, payload: bruto })
        if (snap.novo) snapshotsNovos++
        const norm = normalizarColaborador(bruto, sinonimos)
        for (const a of norm.alertas) alertas.push({ entidade: 'colaborador', id: bruto.id, alerta: a })

        const col = await db
          .from('colaborador')
          .upsert({ empresa_id: empresaId, ...norm.colaborador, atualizado_em: agora() }, { onConflict: 'empresa_id,boomit_colaborador_id' })
          .select('id')
          .single()
        falhou(col.error, `gravar colaborador ${bruto.email}`)
        const colaboradorId = col.data!.id

        const ctx = await db.from('contexto_colaborador').upsert({
          colaborador_id: colaboradorId,
          empresa_id: empresaId,
          snapshot_id: snap.id,
          dados: comoJson(norm.contexto),
          alertas_qualidade: norm.alertas,
          atualizado_em: agora(),
        })
        falhou(ctx.error, `gravar contexto de ${bruto.email}`)

        if (norm.sensivel) {
          const sens = await db.from('contexto_colaborador_sensivel').upsert({
            colaborador_id: colaboradorId,
            empresa_id: empresaId,
            snapshot_id: snap.id,
            dados: comoJson(norm.sensivel),
            atualizado_em: agora(),
          })
          falhou(sens.error, `gravar indicadores sensíveis de ${bruto.email}`)
        } else {
          const apagar = await db.from('contexto_colaborador_sensivel').delete().eq('colaborador_id', colaboradorId)
          falhou(apagar.error, `limpar indicadores sensíveis de ${bruto.email}`)
        }
      } catch (erro) {
        erros.push(erro instanceof Error ? erro.message : String(erro))
      }
    }
  } catch (erro) {
    erros.push(erro instanceof Error ? erro.message : String(erro))
  }

  const status: ResumoSincronizacao['status'] = erros.length === 0 ? 'sucesso' : lidos > erros.length ? 'parcial' : 'erro'
  const fim = await db
    .from('conector_execucao')
    .update({ finalizado_em: agora(), status, registros_lidos: lidos, alertas: comoJson(alertas), erro: erros.length ? erros.join(' | ').slice(0, 2000) : null })
    .eq('id', execucaoId)
  falhou(fim.error, 'fechar execução')

  return { execucao_id: execucaoId, empresa_id: empresaId, status, registros_lidos: lidos, snapshots_novos: snapshotsNovos, alertas: alertas.length, erros }
}
