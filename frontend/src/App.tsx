import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Monthly from './pages/Monthly'
import Assets from './pages/Assets'
import Goals from './pages/Goals'

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/"        element={<Dashboard />} />
          <Route path="/monthly" element={<Monthly />} />
          <Route path="/assets"  element={<Assets />} />
          <Route path="/goals"   element={<Goals />} />
          <Route path="*"        element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
