import { useEffect, useState } from 'react'
import { PrimaryButton } from './components/PrimaryButton.tsx'
import { seedPatients } from './data.ts'
import type { Patient } from './data.ts'

const KEY = 'patients'
const defaultFormState: Omit<Patient, 'id'> = {
  name: '',
  status: 'action_required',
  whyNow: '',
  impact: '',
  action: ''
}
const isValidStatus = (status: unknown): status is Patient['status'] =>
  status === 'high_risk' || status === 'action_required' || status === 'monitoring'

const normalizeStatus = (status: unknown): Patient['status'] | null => {
  if (status === 'high_risk' || status === 'action_required' || status === 'monitoring') return status
  if (status === 'high risk' || status === 'HIGH_RISK') return 'high_risk'
  if (status === 'action required' || status === 'ACTION_REQUIRED') return 'action_required'
  if (status === 'monitoring' || status === 'MONITORING') return 'monitoring'
  return null
}

const isValidPatient = (value: unknown): value is Patient => {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    isValidStatus(candidate.status) &&
    typeof candidate.whyNow === 'string' &&
    typeof candidate.impact === 'string' &&
    typeof candidate.action === 'string'
  )
}

const coercePatient = (value: unknown): Patient | null => {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>
  const status = normalizeStatus(candidate.status)
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.name !== 'string' ||
    !status ||
    typeof candidate.whyNow !== 'string' ||
    typeof candidate.impact !== 'string' ||
    typeof candidate.action !== 'string'
  ) {
    return null
  }
  return {
    id: candidate.id,
    name: candidate.name,
    status,
    whyNow: candidate.whyNow,
    impact: candidate.impact,
    action: candidate.action
  }
}

