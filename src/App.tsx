import { BrowserRouter, Route, Routes } from 'react-router'
import { Layout } from '@/components/layout/Layout'
import { SECOES } from '@/config/navegacao'
import { Secao } from '@/paginas/Secao'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          {SECOES.map((secao) =>
            secao.caminho === '/' ? (
              <Route key="inicio" index element={<Secao secao={secao} />} />
            ) : (
              <Route key={secao.caminho} path={secao.caminho.slice(1)} element={<Secao secao={secao} />} />
            ),
          )}
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
