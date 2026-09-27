import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Carregando } from './components/ui'
import { AuthProvider } from './lib/auth'
import { modoDemo } from './lib/supabase'
import Formulario from './pages/Formulario'

// Painel carrega sob demanda: o formulário público fica leve para o comprador.
const Login = lazy(() => import('./pages/Login'))
const LayoutPainel = lazy(() => import('./pages/painel/Layout'))
const Dashboard = lazy(() => import('./pages/painel/Dashboard'))
const Vendas = lazy(() => import('./pages/painel/Vendas'))
const VendaEditor = lazy(() => import('./pages/painel/VendaEditor'))

export default function App() {
  return (
    <AuthProvider>
      {modoDemo && <BarraDemo />}
      <Suspense fallback={<Carregando />}>
      <Routes>
        <Route path="/" element={<Formulario />} />
        <Route path="/login" element={<Login />} />
        <Route path="/painel" element={<LayoutPainel />}>
          <Route index element={<Dashboard />} />
          <Route path="vendas" element={<Vendas />} />
          <Route path="vendas/nova" element={<VendaEditor key="nova" />} />
          <Route path="vendas/:id" element={<VendaEditor />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </AuthProvider>
  )
}

/** Só no modo demonstração: alterna entre a visão do comprador e a do vendedor. */
function BarraDemo() {
  const navigate = useNavigate()
  const noPainel = useLocation().pathname !== '/'
  const aba = (ativo: boolean) =>
    `rounded-md px-2.5 py-1 font-medium ${ativo ? 'bg-amber-300 text-black' : 'text-amber-200'}`
  return (
    <div className="flex items-center justify-center gap-2 border-b border-amber-400/20 bg-amber-400/10 px-4 py-1.5 text-xs">
      <span className="text-amber-300/80">Demo:</span>
      <button type="button" className={aba(!noPainel)} onClick={() => navigate('/')}>
        Comprador (formulário)
      </button>
      <button type="button" className={aba(noPainel)} onClick={() => navigate('/painel')}>
        Vendedor (painel)
      </button>
    </div>
  )
}
