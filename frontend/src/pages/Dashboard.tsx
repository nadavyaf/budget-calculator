import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { snapshotsApi, type SnapshotDetail, type Snapshot } from '../api/snapshots'
import { assetsApi, type AssetTotals } from '../api/assets'
import { goalsApi, type Goal } from '../api/goals'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function fmt(n: number | null | undefined) {
  if (n == null || !isFinite(n)) return '0'
  return new Intl.NumberFormat('en-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
}

function fmtSigned(n: number) {
  return `${n >= 0 ? '+' : ''}${fmt(n)}`
}

function StatusBadge({ status }: { status: Goal['status'] }) {
  const map: Record<Goal['status'], string> = {
    DRAFT: 'badge-draft', ACTIVE: 'badge-active', PAUSED: 'badge-paused', COMPLETED: 'badge-completed',
  }
  return (
    <span className={`badge ${map[status]}`}>
      <span className="badge-dot" />
      {status.toLowerCase()}
    </span>
  )
}

export default function Dashboard() {
  const [snapshot, setSnapshot] = useState<SnapshotDetail | null>(null)
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [totals, setTotals] = useState<AssetTotals | null>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      snapshotsApi.list(),
      assetsApi.totals(),
      goalsApi.list(),
    ]).then(async ([snaps, assetTotals, goalList]) => {
      setSnapshots(snaps)
      setTotals(assetTotals)
      setGoals(goalList.slice(0, 4))

      // Prefer current month's snapshot (draft is fine — user is actively editing it)
      const now = new Date()
      const latest =
        snaps.find(s => s.year === now.getFullYear() && s.month === now.getMonth() + 1) ??
        snaps[0]
      if (latest) {
        const detail = await snapshotsApi.get(latest.id)
        setSnapshot(detail)
      }
    }).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div className="page-eyebrow">Overview</div>
          <div className="page-title">Dashboard</div>
          <div className="page-divider" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[260, 120, 120, 120].map((h, i) => (
            <div key={i} className="skeleton" style={{ height: h, borderRadius: 10 }} />
          ))}
        </div>
      </div>
    )
  }

  const leftover = snapshot?.leftover ?? 0
  const income   = snapshot?.total_income ?? 0
  const expenses = (snapshot?.total_fixed ?? 0) + (snapshot?.total_one_time ?? 0)
  const monthName = snapshot ? MONTHS[snapshot.month - 1] : '—'
  const year      = snapshot?.year ?? new Date().getFullYear()

  return (
    <div>
      <div className="page-header">
        <div className="page-eyebrow">Overview</div>
        <div className="page-title-row">
          <h1 className="page-title">
            {snapshot ? <><em>{monthName}</em> {year}</> : 'Dashboard'}
          </h1>
          <Link to="/monthly" className="btn btn-ghost btn-sm">
            View monthly →
          </Link>
        </div>
        <div className="page-divider" />
      </div>

      {/* Hero leftover card */}
      {snapshot ? (
        <div className="hero-card mb-6">
          <div className="hero-label">Net leftover</div>
          <div className={`hero-amount ${leftover > 0 ? 'positive' : leftover < 0 ? 'negative' : 'neutral'}`}>
            <span className="hero-currency">₪</span>
            {fmt(Math.abs(leftover))}
            {leftover < 0 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', marginLeft: 8, color: 'var(--red)' }}>deficit</span>}
          </div>
          <div className="hero-sub-row">
            <div className="hero-sub-item">
              <div className="hero-sub-label">Income</div>
              <div className="hero-sub-value income">+ ₪{fmt(income)}</div>
            </div>
            <div className="hero-sub-item">
              <div className="hero-sub-label">Expenses</div>
              <div className="hero-sub-value expense">− ₪{fmt(expenses)}</div>
            </div>
            <div className="hero-sub-item">
              <div className="hero-sub-label">Status</div>
              <div className="hero-sub-value" style={{ color: snapshot.is_draft ? 'var(--blue)' : 'var(--green)' }}>
                {snapshot.is_draft ? 'Draft · live' : 'Finalized'}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="hero-card mb-6" style={{ textAlign: 'center', padding: '48px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--text-2)', marginBottom: 16 }}>
            No snapshots yet
          </div>
          <Link to="/monthly" className="btn btn-primary">
            Create your first snapshot →
          </Link>
        </div>
      )}

      {/* Stat row */}
      <div className="card-grid-3 mb-8">
        <div className="card">
          <div className="card-label">Portfolio value</div>
          <div className="card-value" style={{ color: 'var(--text-0)' }}>
            {totals ? `₪${fmt(totals.total_nis)}` : '—'}
          </div>
          {totals?.change_pct != null && (
            <div className="card-sub">
              <span className={totals.change_pct >= 0 ? 'text-green' : 'text-red'}>
                {fmtSigned(totals.change_pct)}% vs prior month
              </span>
            </div>
          )}
          {!totals || totals.total_nis === 0 && (
            <div className="card-sub">No asset data yet</div>
          )}
        </div>

        <div className="card">
          <div className="card-label">Active goals</div>
          <div className="card-value" style={{ fontFamily: 'var(--font-mono)', fontSize: '2.8rem' }}>
            {goals.filter(g => g.status === 'ACTIVE').length}
          </div>
          <div className="card-sub">
            {goals.length} total &nbsp;·&nbsp; {goals.filter(g => g.status === 'DRAFT').length} drafts
          </div>
        </div>

        <div className="card">
          <div className="card-label">Snapshots</div>
          <div className="card-value" style={{ fontFamily: 'var(--font-mono)', fontSize: '2.8rem' }}>
            {snapshots.filter(s => !s.is_draft).length}
          </div>
          <div className="card-sub">
            {snapshots.filter(s => s.is_draft).length} draft{snapshots.filter(s => s.is_draft).length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Goals preview */}
      {goals.length > 0 && (
        <>
          <div className="section-header">
            <div className="section-title">Recent goals</div>
            <Link to="/goals" className="btn btn-ghost btn-sm">All goals →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {goals.map(goal => (
              <div
                key={goal.id}
                className="card"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px' }}
              >
                <div>
                  <div style={{ fontWeight: 500, color: 'var(--text-0)', marginBottom: 2 }}>{goal.name}</div>
                  {goal.total_cost && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-2)' }}>
                      ₪{fmt(Number(goal.total_cost))} total
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {goal.loan && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-2)' }}>
                      ₪{fmt(Number(goal.loan.monthly_payment))}/mo
                    </span>
                  )}
                  <StatusBadge status={goal.status} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
