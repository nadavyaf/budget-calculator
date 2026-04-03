import { useEffect, useState } from 'react'
import { LineChart, Line, Tooltip, ResponsiveContainer } from 'recharts'
import { assetsApi, type Asset, type AssetHistoryPoint, type AssetTotals } from '../api/assets'
import { snapshotsApi } from '../api/snapshots'
import Modal, { ConfirmModal } from '../components/Modal'

const ASSET_TYPES = ['BANK_ACCOUNT','TRADING_ACCOUNT','EDUCATION_FUND','INVESTMENT_GEMEL','GEMEL','PENSION_FUND','KEREN_KASPIT']
const CURRENCIES = ['NIS','USD','EUR']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const TYPE_LABELS: Record<string, string> = {
  BANK_ACCOUNT: 'Bank Account',
  TRADING_ACCOUNT: 'Trading Account',
  EDUCATION_FUND: 'Education Fund',
  INVESTMENT_GEMEL: 'Investment Gemel',
  GEMEL: 'Gemel',
  PENSION_FUND: 'Pension Fund',
  KEREN_KASPIT: 'Keren Kaspit',
}

function fmt(n: number | null | undefined) {
  if (n == null || !isFinite(n)) return '0'
  return new Intl.NumberFormat('en-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
}

function MiniChart({ data, positive }: { data: AssetHistoryPoint[]; positive: boolean }) {
  if (data.length < 2) return <div style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: '0.7rem' }}>Not enough data</div>
  return (
    <ResponsiveContainer width="100%" height={48}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="value_nis"
          stroke={positive ? 'var(--green)' : 'var(--red)'}
          strokeWidth={1.5}
          dot={false}
        />
        <Tooltip
          contentStyle={{ background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 6, fontSize: 11, color: 'var(--text-0)', fontFamily: 'var(--font-mono)' }}
          formatter={(v: number) => [`₪${fmt(v)}`, '']}
          labelFormatter={() => ''}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export default function Assets() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [totals, setTotals] = useState<AssetTotals | null>(null)
  const [histories, setHistories] = useState<Record<string, AssetHistoryPoint[]>>({})
  const [loading, setLoading] = useState(true)

  const [showAdd, setShowAdd] = useState(false)
  const [showRecord, setShowRecord] = useState<Asset | null>(null)
  const [deleteAsset, setDeleteAsset] = useState<Asset | null>(null)
  const [err, setErr] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [addForm, setAddForm] = useState({ name: '', type: 'BANK_ACCOUNT', currency: 'NIS' })
  const [recordForm, setRecordForm] = useState({ value: '' })

  const load = () => Promise.all([
    assetsApi.list(),
    assetsApi.totals(),
  ]).then(([list, tot]) => {
    setAssets(list)
    setTotals(tot)
    // Load histories in parallel
    return Promise.all(list.map(async a => {
      const h = await assetsApi.history(a.id).catch(() => [])
      return { id: a.id, h }
    }))
  }).then(results => {
    const map: Record<string, AssetHistoryPoint[]> = {}
    results.forEach(({ id, h }) => { map[id] = h })
    setHistories(map)
  })

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [])

  const handleAddAsset = async () => {
    setSubmitting(true); setErr('')
    try {
      const asset = await assetsApi.create(addForm)
      setAssets(p => [...p, asset])
      setShowAdd(false)
      setAddForm({ name: '', type: 'BANK_ACCOUNT', currency: 'NIS' })
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error')
    } finally { setSubmitting(false) }
  }

  const handleRecordValue = async () => {
    if (!showRecord) return
    setSubmitting(true); setErr('')
    try {
      // Find or create this month's snapshot
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth() + 1
      const snaps = await snapshotsApi.list()
      let snap = snaps.find(s => s.year === year && s.month === month)
      if (!snap) snap = await snapshotsApi.create()

      await assetsApi.recordValue(showRecord.id, { snapshot_id: snap.id, value: Number(recordForm.value) })
      const [list, tot, h] = await Promise.all([assetsApi.list(), assetsApi.totals(), assetsApi.history(showRecord.id)])
      setAssets(list); setTotals(tot)
      setHistories(p => ({ ...p, [showRecord.id]: h }))
      setShowRecord(null)
      setRecordForm({ value: '' })
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error')
    } finally { setSubmitting(false) }
  }

  const handleDelete = async () => {
    if (!deleteAsset) return
    try {
      await assetsApi.delete(deleteAsset.id)
      setAssets(p => p.filter(a => a.id !== deleteAsset.id))
      setDeleteAsset(null)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error')
    }
  }

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div className="page-eyebrow">Portfolio</div>
          <div className="page-title">Assets</div>
          <div className="page-divider" />
        </div>
        <div className="asset-grid">
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 180, borderRadius: 10 }} />)}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-eyebrow">Portfolio</div>
        <div className="page-title-row">
          <h1 className="page-title"><em>Asset</em> tracker</h1>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add asset</button>
        </div>
        <div className="page-divider" />
      </div>

      {/* Portfolio total */}
      {totals && (
        <div className="hero-card mb-6">
          <div className="hero-label">Total portfolio</div>
          <div className="hero-amount neutral">
            <span className="hero-currency">₪</span>
            {fmt(totals.total_nis)}
          </div>
          {totals.prev_total_nis !== null && (
            <div className="hero-sub-row">
              <div className="hero-sub-item">
                <div className="hero-sub-label">Previous month</div>
                <div className="hero-sub-value" style={{ color: 'var(--text-1)' }}>₪{fmt(totals.prev_total_nis)}</div>
              </div>
              {totals.change_abs !== null && (
                <div className="hero-sub-item">
                  <div className="hero-sub-label">Change</div>
                  <div className={`hero-sub-value ${(totals.change_abs ?? 0) >= 0 ? 'income' : 'expense'}`}>
                    {(totals.change_abs ?? 0) >= 0 ? '+' : ''}₪{fmt(totals.change_abs ?? 0)}
                  </div>
                </div>
              )}
              {totals.change_pct !== null && (
                <div className="hero-sub-item">
                  <div className="hero-sub-label">% Change</div>
                  <div className={`hero-sub-value ${(totals.change_pct ?? 0) >= 0 ? 'income' : 'expense'}`}>
                    {(totals.change_pct ?? 0) >= 0 ? '+' : ''}{totals.change_pct}%
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {assets.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--text-2)', marginBottom: 16 }}>
            No assets yet
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>Add your first asset</button>
        </div>
      ) : (
        <div className="asset-grid">
          {assets.map(asset => {
            const history = histories[asset.id] ?? []
            const positive = (asset.change_abs ?? 0) >= 0
            return (
              <div key={asset.id} className="asset-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
                  <div className="asset-name">{asset.name}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="btn-icon"
                      onClick={() => { setShowRecord(asset); setRecordForm({ value: '' }); setErr('') }}
                      title="Record value"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                    </button>
                    <button
                      className="btn-icon"
                      style={{ color: 'var(--red)' }}
                      onClick={() => setDeleteAsset(asset)}
                      title="Archive asset"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="asset-type">{TYPE_LABELS[asset.type] ?? asset.type} · {asset.currency}</div>

                <div className="asset-value">
                  {asset.latest_value_nis !== null ? (
                    <><span className="asset-value-currency">₪</span>{fmt(asset.latest_value_nis)}</>
                  ) : (
                    <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.2rem', color: 'var(--text-3)', letterSpacing: '0.02em' }}>
                      awaiting first entry
                    </span>
                  )}
                </div>

                {asset.show_pct_change && asset.change_pct !== null && (
                  <div className="asset-change-row">
                    <span className={`stat-chip ${positive ? 'up' : 'down'}`}>
                      {positive ? '▲' : '▼'} {Math.abs(asset.change_pct)}%
                    </span>
                    {asset.change_abs !== null && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: positive ? 'var(--green)' : 'var(--red)' }}>
                        {positive ? '+' : ''}₪{fmt(asset.change_abs)}
                      </span>
                    )}
                  </div>
                )}

                {history.length > 1 && (
                  <div style={{ marginTop: 16 }}>
                    <MiniChart data={history} positive={positive} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add asset modal */}
      {showAdd && (
        <Modal
          title="Add asset"
          onClose={() => { setShowAdd(false); setErr('') }}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddAsset} disabled={submitting}>
                {submitting ? 'Creating…' : 'Add asset'}
              </button>
            </>
          }
        >
          {err && <div className="error-msg">{err}</div>}
          <div className="form-field">
            <label className="form-label">Name</label>
            <input className="form-input" value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Main savings" />
          </div>
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Type</label>
              <select className="form-select" value={addForm.type} onChange={e => setAddForm(p => ({ ...p, type: e.target.value }))}>
                {ASSET_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Currency</label>
              <select className="form-select" value={addForm.currency} onChange={e => setAddForm(p => ({ ...p, currency: e.target.value }))}>
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </Modal>
      )}

      {/* Record value modal */}
      {showRecord && (
        <Modal
          title={`Record value — ${showRecord.name}`}
          onClose={() => { setShowRecord(null); setErr('') }}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setShowRecord(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleRecordValue} disabled={submitting || !recordForm.value}>
                {submitting ? 'Saving…' : 'Record'}
              </button>
            </>
          }
        >
          {err && <div className="error-msg">{err}</div>}
          <div style={{ marginBottom: 18, padding: '10px 14px', background: 'var(--bg-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-1)' }}>
            <span style={{ fontSize: '0.68rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-2)', fontWeight: 600 }}>
              Recording for
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--gold)', marginLeft: 10 }}>
              {MONTHS[new Date().getMonth()]} {new Date().getFullYear()}
            </span>
          </div>
          <div className="form-field">
            <label className="form-label">Value ({showRecord.currency})</label>
            <input
              className="form-input"
              type="number"
              value={recordForm.value}
              onChange={e => setRecordForm(p => ({ ...p, value: e.target.value }))}
              placeholder="0"
              autoFocus
            />
          </div>
        </Modal>
      )}

      {/* Archive confirm */}
      {deleteAsset && (
        <ConfirmModal
          title="Archive asset"
          message={`Archive "${deleteAsset.name}"? It will be hidden but its history is preserved.`}
          confirmLabel="Archive"
          danger
          onConfirm={handleDelete}
          onClose={() => setDeleteAsset(null)}
        />
      )}
    </div>
  )
}
