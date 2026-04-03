import { NavLink, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { currencyApi, type Rate } from '../api/currency'

function IconDashboard() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}

function IconChart() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  )
}

function IconTarget() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  )
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function formatRate(rate: Rate) {
  return new Intl.NumberFormat('en-IL', { minimumFractionDigits: 2, maximumFractionDigits: 3 }).format(Number(rate.rate))
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const [rates, setRates] = useState<Rate[]>([])

  useEffect(() => {
    currencyApi.rates().then(setRates).catch(() => {})
  }, [])

  const usdRate = rates.find(r => r.from === 'USD')
  const eurRate = rates.find(r => r.from === 'EUR')

  const now = new Date()

  return (
    <div className="shell">
      <nav className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">Ledger</div>
          <div className="sidebar-logo-sub">
            {MONTH_NAMES[now.getMonth()]} {now.getFullYear()}
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Navigation</div>

          <NavLink to="/" end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <IconDashboard /> Dashboard
          </NavLink>

          <NavLink to="/monthly" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <IconCalendar /> Monthly
          </NavLink>

          <NavLink to="/assets" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <IconChart /> Assets
          </NavLink>

          <NavLink to="/goals" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <IconTarget /> Goals
          </NavLink>
        </div>

        {(usdRate || eurRate) && (
          <div className="sidebar-footer">
            <div style={{ fontSize: '0.6rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8, fontWeight: 600 }}>
              Exchange rates
            </div>
            <div className="sidebar-rates">
              {usdRate && (
                <div className="sidebar-rate-item">
                  <span>USD → ILS</span>
                  <span className="sidebar-rate-value">{formatRate(usdRate)}</span>
                </div>
              )}
              {eurRate && (
                <div className="sidebar-rate-item">
                  <span>EUR → ILS</span>
                  <span className="sidebar-rate-value">{formatRate(eurRate)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      <main className="main">
        <div className="page" key={location.pathname}>
          {children}
        </div>
      </main>
    </div>
  )
}
