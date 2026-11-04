import { BrowserRouter, Route, Routes } from 'react-router'
import { useSessao } from '@/auth/sessao'
import { SessaoProvider } from '@/auth/SessaoProvider'
import { Layout } from '@/components/layout/Layout'
import { SECOES } from '@/config/navegacao'
import { Entrar } from '@/paginas/Entrar'
import { FichaColaborador } from '@/paginas/FichaColaborador'
import { Inicio } from '@/paginas/Inicio'
import { Combinados } from '@/paginas/Combinados'
import { Preparar } from '@/paginas/Preparar'
import { Registrar } from '@/paginas/Registrar'
import { Secao } from '@/paginas/Secao'
import { Simular } from '@/paginas/Simular'
import { Situacao } from '@/paginas/Situacao'

function Rotas() {
  const { carregando, sessao } = useSessao()
  if (carregando) return <p className="p-8 text-sm text-muted-foreground">Carregando…</p>
  if (!sessao) return <Entrar />
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Inicio />} />
        <Route path="pessoas/:id" element={<FichaColaborador />} />
        <Route path="preparar" element={<Preparar />} />
        <Route path="situacoes/:id" element={<Situacao />} />
        <Route path="simular/:id" element={<Simular />} />
        <Route path="combinados" element={<Combinados />} />
        <Route path="registrar" element={<Registrar />} />
        {SECOES.filter((s) => s.caminho !== '/').map((secao) => (
          <Route key={secao.caminho} path={secao.caminho.slice(1)} element={<Secao secao={secao} />} />
        ))}
        <Route path="*" element={<Inicio />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <SessaoProvider>
        <Rotas />
      </SessaoProvider>
    </BrowserRouter>
  )
}
