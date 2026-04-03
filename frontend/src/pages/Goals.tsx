import { useEffect, useState } from 'react'
import { goalsApi, type Goal, type GoalSection } from '../api/goals'
import Modal, { ConfirmModal } from '../components/Modal'

const CURRENCIES = ['NIS', 'USD', 'EUR']
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmt(n: number | string) {
  return new Intl.NumberFormat('en-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(n))
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

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [selected, setSelected] = useState<Goal | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Modals
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [showAddSection, setShowAddSection] = useState(false)
  const [showAddLoan, setShowAddLoan] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ type: 'activate' | 'deactivate' | 'delete'; goal: Goal } | null>(null)
  const [deleteSection, setDeleteSection] = useState<GoalSection | null>(null)

  // Forms
  const [goalForm, setGoalForm] = useState({ name: '', description: '', total_cost: '', currency: 'NIS' })
  const [sectionForm, setSectionForm] = useState({ name: '', description: '', cost: '', currency: 'NIS', order: '0' })
  const [loanForm, setLoanForm] = useState({ total_amount: '', currency: 'NIS', spread_months: '12', annual_rate: '' })

  useEffect(() => {
    goalsApi.list().then(list => {
      setGoals(list)
      if (list.length > 0) setSelected(list[0])
    }).finally(() => setLoading(false))
  }, [])

  const handleAddGoal = async () => {
    setSubmitting(true); setErr('')
    try {
      const goal = await goalsApi.create({
        name: goalForm.name,
        description: goalForm.description || undefined,
        total_cost: goalForm.total_cost ? Number(goalForm.total_cost) : undefined,
        currency: goalForm.currency,
      })
      setGoals(p => [goal, ...p])
      setSelected(goal)
      setShowAddGoal(false)
      setGoalForm({ name: '', description: '', total_cost: '', currency: 'NIS' })
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error')
    } finally { setSubmitting(false) }
  }

  const handleAddSection = async () => {
    if (!selected) return
    setSubmitting(true); setErr('')
    try {
      const s = await goalsApi.addSection(selected.id, {
        name: sectionForm.name,
        description: sectionForm.description || undefined,
        cost: sectionForm.cost ? Number(sectionForm.cost) : undefined,
        currency: sectionForm.currency,
        order: Number(sectionForm.order),
      })
      const updated = { ...selected, sections: [...selected.sections, s].sort((a, b) => a.order - b.order) }
      setSelected(updated)
      setGoals(p => p.map(g => g.id === updated.id ? updated : g))
      setShowAddSection(false)
      setSectionForm({ name: '', description: '', cost: '', currency: 'NIS', order: String(selected.sections.length) })
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error')
    } finally { setSubmitting(false) }
  }

  const handleAttachLoan = async () => {
    if (!selected) return
    setSubmitting(true); setErr('')
    try {
      const annualRateInput = Number(loanForm.annual_rate)
      // Backend expects fractional rate (0.045 = 4.5%). If user entered > 1, treat as percentage
      const annual_rate = annualRateInput > 1 ? annualRateInput / 100 : annualRateInput

      const loan = await goalsApi.attachLoan(selected.id, {
        total_amount: Number(loanForm.total_amount),
        currency: loanForm.currency,
        spread_months: Number(loanForm.spread_months),
        annual_rate,
      })
      const updated = { ...selected, loan }
      setSelected(updated)
      setGoals(p => p.map(g => g.id === updated.id ? updated : g))
      setShowAddLoan(false)
      setLoanForm({ total_amount: '', currency: 'NIS', spread_months: '12', annual_rate: '' })
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error')
    } finally { setSubmitting(false) }
  }

  const handleToggleSection = async (section: GoalSection) => {
    if (!selected) return
    try {
      const updated_section = await goalsApi.updateSection(selected.id, section.id, { is_complete: !section.is_complete })
      const updated = {
        ...selected,
        sections: selected.sections.map(s => s.id === updated_section.id ? updated_section : s),
      }
      setSelected(updated)
      setGoals(p => p.map(g => g.id === updated.id ? updated : g))
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error')
    }
  }

  const handleDeleteSection = async () => {
    if (!selected || !deleteSection) return
    try {
      await goalsApi.deleteSection(selected.id, deleteSection.id)
      const updated = { ...selected, sections: selected.sections.filter(s => s.id !== deleteSection.id) }
      setSelected(updated)
      setGoals(p => p.map(g => g.id === updated.id ? updated : g))
      setDeleteSection(null)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error')
    }
  }

  const handleAction = async () => {
    if (!confirmAction) return
    const { type, goal } = confirmAction
    try {
      if (type === 'activate') {
        const updated = await goalsApi.activate(goal.id)
        setGoals(p => p.map(g => g.id === updated.id ? updated : g))
        setSelected(updated)
      } else if (type === 'deactivate') {
        const updated = await goalsApi.deactivate(goal.id)
        setGoals(p => p.map(g => g.id === updated.id ? updated : g))
        setSelected(updated)
      } else {
        await goalsApi.delete(goal.id)
        const remaining = goals.filter(g => g.id !== goal.id)
        setGoals(remaining)
        setSelected(remaining[0] ?? null)
      }
      setConfirmAction(null)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error')
    }
  }

  const handleDeleteLoan = async () => {
    if (!selected) return
    try {
      await goalsApi.deleteLoan(selected.id)
      const updated = { ...selected, loan: null }
      setSelected(updated)
      setGoals(p => p.map(g => g.id === updated.id ? updated : g))
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error')
    }
  }

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div className="page-eyebrow">Planning</div>
          <div className="page-title">Goals</div>
          <div className="page-divider" />
        </div>
        <div className="skeleton" style={{ height: 300, borderRadius: 10 }} />
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-eyebrow">Planning</div>
        <div className="page-title-row">
          <h1 className="page-title"><em>Goals</em> & plans</h1>
          <button className="btn btn-primary btn-sm" onClick={() => { setErr(''); setShowAddGoal(true) }}>
            + New goal
          </button>
        </div>
        <div className="page-divider" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Goal list sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {goals.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: 32 }}>
              <div style={{ fontFamily: 'var(--font-display)', color: 'var(--text-2)', fontSize: '1rem', marginBottom: 12 }}>
                No goals yet
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddGoal(true)}>
                Create one
              </button>
            </div>
          )}
          {goals.map(goal => (
            <div
              key={goal.id}
              onClick={() => setSelected(goal)}
              className={`goal-card ${selected?.id === goal.id ? 'active-goal' : ''} ${goal.status === 'ACTIVE' ? '' : ''}`}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div className="goal-name" style={{ fontSize: '0.95rem' }}>{goal.name}</div>
                <StatusBadge status={goal.status} />
              </div>
              {goal.total_cost && (
                <div className="goal-cost">₪{fmt(goal.total_cost)}</div>
              )}
              {goal.loan && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-2)', marginTop: 6 }}>
                  ₪{fmt(goal.loan.monthly_payment)}/mo × {goal.loan.spread_months}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Goal detail */}
        {selected ? (
          <div>
            {/* Goal header */}
            <div className="card mb-4">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 400, color: 'var(--text-0)', marginBottom: 4 }}>
                    {selected.name}
                  </div>
                  {selected.description && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-2)', marginBottom: 8 }}>{selected.description}</div>
                  )}
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <StatusBadge status={selected.status} />
                    {selected.total_cost && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-1)' }}>
                        ₪{fmt(selected.total_cost)} total
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  {selected.status === 'DRAFT' || selected.status === 'PAUSED' ? (
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--green)' }}
                      onClick={() => setConfirmAction({ type: 'activate', goal: selected })}>
                      Activate
                    </button>
                  ) : selected.status === 'ACTIVE' ? (
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--amber)' }}
                      onClick={() => setConfirmAction({ type: 'deactivate', goal: selected })}>
                      Pause
                    </button>
                  ) : null}
                  {selected.status !== 'ACTIVE' && (
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }}
                      onClick={() => setConfirmAction({ type: 'delete', goal: selected })}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Sections */}
            <div className="section-header mt-6">
              <div className="section-title">Sections</div>
              {selected.status !== 'ACTIVE' && (
                <button className="btn btn-ghost btn-sm" onClick={() => { setErr(''); setShowAddSection(true) }}>
                  + Add section
                </button>
              )}
            </div>

            {selected.sections.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 28, color: 'var(--text-2)', fontSize: '0.85rem' }}>
                No sections yet
              </div>
            ) : (
              <div className="table-wrap mb-4">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 32 }}></th>
                      <th>Section</th>
                      <th>Cost</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.sections.map(s => (
                      <tr key={s.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={s.is_complete}
                            onChange={() => handleToggleSection(s)}
                            style={{ accentColor: 'var(--gold)', cursor: 'pointer' }}
                          />
                        </td>
                        <td className="td-name" style={{ textDecoration: s.is_complete ? 'line-through' : 'none', color: s.is_complete ? 'var(--text-2)' : 'var(--text-0)' }}>
                          {s.name}
                          {s.description && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginTop: 2 }}>{s.description}</div>
                          )}
                        </td>
                        <td className="td-mono" style={{ color: 'var(--text-1)' }}>
                          {s.cost ? `${s.currency === 'NIS' ? '₪' : s.currency === 'USD' ? '$' : '€'}${fmt(s.cost)}` : '—'}
                        </td>
                        <td className="td-actions">
                          <button className="btn-icon" style={{ color: 'var(--red)' }} onClick={() => setDeleteSection(s)}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Loan */}
            <div className="section-header mt-6">
              <div className="section-title">Loan</div>
              {!selected.loan && selected.status !== 'ACTIVE' && (
                <button className="btn btn-ghost btn-sm" onClick={() => { setErr(''); setShowAddLoan(true) }}>
                  + Attach loan
                </button>
              )}
            </div>

            {selected.loan ? (
              <div>
                <div className="loan-box mb-4">
                  <div>
                    <div className="loan-item-label">Principal</div>
                    <div className="loan-item-value">₪{fmt(selected.loan.total_amount)}</div>
                  </div>
                  <div>
                    <div className="loan-item-label">Monthly</div>
                    <div className="loan-item-value" style={{ color: 'var(--red)' }}>₪{fmt(selected.loan.monthly_payment)}</div>
                  </div>
                  <div>
                    <div className="loan-item-label">Months</div>
                    <div className="loan-item-value">{selected.loan.spread_months}</div>
                  </div>
                  <div>
                    <div className="loan-item-label">Annual rate</div>
                    <div className="loan-item-value">{(Number(selected.loan.annual_rate) * 100).toFixed(2)}%</div>
                  </div>
                  <div>
                    <div className="loan-item-label">Currency</div>
                    <div className="loan-item-value">{selected.loan.currency}</div>
                  </div>
                  {selected.loan.start_month && (
                    <div>
                      <div className="loan-item-label">Start</div>
                      <div className="loan-item-value">{MONTHS_SHORT[selected.loan.start_month - 1]} {selected.loan.start_year}</div>
                    </div>
                  )}
                </div>
                {selected.status !== 'ACTIVE' && (
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={handleDeleteLoan}>
                    Remove loan
                  </button>
                )}
              </div>
            ) : (
              <div className="card" style={{ textAlign: 'center', padding: 28, color: 'var(--text-2)', fontSize: '0.85rem' }}>
                No loan attached
              </div>
            )}
          </div>
        ) : (
          goals.length > 0 && (
            <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text-2)' }}>
              Select a goal to view details
            </div>
          )
        )}
      </div>

      {/* Add goal modal */}
      {showAddGoal && (
        <Modal
          title="New goal"
          onClose={() => { setShowAddGoal(false); setErr('') }}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setShowAddGoal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddGoal} disabled={submitting}>
                {submitting ? 'Creating…' : 'Create goal'}
              </button>
            </>
          }
        >
          {err && <div className="error-msg">{err}</div>}
          <div className="form-field">
            <label className="form-label">Name</label>
            <input className="form-input" value={goalForm.name} onChange={e => setGoalForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Family vacation" />
          </div>
          <div className="form-field">
            <label className="form-label">Description <span style={{ opacity: 0.5 }}>(optional)</span></label>
            <input className="form-input" value={goalForm.description} onChange={e => setGoalForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description" />
          </div>
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Total cost <span style={{ opacity: 0.5 }}>(optional)</span></label>
              <input className="form-input" type="number" value={goalForm.total_cost} onChange={e => setGoalForm(p => ({ ...p, total_cost: e.target.value }))} placeholder="0" />
            </div>
            <div className="form-field">
              <label className="form-label">Currency</label>
              <select className="form-select" value={goalForm.currency} onChange={e => setGoalForm(p => ({ ...p, currency: e.target.value }))}>
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </Modal>
      )}

      {/* Add section modal */}
      {showAddSection && selected && (
        <Modal
          title="Add section"
          onClose={() => { setShowAddSection(false); setErr('') }}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setShowAddSection(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddSection} disabled={submitting}>
                {submitting ? 'Adding…' : 'Add section'}
              </button>
            </>
          }
        >
          {err && <div className="error-msg">{err}</div>}
          <div className="form-field">
            <label className="form-label">Name</label>
            <input className="form-input" value={sectionForm.name} onChange={e => setSectionForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Flights" />
          </div>
          <div className="form-field">
            <label className="form-label">Description <span style={{ opacity: 0.5 }}>(optional)</span></label>
            <input className="form-input" value={sectionForm.description} onChange={e => setSectionForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Cost <span style={{ opacity: 0.5 }}>(optional)</span></label>
              <input className="form-input" type="number" value={sectionForm.cost} onChange={e => setSectionForm(p => ({ ...p, cost: e.target.value }))} placeholder="0" />
            </div>
            <div className="form-field">
              <label className="form-label">Currency</label>
              <select className="form-select" value={sectionForm.currency} onChange={e => setSectionForm(p => ({ ...p, currency: e.target.value }))}>
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </Modal>
      )}

      {/* Attach loan modal */}
      {showAddLoan && selected && (
        <Modal
          title="Attach loan"
          onClose={() => { setShowAddLoan(false); setErr('') }}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setShowAddLoan(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAttachLoan} disabled={submitting}>
                {submitting ? 'Attaching…' : 'Attach loan'}
              </button>
            </>
          }
        >
          {err && <div className="error-msg">{err}</div>}
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Total amount</label>
              <input className="form-input" type="number" value={loanForm.total_amount} onChange={e => setLoanForm(p => ({ ...p, total_amount: e.target.value }))} placeholder="0" />
            </div>
            <div className="form-field">
              <label className="form-label">Currency</label>
              <select className="form-select" value={loanForm.currency} onChange={e => setLoanForm(p => ({ ...p, currency: e.target.value }))}>
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Months</label>
              <input className="form-input" type="number" value={loanForm.spread_months} onChange={e => setLoanForm(p => ({ ...p, spread_months: e.target.value }))} />
            </div>
            <div className="form-field">
              <label className="form-label">Annual rate (%)</label>
              <input className="form-input" type="number" step="0.1" value={loanForm.annual_rate} onChange={e => setLoanForm(p => ({ ...p, annual_rate: e.target.value }))} placeholder="e.g. 4.5" />
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm action */}
      {confirmAction && (
        <ConfirmModal
          title={
            confirmAction.type === 'activate' ? 'Activate goal' :
            confirmAction.type === 'deactivate' ? 'Pause goal' : 'Delete goal'
          }
          message={
            confirmAction.type === 'activate'
              ? `Activate "${confirmAction.goal.name}"? Loan payments will be auto-injected into future monthly snapshots.`
              : confirmAction.type === 'deactivate'
              ? `Pause "${confirmAction.goal.name}"? Future loan payments will be removed.`
              : `Delete "${confirmAction.goal.name}"? This cannot be undone.`
          }
          confirmLabel={confirmAction.type === 'activate' ? 'Activate' : confirmAction.type === 'deactivate' ? 'Pause' : 'Delete'}
          danger={confirmAction.type === 'delete' || confirmAction.type === 'deactivate'}
          onConfirm={handleAction}
          onClose={() => setConfirmAction(null)}
        />
      )}

      {/* Delete section confirm */}
      {deleteSection && (
        <ConfirmModal
          title="Delete section"
          message={`Delete section "${deleteSection.name}"?`}
          confirmLabel="Delete"
          danger
          onConfirm={handleDeleteSection}
          onClose={() => setDeleteSection(null)}
        />
      )}
    </div>
  )
}
