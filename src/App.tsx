import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { Carregando } from './components/ui'
import { AuthProvider, useAuth } from './lib/auth'
import Formulario from './pages/Formulario'

// Painel carrega sob demanda: o formulário público fica leve para o comprador.
const Login = lazy(() => import('./pages/Login'))
const LayoutPainel = lazy(() => import('./pages/painel/Layout'))
const Dashboard = lazy(() => import('./pages/painel/Dashboard'))
const Vendas = lazy(() => import('./pages/painel/Vendas'))
const VendaEditor = lazy(() => import('./pages/painel/VendaEditor'))
const Leads = lazy(() => import('./pages/painel/Leads'))
const Ajustes = lazy(() => import('./pages/painel/Ajustes'))
const DefinirSenha = lazy(() => import('./pages/DefinirSenha'))

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<Carregando />}>
        <Routes>
          {/* Endereço principal abre o painel (ou o login) */}
          <Route path="/" element={<Navigate to="/painel" replace />} />
          {/* Link público, para mandar ao cliente */}
          <Route path="/formulario" element={<Formulario />} />
          <Route path="/login" element={<Login />} />
          <Route path="/definir-senha" element={<DefinirSenha />} />
          {/* "Gerar formulário": tela cheia no celular do vendedor */}
          <Route path="/painel/formulario" element={<FormularioAtendimento />} />
          <Route path="/painel" element={<LayoutPainel />}>
            <Route index element={<Dashboard />} />
            <Route path="vendas" element={<Vendas />} />
            <Route path="vendas/nova" element={<VendaEditor key="nova" />} />
            <Route path="vendas/:id" element={<VendaEditor />} />
            <Route path="leads" element={<Leads />} />
            <Route path="ajustes" element={<Ajustes />} />
          </Route>
          <Route path="*" element={<Navigate to="/painel" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  )
}

function FormularioAtendimento() {
  const { perfil, carregando } = useAuth()
  const navigate = useNavigate()
  if (carregando) return <Carregando />
  if (!perfil) return <Navigate to="/login" replace />
  return (
    <Formulario
      modo="atendimento"
      aoSair={() => navigate('/painel/vendas')}
      aoConferir={(id) => navigate(`/painel/vendas/${id}`)}
    />
  )
}
