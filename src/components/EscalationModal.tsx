import { useEffect, useState } from 'react'
import { PrimaryButton } from './PrimaryButton.tsx'
import type { Patient } from '../data.ts'

type EscalationType = 'Provider review' | 'Clinical supervisor review' | 'Care manager escalation'
type RouteTo = 'Assigned provider' | 'Supervising clinician' | 'Care manager' | 'Custom assignee'
type Priority = 'Routine' | 'Urgent'

export type EscalationPayload = {
  type: EscalationType
  routeTo: RouteTo
  customAssignee?: string
  reason: string
  priority: Priority
  note?: string
}

type Props = {
  patient: Patient
  onClose: () => void
  onSubmit: (payload: EscalationPayload) => void
}

const typeOptions: EscalationType[] = [
  'Provider review',
  'Clinical supervisor review',
  'Care manager escalation'
]

const routeOptions: RouteTo[] = [
  'Assigned provider',
  'Supervising clinician',
  'Care manager',
  'Custom assignee'
]

function defaultsForPatient(patient: Patient) {
  if (patient.status === 'high_risk') {
    return {
      type: 'Provider review' as EscalationType,
      routeTo: 'Assigned provider' as RouteTo,
      priority: 'Urgent' as Priority
    }
  }
  return {
    type: 'Care manager escalation' as EscalationType,
    routeTo: 'Care manager' as RouteTo,
    priority: 'Routine' as Priority
  }
}

function statusLabel(status: Patient['status']) {
  if (status === 'high_risk') return 'High Risk'
  if (status === 'action_required') return 'Action Required'
  return 'Monitoring'
}

export function EscalationModal({ patient, onClose, onSubmit }: Props) {
  const defaults = defaultsForPatient(patient)
  const [type, setType] = useState<EscalationType>(defaults.type)
  const [routeTo, setRouteTo] = useState<RouteTo>(defaults.routeTo)
  const [customAssignee, setCustomAssignee] = useState('')
  const [reason, setReason] = useState(patient.whyNow)
  const [priority, setPriority] = useState<Priority>(defaults.priority)
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const nextDefaults = defaultsForPatient(patient)
    setType(nextDefaults.type)
    setRouteTo(nextDefaults.routeTo)
    setCustomAssignee('')
    setReason(patient.whyNow)
    setPriority(nextDefaults.priority)
    setNote('')
    setErrors({})
  }, [patient])

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!type) nextErrors.type = 'Escalation type is required.'
    if (!routeTo) nextErrors.routeTo = 'Route To is required.'
    if (routeTo === 'Custom assignee' && !customAssignee.trim()) {
      nextErrors.customAssignee = 'Assignee name or team is required.'
    }
    if (!reason.trim()) nextErrors.reason = 'Reason for escalation is required.'
    if (!priority) nextErrors.priority = 'Priority is required.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    onSubmit({
      type,
      routeTo,
      customAssignee: routeTo === 'Custom assignee' ? customAssignee.trim() : undefined,
      reason: reason.trim(),
      priority,
      note: note.trim() || undefined
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Document escalation</h2>
            <p className="mt-1 text-sm text-slate-500">
              Route this case for provider review and record why escalation is needed.
            </p>
            <p className="mt-2 text-sm text-slate-700">
              {patient.name} - <span className="text-slate-500">{statusLabel(patient.status)}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Escalation Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as EscalationType)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400"
            >
              {typeOptions.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors.type ? <p className="mt-1 text-xs text-red-600">{errors.type}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Route To</label>
            <select
              value={routeTo}
              onChange={e => setRouteTo(e.target.value as RouteTo)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400"
            >
              {routeOptions.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors.routeTo ? <p className="mt-1 text-xs text-red-600">{errors.routeTo}</p> : null}
          </div>

          {routeTo === 'Custom assignee' ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Assignee name or team</label>
              <input
                type="text"
                value={customAssignee}
                onChange={e => setCustomAssignee(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
              {errors.customAssignee ? (
                <p className="mt-1 text-xs text-red-600">{errors.customAssignee}</p>
              ) : null}
            </div>
          ) : null}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Reason for Escalation</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
            {errors.reason ? <p className="mt-1 text-xs text-red-600">{errors.reason}</p> : null}
          </div>

          <div>
            <span className="mb-1 block text-sm font-medium text-slate-700">Priority</span>
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="priority"
                  value="Routine"
                  checked={priority === 'Routine'}
                  onChange={() => setPriority('Routine')}
                />
                Routine
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="priority"
                  value="Urgent"
                  checked={priority === 'Urgent'}
                  onChange={() => setPriority('Urgent')}
                />
                Urgent
              </label>
            </div>
            {errors.priority ? <p className="mt-1 text-xs text-red-600">{errors.priority}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Supporting Note (optional)</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              placeholder="Add context for provider or care team follow-up"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <PrimaryButton type="submit">Document escalation</PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  )
}
