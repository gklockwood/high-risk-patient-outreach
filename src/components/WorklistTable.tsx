import { PrimaryButton } from './PrimaryButton.tsx'
import { StatusBadge } from './StatusBadge.tsx'
import type { Patient } from '../data.ts'

export type PatientGroup = { label: string; patients: Patient[] }

type Props = {
  variant: 'grouped' | 'flat'
  groups?: PatientGroup[]
  flatPatients?: Patient[]
  selectedId: string | null
  onSelectPatient: (p: Patient) => void
  onPrimaryAction: (p: Patient) => void
}

function PatientSubtext({ p }: { p: Patient }) {
  if (p.careGapType) {
    return (
      <div className="mt-0.5 line-clamp-2 text-xs leading-snug text-slate-500" title={p.careGapType}>
        Care gap: {p.careGapType}
      </div>
    )
  }
  const line = p.program ?? p.payer
  if (!line) return null
  return <div className="mt-0.5 text-xs leading-snug text-slate-500">{line}</div>
}

function ActionCell({ p, onPrimaryAction }: { p: Patient; onPrimaryAction: (p: Patient) => void }) {
  return (
    <PrimaryButton
      type="button"
      className="!h-9 min-h-0 max-w-none shrink-0 whitespace-nowrap px-3 py-2 text-xs"
      onClick={e => {
        e.stopPropagation()
        onPrimaryAction(p)
      }}
    >
      {p.action}
    </PrimaryButton>
  )
}

function TableRows({
  patients,
  selectedId,
  onSelectPatient,
  onPrimaryAction
}: {
  patients: Patient[]
  selectedId: string | null
  onSelectPatient: (p: Patient) => void
  onPrimaryAction: (p: Patient) => void
}) {
  return (
    <tbody>
      {patients.map(p => {
        const isSelected = selectedId === p.id
        return (
          <tr
            key={p.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelectPatient(p)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelectPatient(p)
              }
            }}
            className={`cursor-pointer border-b border-slate-100 transition-colors last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 ${
              isSelected ? 'bg-slate-100/90 ring-1 ring-inset ring-slate-300' : 'hover:bg-slate-50/90'
            }`}
          >
            <td className="min-w-[220px] align-top px-3 py-3.5">
              <div className="break-words font-semibold leading-snug text-slate-900">{p.name}</div>
              <PatientSubtext p={p} />
            </td>
            <td className="min-w-[150px] align-top px-3 py-3.5">
              <div className="flex items-start">
                <StatusBadge status={p.status} />
              </div>
            </td>
            <td className="min-w-[220px] align-top px-3 py-3.5">
              <p className="text-sm leading-relaxed text-slate-800 line-clamp-2">{p.whyNow}</p>
            </td>
            <td className="min-w-[220px] align-top px-3 py-3.5">
              <p className="text-sm leading-relaxed text-slate-500 line-clamp-2">{p.impact}</p>
            </td>
            <td className="min-w-[150px] align-top px-3 py-3.5 text-sm leading-snug text-slate-700">
              {p.lastOutreachOutcome ?? '—'}
            </td>
            <td className="min-w-[170px] align-top px-3 py-3.5 text-sm leading-snug text-slate-700">
              {p.payer ?? '—'}
            </td>
            <td className="min-w-[176px] align-top px-3 py-3.5 text-right">
              <div className="flex min-w-[176px] justify-end overflow-visible">
                <ActionCell p={p} onPrimaryAction={onPrimaryAction} />
              </div>
            </td>
          </tr>
        )
      })}
    </tbody>
  )
}

const thead = (
  <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 shadow-[0_1px_0_0_rgb(226_232_240)]">
    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
      <th scope="col" className="min-w-[220px] whitespace-nowrap px-3 py-3">
        Patient
      </th>
      <th scope="col" className="min-w-[150px] whitespace-nowrap px-3 py-3">
        Status
      </th>
      <th scope="col" className="min-w-[220px] px-3 py-3">
        Why Now
      </th>
      <th scope="col" className="min-w-[220px] px-3 py-3">
        Impact
      </th>
      <th scope="col" className="min-w-[150px] whitespace-nowrap px-3 py-3">
        Last Outreach
      </th>
      <th scope="col" className="min-w-[170px] whitespace-nowrap px-3 py-3">
        Payer
      </th>
      <th scope="col" className="min-w-[176px] whitespace-nowrap px-3 py-3 text-right">
        Action
      </th>
    </tr>
  </thead>
)

export function WorklistTable({
  variant,
  groups = [],
  flatPatients = [],
  selectedId,
  onSelectPatient,
  onPrimaryAction
}: Props) {
  if (variant === 'flat') {
    return (
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white [-webkit-overflow-scrolling:touch]">
        <table className="w-max min-w-[1310px] max-w-none border-collapse text-sm">
          {thead}
          <TableRows
            patients={flatPatients}
            selectedId={selectedId}
            onSelectPatient={onSelectPatient}
            onPrimaryAction={onPrimaryAction}
          />
        </table>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {groups.map(group => (
        <section key={group.label}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">{group.label}</h2>
            <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">
              {group.patients.length}
            </span>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white [-webkit-overflow-scrolling:touch]">
            <table className="w-max min-w-[1310px] max-w-none border-collapse text-sm">
              {thead}
              <TableRows
                patients={group.patients}
                selectedId={selectedId}
                onSelectPatient={onSelectPatient}
                onPrimaryAction={onPrimaryAction}
              />
            </table>
          </div>
        </section>
      ))}
    </div>
  )
}
