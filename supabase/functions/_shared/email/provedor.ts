// Envio de e-mail transacional, independente de provedor (N15 ainda aberta).
// Hoje: Resend (API HTTP simples). Trocar de provedor = nova implementação de ProvedorEmail.
// Regras de segurança, nesta ordem:
//   1. sem EMAIL_API_KEY/EMAIL_REMETENTE → nada sai; o e-mail fica "aguardando_provedor" (visível no app);
//   2. destinatário de demonstração (usuário com metadata demo) → nunca recebe; se houver
//      EMAIL_DESTINO_TESTE, o e-mail vai para esse endereço com "[teste]" no assunto; senão "bloqueado_demo".
import type { Email } from './modelos.ts'

export interface ProvedorEmail {
  enviar(e: Email & { para: string; de: string }): Promise<{ id: string }>
}

export class ProvedorResend implements ProvedorEmail {
  private readonly chave: string
  constructor(chave: string) {
    this.chave = chave
  }
  async enviar(e: Email & { para: string; de: string }): Promise<{ id: string }> {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.chave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: e.de, to: [e.para], subject: e.assunto, html: e.html, text: e.texto }),
    })
    const corpo = (await r.json().catch(() => ({}))) as { id?: string; message?: string }
    if (!r.ok || !corpo.id) throw new Error(`provedor de e-mail: HTTP ${r.status} ${corpo.message ?? ''}`.trim())
    return { id: corpo.id }
  }
}

export type Destino =
  | { status: 'enviar'; para: string; assuntoPrefixo: string }
  | { status: 'aguardando_provedor' | 'bloqueado_demo'; motivo: string }

export function decidirDestino(p: { para: string; destinatarioDemo: boolean; temProvedor: boolean; destinoTeste: string | null }): Destino {
  if (!p.temProvedor) return { status: 'aguardando_provedor', motivo: 'Provedor de e-mail não configurado (EMAIL_API_KEY e EMAIL_REMETENTE).' }
  if (p.destinatarioDemo) {
    if (p.destinoTeste) return { status: 'enviar', para: p.destinoTeste, assuntoPrefixo: `[teste · para ${p.para}] ` }
    return { status: 'bloqueado_demo', motivo: 'Destinatário de demonstração: o e-mail não sai para endereços fictícios.' }
  }
  return { status: 'enviar', para: p.para, assuntoPrefixo: '' }
}

export function provedorDoAmbiente(env: (n: string) => string | undefined): { provedor: ProvedorEmail | null; de: string | null; destinoTeste: string | null } {
  const chave = env('EMAIL_API_KEY')
  const de = env('EMAIL_REMETENTE') ?? null
  return { provedor: chave && de ? new ProvedorResend(chave) : null, de, destinoTeste: env('EMAIL_DESTINO_TESTE') || null }
}
