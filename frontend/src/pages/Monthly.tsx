import { useEffect, useState, useCallback } from 'react'
import { snapshotsApi, type Snapshot, type IncomeSource, type FixedExpense, type OneTimeExpense } from '../api/snapshots'
import Modal, { ConfirmModal } from '../components/Modal'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const CATEGORIES = ['HOUSING','TRANSPORT','FOOD','UTILITIES','SUBSCRIPTIONS','OTHER']
const CURRENCIES = ['NIS','USD','EUR']

function fmt(n: number | string) {
  return new Intl.NumberFormat('en-IL', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(n))
}

function CurrencyIcon({ currency }: { currency: string }) {
  const map: Record<string, string> = { NIS: '₪', USD: '$', EUR: '€' }
  return <>{map[currency] ?? currency}</>
}

type Tab = 'income' | 'fixed' | 'onetime'

interface ExpenseFormData {
  name: string; amount: string; currency: string; category: string
}

interface IncomeFormData {
  name: string; amount: string; currency: string
}

export default function Monthly() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('income')
  const [loading, setLoading] = useState(true)

  const [income, setIncome] = useState<IncomeSource[]>([])
  const [fixed, setFixed] = useState<FixedExpense[]>([])
  const [oneTime, setOneTime] = useState<OneTimeExpense[]>([])

  const [showAddModal, setShowAddModal] = useState(false)
  const [editItem, setEditItem] = useState<IncomeSource | FixedExpense | OneTimeExpense | null>(null)
  const [deleteItem, setDeleteItem] = useState<{ id: string; name: string } | null>(null)
  const [showFinalize, setShowFinalize] = useState(false)
  const [showDeleteSnap, setShowDeleteSnap] = useState(false)
  const [err, setErr] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [incomeForm, setIncomeForm] = useState<IncomeFormData>({ name: '', amount: '', currency: 'NIS' })
  const [expenseForm, setExpenseForm] = useState<ExpenseFormData>({ name: '', amount: '', currency: 'NIS', category: 'OTHER' })

  const loadData = useCallback(async (snapId: string) => {
    const [inc, fx, ot] = await Promise.all([
      snapshotsApi.listIncome(snapId),
      snapshotsApi.listFixed(snapId),
      snapshotsApi.listOneTime(snapId),
    ])
    setIncome(inc)
    setFixed(fx)
    setOneTime(ot)
  }, [])

  useEffect(() => {
    snapshotsApi.list().then(snaps => {
      setSnapshots(snaps)
      if (snaps.length > 0) {
        const sel = snaps[0].id
        setSelected(sel)
        loadData(sel)
      }
    }).finally(() => setLoading(false))
  }, [loadData])

  useEffect(() => {
    if (selected) loadData(selected)
  }, [selected, loadData])

  const currentSnap = snapshots.find(s => s.id === selected)

  const totalIncome   = income.reduce((s, i) => s + Number(i.amount_nis), 0)
  const totalFixed    = fixed.reduce((s, f) => s + Number(f.amount_nis), 0)
  const totalOneTime  = oneTime.reduce((s, o) => s + Number(o.amount_nis), 0)
  const leftover      = totalIncome - totalFixed - totalOneTime

  const resetForms = () => {
    setIncomeForm({ name: '', amount: '', currency: 'NIS' })
    setExpenseForm({ name: '', amount: '', currency: 'NIS', category: 'OTHER' })
    setEditItem(null)
    setErr('')
  }

  const openAdd = () => { resetForms(); setShowAddModal(true) }

  const openEdit = (item: IncomeSource | FixedExpense | OneTimeExpense) => {
    setEditItem(item)
    if (tab === 'income') {
      const i = item as IncomeSource
      setIncomeForm({ name: i.name, amount: String(i.amount), currency: i.currency })
    } else {
      const e = item as FixedExpense
      setExpenseForm({ name: e.name, amount: String(e.amount), currency: e.currency, category: e.category })
    }
    setShowAddModal(true)
  }

  const handleCreate = async () => {
    if (!selected) return
    setSubmitting(true); setErr('')
    try {
      if (tab === 'income') {
        const src = await snapshotsApi.addIncome(selected, { ...incomeForm, amount: Number(incomeForm.amount) })
        setIncome(p => [...p, src])
      } else if (tab === 'fixed') {
        const e = await snapshotsApi.addFixed(selected, { ...expenseForm, amount: Number(expenseForm.amount) })
        setFixed(p => [...p, e])
      } else {
        const e = await snapshotsApi.addOneTime(selected, { ...expenseForm, amount: Number(expenseForm.amount) })
        setOneTime(p => [...p, e])
      }
      setShowAddModal(false); resetForms()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async () => {
    if (!selected || !editItem) return
    setSubmitting(true); setErr('')
    try {
      if (tab === 'income') {
        const updated = await snapshotsApi.updateIncome(selected, editItem.id, { ...incomeForm, amount: Number(incomeForm.amount) })
        setIncome(p => p.map(i => i.id === updated.id ? updated : i))
      } else if (tab === 'fixed') {
        const updated = await snapshotsApi.updateFixed(selected, editItem.id, { ...expenseForm, amount: Number(expenseForm.amount) })
        setFixed(p => p.map(e => e.id === updated.id ? updated : e))
      } else {
        const updated = await snapshotsApi.updateOneTime(selected, editItem.id, { ...expenseForm, amount: Number(expenseForm.amount) })
        setOneTime(p => p.map(e => e.id === updated.id ? updated : e))
      }
      setShowAddModal(false); resetForms()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selected || !deleteItem) return
    try {
      if (tab === 'income') {
        await snapshotsApi.deleteIncome(selected, deleteItem.id)
        setIncome(p => p.filter(i => i.id !== deleteItem.id))
      } else if (tab === 'fixed') {
        await snapshotsApi.deleteFixed(selected, deleteItem.id)
        setFixed(p => p.filter(e => e.id !== deleteItem.id))
      } else {
        await snapshotsApi.deleteOneTime(selected, deleteItem.id)
        setOneTime(p => p.filter(e => e.id !== deleteItem.id))
      }
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error')
    } finally {
      setDeleteItem(null)
    }
  }

  const handleCreateSnapshot = async () => {
    try {
      const snap = await snapshotsApi.create()
      setSnapshots(p => [snap, ...p])
      setSelected(snap.id)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error')
    }
  }

  const handleFinalize = async () => {
    if (!selected) return
    try {
      const updated = await snapshotsApi.finalize(selected)
      setSnapshots(p => p.map(s => s.id === updated.id ? updated : s))
      setShowFinalize(false)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error')
    }
  }

  const handleDeleteSnap = async () => {
    if (!selected) return
    try {
      await snapshotsApi.delete(selected)
      const remaining = snapshots.filter(s => s.id !== selected)
      setSnapshots(remaining)
      setSelected(remaining[0]?.id ?? null)
      setShowDeleteSnap(false)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error')
    }
  }

  const isLoanPayment = (item: FixedExpense | OneTimeExpense) =>
    'is_loan_payment' in item && item.is_loan_payment

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div className="page-eyebrow">Cash Flow</div>
          <div className="page-title">Monthly</div>
          <div className="page-divider" />
        </div>
        <div className="skeleton" style={{ height: 120, borderRadius: 10 }} />
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-eyebrow">Cash Flow</div>
        <div className="page-title-row">
          <h1 className="page-title">
            {currentSnap ? (
              <><em>{MONTHS[currentSnap.month - 1]}</em> {currentSnap.year}</>
            ) : (
              'Monthly'
            )}
          </h1>
          <div style={{ display: 'flex', gap: 10 }}>
            {currentSnap?.is_draft && (
              <>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowFinalize(true)}>Finalize</button>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => setShowDeleteSnap(true)}>
                  Delete
                </button>
              </>
            )}
            <button className="btn btn-primary btn-sm" onClick={handleCreateSnapshot}>
              + New snapshot
            </button>
          </div>
        </div>
        <div className="page-divider" />
      </div>

      {/* Snapshot selector */}
      {snapshots.length > 0 && (
        <div className="snap-selector mb-6">
          {snapshots.map(s => (
            <button
              key={s.id}
              className={`snap-pill ${selected === s.id ? 'active' : ''} ${s.is_draft ? 'draft' : ''}`}
              onClick={() => setSelected(s.id)}
            >
              {MONTHS[s.month - 1]} {s.year}
            </button>
          ))}
        </div>
      )}

      {snapshots.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--text-2)', marginBottom: 16 }}>
            No snapshots yet
          </div>
          <button className="btn btn-primary" onClick={handleCreateSnapshot}>
            Create first snapshot
          </button>
        </div>
      )}

      {selected && (
        <>
          {/* Tabs + Add button */}
          <div className="flex items-center justify-between mb-4">
            <div className="tabs">
              <button className={`tab ${tab === 'income' ? 'active' : ''}`} onClick={() => setTab('income')}>Income</button>
              <button className={`tab ${tab === 'fixed' ? 'active' : ''}`} onClick={() => setTab('fixed')}>Fixed</button>
              <button className={`tab ${tab === 'onetime' ? 'active' : ''}`} onClick={() => setTab('onetime')}>One-time</button>
            </div>
            <button className="btn btn-primary btn-sm" onClick={openAdd}>
              + Add
            </button>
          </div>

          {/* Income table */}
          {tab === 'income' && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Amount</th>
                    <th>Currency</th>
                    <th>In NIS</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {income.length === 0 && (
                    <tr><td colSpan={5}><div className="table-empty">No income sources</div></td></tr>
                  )}
                  {income.map(i => (
                    <tr key={i.id}>
                      <td className="td-name">{i.name}</td>
                      <td className="td-mono"><CurrencyIcon currency={i.currency} />{fmt(i.amount)}</td>
                      <td className="td-mono" style={{ color: 'var(--text-2)' }}>{i.currency}</td>
                      <td className="td-amount-income">₪{fmt(i.amount_nis)}</td>
                      <td className="td-actions">
                        <div className="flex gap-2">
                          <button className="btn-icon" onClick={() => openEdit(i)}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button className="btn-icon" style={{ color: 'var(--red)' }} onClick={() => setDeleteItem({ id: i.id, name: i.name })}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                              <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {income.length > 0 && (
                <div className="table-footer">
                  <span className="table-footer-label">Total</span>
                  <span className="table-footer-value text-green">₪{fmt(totalIncome)}</span>
                </div>
              )}
            </div>
          )}

          {/* Fixed expenses table */}
          {tab === 'fixed' && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>In NIS</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {fixed.length === 0 && (
                    <tr><td colSpan={5}><div className="table-empty">No fixed expenses</div></td></tr>
                  )}
                  {fixed.map(e => (
                    <tr key={e.id}>
                      <td className="td-name">
                        {e.name}
                        {isLoanPayment(e) && (
                          <span className="cat" style={{ marginLeft: 8, background: 'var(--gold-glow)', color: 'var(--gold-dim)', borderColor: 'var(--gold-dim)' }}>
                            loan
                          </span>
                        )}
                      </td>
                      <td><span className="cat">{e.category}</span></td>
                      <td className="td-mono"><CurrencyIcon currency={e.currency} />{fmt(e.amount)}</td>
                      <td className="td-amount-expense">₪{fmt(e.amount_nis)}</td>
                      <td className="td-actions">
                        {!isLoanPayment(e) && (
                          <div className="flex gap-2">
                            <button className="btn-icon" onClick={() => openEdit(e)}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                            <button className="btn-icon" style={{ color: 'var(--red)' }} onClick={() => setDeleteItem({ id: e.id, name: e.name })}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                              </svg>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {fixed.length > 0 && (
                <div className="table-footer">
                  <span className="table-footer-label">Total</span>
                  <span className="table-footer-value text-red">₪{fmt(totalFixed)}</span>
                </div>
              )}
            </div>
          )}

          {/* One-time expenses table */}
          {tab === 'onetime' && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>In NIS</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {oneTime.length === 0 && (
                    <tr><td colSpan={5}><div className="table-empty">No one-time expenses</div></td></tr>
                  )}
                  {oneTime.map(e => (
                    <tr key={e.id}>
                      <td className="td-name">{e.name}</td>
                      <td><span className="cat">{e.category}</span></td>
                      <td className="td-mono"><CurrencyIcon currency={e.currency} />{fmt(e.amount)}</td>
                      <td className="td-amount-expense">₪{fmt(e.amount_nis)}</td>
                      <td className="td-actions">
                        <div className="flex gap-2">
                          <button className="btn-icon" onClick={() => openEdit(e)}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button className="btn-icon" style={{ color: 'var(--red)' }} onClick={() => setDeleteItem({ id: e.id, name: e.name })}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                              <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {oneTime.length > 0 && (
                <div className="table-footer">
                  <span className="table-footer-label">Total</span>
                  <span className="table-footer-value text-red">₪{fmt(totalOneTime)}</span>
                </div>
              )}
            </div>
          )}

          {/* Leftover sticky bar */}
          <div className="leftover-bar">
            <div className="leftover-item">
              <div className="leftover-label">Income</div>
              <div className="leftover-value text-green">₪{fmt(totalIncome)}</div>
            </div>
            <div className="leftover-separator" />
            <div className="leftover-item">
              <div className="leftover-label">Fixed</div>
              <div className="leftover-value text-red">₪{fmt(totalFixed)}</div>
            </div>
            <div className="leftover-item">
              <div className="leftover-label">One-time</div>
              <div className="leftover-value text-red">₪{fmt(totalOneTime)}</div>
            </div>
            <div className="leftover-separator" />
            <div className="leftover-item">
              <div className="leftover-label">Leftover</div>
              <div className={`leftover-value ${leftover >= 0 ? 'text-green' : 'text-red'}`} style={{ fontSize: '1.15rem', fontWeight: 600 }}>
                ₪{fmt(leftover)}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add / Edit modal */}
      {showAddModal && (
        <Modal
          title={editItem ? 'Edit item' : tab === 'income' ? 'Add income' : tab === 'fixed' ? 'Add fixed expense' : 'Add one-time expense'}
          onClose={() => { setShowAddModal(false); resetForms() }}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => { setShowAddModal(false); resetForms() }}>Cancel</button>
              <button className="btn btn-primary" onClick={editItem ? handleUpdate : handleCreate} disabled={submitting}>
                {submitting ? 'Saving…' : editItem ? 'Save changes' : 'Add'}
              </button>
            </>
          }
        >
          {err && <div className="error-msg">{err}</div>}

          {tab === 'income' ? (
            <>
              <div className="form-field">
                <label className="form-label">Name</label>
                <input className="form-input" value={incomeForm.name} onChange={e => setIncomeForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Salary" />
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label className="form-label">Amount</label>
                  <input className="form-input" type="number" value={incomeForm.amount} onChange={e => setIncomeForm(p => ({ ...p, amount: e.target.value }))} placeholder="0" />
                </div>
                <div className="form-field">
                  <label className="form-label">Currency</label>
                  <select className="form-select" value={incomeForm.currency} onChange={e => setIncomeForm(p => ({ ...p, currency: e.target.value }))}>
                    {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="form-field">
                <label className="form-label">Name</label>
                <input className="form-input" value={expenseForm.name} onChange={e => setExpenseForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Rent" />
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label className="form-label">Amount</label>
                  <input className="form-input" type="number" value={expenseForm.amount} onChange={e => setExpenseForm(p => ({ ...p, amount: e.target.value }))} placeholder="0" />
                </div>
                <div className="form-field">
                  <label className="form-label">Currency</label>
                  <select className="form-select" value={expenseForm.currency} onChange={e => setExpenseForm(p => ({ ...p, currency: e.target.value }))}>
                    {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-field">
                <label className="form-label">Category</label>
                <select className="form-select" value={expenseForm.category} onChange={e => setExpenseForm(p => ({ ...p, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </>
          )}
        </Modal>
      )}

      {/* Delete item confirm */}
      {deleteItem && (
        <ConfirmModal
          title="Remove item"
          message={`Remove "${deleteItem.name}"? This cannot be undone.`}
          confirmLabel="Remove"
          danger
          onConfirm={handleDelete}
          onClose={() => setDeleteItem(null)}
        />
      )}

      {/* Finalize confirm */}
      {showFinalize && (
        <ConfirmModal
          title="Finalize snapshot"
          message="Finalize this snapshot? It will become immutable and serve as the base for next month's carryover."
          confirmLabel="Finalize"
          onConfirm={handleFinalize}
          onClose={() => setShowFinalize(false)}
        />
      )}

      {/* Delete snapshot confirm */}
      {showDeleteSnap && (
        <ConfirmModal
          title="Delete snapshot"
          message="Delete this draft snapshot? All income and expenses in it will be lost."
          confirmLabel="Delete"
          danger
          onConfirm={handleDeleteSnap}
          onClose={() => setShowDeleteSnap(false)}
        />
      )}
    </div>
  )
}
