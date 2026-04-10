import { useEffect, useState } from 'react'
import { PrimaryButton } from './PrimaryButton.tsx'
import type { Patient } from '../data.ts'

type ContactMethod = 'Phone' | 'SMS' | 'Email' | 'In-person'
type Outcome = 'Reached patient' | 'No response' | 'Left voicemail' | 'Message sent' | 'Patient declined'
type StatusUpdate = 'Improving' | 'No change' | 'Worsening' | 'Unknown'

export type CheckInPayload = {
  contactMethod: ContactMethod
  outcome: Outcome
  statusUpdate?: StatusUpdate
  note?: string
}

type Props = {
  patient: Patient
  onClose: () => void
  onSubmit: (payload: CheckInPayload) => void
}

const contactOptions: ContactMethod[] = ['Phone', 'SMS', 'Email', 'In-person']
const outcomeOptions: Outcome[] = [
  'Reached patient',
  'No response',
  'Left voicemail',
  'Message sent',
  'Patient declined'
]
const statusOptions: StatusUpdate[] = ['Improving', 'No change', 'Worsening', 'Unknown']

function statusLabel(status: Patient['status']) {
  if (status === 'high_risk') return 'High Risk'
  if (status === 'action_required') return 'Action Required'
  return 'Monitoring'
}

export function CheckInModal({ patient, onClose, onSubmit }: Props) {
  const [contactMethod, setContactMethod] = useState<ContactMethod>('Phone')
  const [outcome, setOutcome] = useState<Outcome | ''>('')
  const [statusUpdate, setStatusUpdate] = useState<StatusUpdate | ''>('')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setContactMethod('Phone')
    setOutcome('')
    setStatusUpdate('')
    setNote('')
    setErrors({})
  }, [patient.id])

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!contactMethod) nextErrors.contactMethod = 'Contact method is required.'
    if (!outcome) nextErrors.outcome = 'Outcome is required.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    if (!outcome) return

    onSubmit({
      contactMethod,
      outcome,
      statusUpdate: statusUpdate || undefined,
      note: note.trim() || undefined
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Log check-in</h2>
            <p className="mt-1 text-sm text-slate-500">
              Record a quick outreach or status update for this patient
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
            <label className="mb-1 block text-sm font-medium text-slate-700">Contact Method</label>
            <select
              value={contactMethod}
              onChange={e => setContactMethod(e.target.value as ContactMethod)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400"
            >
              {contactOptions.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors.contactMethod ? (
              <p className="mt-1 text-xs text-red-600">{errors.contactMethod}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Outcome</label>
            <select
              value={outcome}
              onChange={e => setOutcome(e.target.value as Outcome)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400"
            >
              <option value="">Select outcome</option>
              {outcomeOptions.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors.outcome ? <p className="mt-1 text-xs text-red-600">{errors.outcome}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Status Update (optional)</label>
            <select
              value={statusUpdate}
              onChange={e => setStatusUpdate(e.target.value as StatusUpdate)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400"
            >
              <option value="">No update</option>
              {statusOptions.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Notes (optional)</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              placeholder="Add any relevant details"
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
            <PrimaryButton type="submit">Log check-in</PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  )
}