export default function App() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [selected, setSelected] = useState<Patient | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formState, setFormState] = useState<Omit<Patient, 'id'>>(defaultFormState)

  const getStatusBadge = (status: Patient['status']) => {
    if (status === 'high_risk') {
      return {
        label: 'High Risk',
        icon: 'warning',
        className: 'bg-red-100 text-red-600'
      }
    }
    if (status === 'action_required') {
      return {
        label: 'Action Required',
        icon: 'assignment',
        className: 'bg-amber-100 text-amber-600'
      }
    }
    return {
      label: 'Monitoring',
      icon: 'visibility',
      className: 'bg-blue-100 text-blue-600'
    }
  }

  const StatusBadge = ({ status }: { status: Patient['status'] }) => {
    const badge = getStatusBadge(status)
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[13px] font-medium ${badge.className}`}>
        <span className="material-symbols-outlined">{badge.icon}</span>
        <span>{badge.label}</span>
      </span>
    )
  }

  useEffect(() => {
    const saved = localStorage.getItem(KEY)
    if (!saved) {
      setPatients(seedPatients)
      localStorage.setItem(KEY, JSON.stringify(seedPatients))
      return
    }

    try {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) {
        const normalizedPatients = parsed.map(coercePatient).filter(isValidPatient)
        if (normalizedPatients.length > 0) {
          setPatients(normalizedPatients)
          return
        }
      }

      setPatients(seedPatients)
      localStorage.setItem(KEY, JSON.stringify(seedPatients))
    } catch {
      setPatients(seedPatients)
      localStorage.setItem(KEY, JSON.stringify(seedPatients))
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(patients))
  }, [patients])

  useEffect(() => {
    if (!selected) return
    const updatedSelected = patients.find(p => p.id === selected.id) || null
    setSelected(updatedSelected)
  }, [patients, selected])

  useEffect(() => {
    if (selected || patients.length === 0) return
    const firstHighRisk = patients.find(p => p.status === 'high_risk')
    setSelected(firstHighRisk || patients[0])
  }, [patients, selected])

  const openAddModal = () => {
    setModalMode('add')
    setEditingId(null)
    setFormState(defaultFormState)
    setIsModalOpen(true)
  }

  const openEditModal = (patient: Patient) => {
    setModalMode('edit')
    setEditingId(patient.id)
    setFormState({
      name: patient.name,
      status: patient.status,
      whyNow: patient.whyNow,
      impact: patient.impact,
      action: patient.action
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
    setFormState(defaultFormState)
  }

  const handleSavePatient = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!formState.name.trim()) return

    if (modalMode === 'add') {
      const newPatient: Patient = {
        id: crypto.randomUUID(),
        ...formState
      }
      setPatients(prev => [newPatient, ...prev])
      setSelected(newPatient)
    } else if (editingId) {
      setPatients(prev =>
        prev.map(p =>
          p.id === editingId
            ? {
                ...p,
                ...formState
              }
            : p
        )
      )
    }

    closeModal()
  }

  const handleDeletePatient = (patientId: string) => {
    const confirmed = window.confirm('Delete this patient? This action cannot be undone.')
    if (!confirmed) return

    setPatients(prev => prev.filter(p => p.id !== patientId))
    if (selected?.id === patientId) {
      setSelected(null)
    }
  }

  const handleResetDemoData = () => {
    const confirmed = window.confirm('Reset all patient data to the original demo dataset?')
    if (!confirmed) return
    setPatients(seedPatients)
    setSelected(null)
  }

  const patientGroups: Array<{ label: string; patients: Patient[] }> = [
    {
      label: 'High Risk',
      patients: patients.filter(p => p.status === 'high_risk')
    },
    {
      label: 'Action Required',
      patients: patients.filter(p => p.status === 'action_required')
    },
    {
      label: 'Monitoring',
      patients: patients.filter(p => p.status === 'monitoring')
    }
  ]

  return (
    <div className="flex h-screen flex-col bg-slate-50 text-slate-900">
      <header className="h-16 w-full border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Patient Triage</h1>
            <p className="text-sm text-slate-500">16 need attention today</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search patients..."
              className="h-10 w-64 rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-400"
            />
            <button
              type="button"
              className="h-10 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Filters
            </button>
            <button
              type="button"
              onClick={handleResetDemoData}
              className="h-10 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Reset Demo Data
            </button>
            <PrimaryButton type="button" onClick={openAddModal}>
              Add Patient
            </PrimaryButton>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden w-full">
        <div className="mx-auto h-full max-w-7xl px-6 py-6">
          <div className="flex h-full items-stretch gap-8">
          <section className="min-h-0 min-w-0 flex-1 overflow-y-auto pr-2">
          <div className="space-y-7">
            {patientGroups.map(group => (
              <section key={group.label}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">{group.label}</h2>
                  <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {group.patients.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {group.patients.map(p => {
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelected(p)}
                        className="rounded-xl bg-white p-4 shadow-sm transition hover:shadow"
                      >
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div className="font-semibold text-slate-900">{p.name}</div>
                          <StatusBadge status={p.status} />
                        </div>
                        <div className="mb-2 text-sm text-slate-800">{p.whyNow}</div>
                        <div className="mb-3 text-sm text-slate-500">{p.impact}</div>
                        <PrimaryButton
                          type="button"
                          onClick={e => e.stopPropagation()}
                        >
                          {p.action}
                        </PrimaryButton>
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
          </section>
          <aside className="min-h-0 w-[30%] shrink-0 overflow-y-auto pl-2">
          {selected ? (
            <div className="h-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">{selected.name}</h3>
                  <div className="mt-2">
                    <StatusBadge status={selected.status} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(selected)}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePatient(selected.id)}
                    className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Why Now</h4>
                  <p className="mt-1 text-sm text-slate-800">{selected.whyNow}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Impact</h4>
                  <p className="mt-1 text-sm text-slate-800">{selected.impact}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recommended Action</h4>
                  <PrimaryButton type="button" className="mt-2">
                    {selected.action}
                  </PrimaryButton>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recent Activity</h4>
                  <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                    Activity timeline placeholder: outreach attempts, care team notes, and recent events will appear here.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full rounded-xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">
              Select a patient to view details.
            </div>
          )}
          </aside>
          </div>
        </div>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-xl rounded-lg bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {modalMode === 'add' ? 'Add Patient' : 'Edit Patient'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSavePatient} className="space-y-3">
              <input
                type="text"
                required
                value={formState.name}
                onChange={e => setFormState(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Name"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
              <select
                value={formState.status}
                onChange={e =>
                  setFormState(prev => ({
                    ...prev,
                    status: e.target.value as Patient['status']
                  }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400"
              >
                <option value="high_risk">high_risk</option>
                <option value="action_required">action_required</option>
                <option value="monitoring">monitoring</option>
              </select>
              <textarea
                required
                value={formState.whyNow}
                onChange={e => setFormState(prev => ({ ...prev, whyNow: e.target.value }))}
                placeholder="Why now"
                rows={3}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
              <textarea
                required
                value={formState.impact}
                onChange={e => setFormState(prev => ({ ...prev, impact: e.target.value }))}
                placeholder="Impact"
                rows={2}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
              <input
                type="text"
                required
                value={formState.action}
                onChange={e => setFormState(prev => ({ ...prev, action: e.target.value }))}
                placeholder="Action"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <PrimaryButton type="submit">
                  {modalMode === 'add' ? 'Add Patient' : 'Save Changes'}
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
