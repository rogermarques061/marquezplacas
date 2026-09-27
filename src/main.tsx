import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import { faltaConfiguracao, modoDemo } from './lib/supabase'
import ConfiguracaoFaltando from './pages/ConfiguracaoFaltando'

// No modo demonstração a navegação fica em memória (funciona dentro de qualquer página).
// A demonstração abre direto no dashboard.
function Router({ children }: { children: ReactNode }) {
  return modoDemo ? <MemoryRouter initialEntries={['/painel']}>{children}</MemoryRouter> : <BrowserRouter>{children}</BrowserRouter>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {faltaConfiguracao ? (
      <ConfiguracaoFaltando />
    ) : (
      <Router>
        <App />
      </Router>
    )}
  </StrictMode>,
)
