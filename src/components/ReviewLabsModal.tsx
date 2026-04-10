import { useEffect, useMemo, useState } from 'react'
import { PrimaryButton } from './PrimaryButton.tsx'
import type { Patient } from '../data.ts'

type Assessment = 'Within expected range' | 'Mild concern' | 'Requires follow-up' | 'Critical — escalate'
type Disposition = 'No action needed' | 'Schedule follow-up' | 'Adjust care plan' | 'Escalate to provider'

export type ReviewLabsPayload = {
  assessment?: Assessment
  disposition: Disposition
  note?: string
}

type Props = {
  patient: Patient
  onClose: () => void
  onSubmit: (payload: ReviewLabsPayload) => void
}

const assessmentOptions: Assessment[] = [
  'Within expected range',
  'Mild concern',
  'Requires follow-up',
  'Critical — escalate'
]

const dispositionOptions: Disposition[] = [
  'No action needed',
  'Schedule follow-up',
  'Adjust care plan',
  'Escalate to provider'
]

function statusLabel(status: Patient['status']) {
  if (status === 'high_risk') return 'High Risk'
  if (status === 'action_required') return 'Action Required'
  return 'Monitoring'
}

function mockLabs(status: Patient['status']) {
  if (status === 'high_risk') {
    return ['HbA1c: 9.2% (High)', 'LDL: 165 mg/dL (High)', 'Last collected: Apr 5']
  }
  if (status === 'action_required') {
    return ['HbA1c: 8.1% (Elevated)', 'LDL: 142 mg/dL (Borderline High)', 'Last collected: Apr 6']
  }
  return ['HbA1c: 7.2% (Near target)', 'LDL: 118 mg/dL (Near target)', 'Last collected: Apr 4']
}

export function ReviewLabsModal({ patient, onClose, onSubmit }: Props) {
  const labs = useMemo(() => mockLabs(patient.status), [patient.status])
  const [assessment, setAssessment] = useState<Assessment | ''>('')
  const [disposition, setDisposition] = useState<Disposition | ''>('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setAssessment('')
    setDisposition('')
    setNote('')
    setError('')
  }, [patient.id])

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!disposition) {
      setError('Disposition is required.')
      return
    }
    onSubmit({
      assessment: assessment || undefined,
      disposition,
      note: note.trim() || undefined
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Review labs</h2>
            <p className="mt-1 text-sm text-slate-500">Assess recent lab results and determine next steps</p>
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
          <section>
            <h3 className="text-sm font-medium text-slate-700">Lab Summary</h3>
            <div className="mt-2 space-y-1 text-sm text-slate-800">
              {labs.map(line => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </section>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Assessment</label>
            <select
              value={assessment}
              onChange={e => setAssessment(e.target.value as Assessment)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400"
            >
              <option value="">Optional</option>
              {assessmentOptions.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Disposition</label>
            <select
              value={disposition}
              onChange={e => {
                setDisposition(e.target.value as Disposition)
                setError('')
              }}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400"
            >
              <option value="">Select disposition</option>
              {dispositionOptions.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Notes (optional)</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              placeholder="Add any relevant context for care team or provider"
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
            <PrimaryButton type="submit">Save lab review</PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  )
}
