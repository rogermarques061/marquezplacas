import { Route, Routes } from 'react-router-dom'
import Formulario from './pages/Formulario'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Formulario />} />
      <Route path="*" element={<Formulario />} />
    </Routes>
  )
}
