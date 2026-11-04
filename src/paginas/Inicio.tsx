import { useSessao } from '@/auth/sessao'
import { MinhaEquipe } from './MinhaEquipe'
import { PainelAdmin } from './PainelAdmin'

// Visão geral: o conteúdo muda conforme o papel na empresa.
export function Inicio() {
  const { vinculo, nome } = useSessao()
  if (!vinculo) {
    return <p className="text-muted-foreground">Seu usuário ainda não está vinculado a uma empresa. Fale com o RH.</p>
  }
  if (vinculo.papel === 'admin_empresa' || vinculo.papel === 'admin_boomit') return <PainelAdmin vinculo={vinculo} />
  return <MinhaEquipe vinculo={vinculo} nome={nome} />
}
