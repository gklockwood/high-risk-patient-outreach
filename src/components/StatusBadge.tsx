import type { Patient } from '../data.ts'

export function getStatusBadgeConfig(status: Patient['status']) {
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

export function StatusBadge({ status }: { status: Patient['status'] }) {
  const badge = getStatusBadgeConfig(status)
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3 py-1 text-[13px] font-medium ${badge.className}`}
    >
      <span className="material-symbols-outlined shrink-0 leading-none">{badge.icon}</span>
      <span className="whitespace-nowrap">{badge.label}</span>
    </span>
  )
}
