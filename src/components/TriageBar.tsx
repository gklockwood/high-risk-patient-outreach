import type { QueueTab } from '../data.ts'
import { OUTREACH_OUTCOMES, PAYER_OPTIONS } from '../data.ts'

type TabCounts = {
  all: number
  high_risk: number
  action_required: number
  monitoring: number
}

export type ListViewMode = 'cards' | 'table'

type Props = {
  actionCount: number
  tabCounts: TabCounts
  activeTab: QueueTab
  onTabChange: (tab: QueueTab) => void
  outcomeFilter: 'all' | (typeof OUTREACH_OUTCOMES)[number]
  onOutcomeFilterChange: (value: 'all' | (typeof OUTREACH_OUTCOMES)[number]) => void
  payerFilter: 'all' | (typeof PAYER_OPTIONS)[number]
  onPayerFilterChange: (value: 'all' | (typeof PAYER_OPTIONS)[number]) => void
  listViewMode: ListViewMode
  onListViewModeChange: (mode: ListViewMode) => void
}

const tabs: { id: QueueTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'high_risk', label: 'High Risk' },
  { id: 'action_required', label: 'Action Required' },
  { id: 'monitoring', label: 'Monitoring' }
]

export function TriageBar({
  actionCount,
  tabCounts,
  activeTab,
  onTabChange,
  outcomeFilter,
  onOutcomeFilterChange,
  payerFilter,
  onPayerFilterChange,
  listViewMode,
  onListViewModeChange
}: Props) {
  return (
    <div className="mb-5 border-b border-slate-200 pb-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[15px] font-medium leading-snug text-slate-800">
            {actionCount} patients require action today
          </p>
          <p className="mt-1 text-xs text-slate-500">Sorted by: AI priority</p>
          <p className="text-[11px] text-slate-400">
            Based on risk urgency, outreach history, and unresolved care gaps
          </p>
        </div>
        <nav className="flex flex-wrap gap-1" aria-label="Queue filter">
          {tabs.map(t => {
            const count =
              t.id === 'all'
                ? tabCounts.all
                : t.id === 'high_risk'
                  ? tabCounts.high_risk
                  : t.id === 'action_required'
                    ? tabCounts.action_required
                    : tabCounts.monitoring
            const isActive = activeTab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onTabChange(t.id)}
                className={
                  isActive
                    ? 'rounded-md border border-slate-300 bg-slate-100 px-2.5 py-1.5 text-sm font-medium text-slate-900'
                    : 'rounded-md border border-transparent px-2.5 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }
              >
                {t.label} ({count})
              </button>
            )
          })}
        </nav>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span className="whitespace-nowrap">Outcome</span>
            <select
              value={outcomeFilter}
              onChange={e =>
                onOutcomeFilterChange(e.target.value as 'all' | (typeof OUTREACH_OUTCOMES)[number])
              }
              className="h-9 min-w-[10rem] rounded-md border border-slate-300 bg-white px-2 text-sm outline-none focus:border-slate-400"
            >
              <option value="all">All outcomes</option>
              {OUTREACH_OUTCOMES.map(o => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span className="whitespace-nowrap">Payer</span>
            <select
              value={payerFilter}
              onChange={e =>
                onPayerFilterChange(e.target.value as 'all' | (typeof PAYER_OPTIONS)[number])
              }
              className="h-9 min-w-[11rem] rounded-md border border-slate-300 bg-white px-2 text-sm outline-none focus:border-slate-400"
            >
              <option value="all">All payers</option>
              {PAYER_OPTIONS.map(p => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div
          className="inline-flex rounded-md border border-slate-200 p-0.5"
          role="group"
          aria-label="Worklist density"
        >
          <button
            type="button"
            onClick={() => onListViewModeChange('cards')}
            className={
              listViewMode === 'cards'
                ? 'rounded px-3 py-1.5 text-sm font-medium text-slate-900 bg-slate-100'
                : 'rounded px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-700'
            }
          >
            Cards
          </button>
          <button
            type="button"
            onClick={() => onListViewModeChange('table')}
            className={
              listViewMode === 'table'
                ? 'rounded px-3 py-1.5 text-sm font-medium text-slate-900 bg-slate-100'
                : 'rounded px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-700'
            }
          >
            Table
          </button>
        </div>
      </div>
    </div>
  )
}
