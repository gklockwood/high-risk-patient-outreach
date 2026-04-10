import { useEffect, useMemo, useState } from 'react'
import { CheckInModal, type CheckInPayload } from './components/CheckInModal.tsx'
import { EscalationModal, type EscalationPayload } from './components/EscalationModal.tsx'
import { PrimaryButton } from './components/PrimaryButton.tsx'
import { ReviewLabsModal, type ReviewLabsPayload } from './components/ReviewLabsModal.tsx'
import { StatusBadge } from './components/StatusBadge.tsx'
import { TriageBar, type ListViewMode } from './components/TriageBar.tsx'
import { WorklistTable } from './components/WorklistTable.tsx'
import {
  buildPatientGroups,
  countPatientsNeedingAction,
  filterQueueByTab,
  OUTREACH_OUTCOMES,
  PAYER_OPTIONS,
  seedPatients,
  type ActivityItem,
  type EscalationRecord,
  type Patient,
  type QueueTab
} from './data.ts'

const KEY = 'patients'

const defaultFormState: Omit<Patient, 'id'> = {
  name: '',
  status: 'action_required',
  whyNow: '',
  impact: '',
  action: '',
  program: 'Post-discharge outreach',
  assignedCareManager: 'Unassigned',
  caseOwner: 'Care team',
  careGapStatus: ['Outreach in progress', 'Provider input not yet required', 'Last reviewed today'],
  nextStep: 'Complete outreach and confirm next appointment.',
  lastOutreach: '—',
  payer: 'Medicare Advantage',
  lastOutreachOutcome: 'No response',
  careGapType: 'Medication adherence follow-up (HEDIS-aligned)',
  riskContext: 'Chronic condition management requires accurate documentation (HCC)',
  valueImpact: [
    'Supports timely intervention',
    'Improves documentation continuity',
    'Prevents unresolved care gaps'
  ],
  recentActivity: []
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

function parseActivityItems(raw: unknown): ActivityItem[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: ActivityItem[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const a = item as Record<string, unknown>
    if (
      typeof a.id === 'string' &&
      typeof a.text === 'string' &&
      typeof a.timestampLabel === 'string'
    ) {
      out.push({ id: a.id, text: a.text, timestampLabel: a.timestampLabel })
    }
  }
  return out.length > 0 ? out : undefined
}

function parseStatusLines(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const lines = raw.filter(item => typeof item === 'string').slice(0, 3)
  return lines.length > 0 ? lines : undefined
}

function parseValueImpactLines(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const lines = raw.filter(item => typeof item === 'string').slice(0, 3)
  return lines.length > 0 ? lines : undefined
}

function parseEscalationHistory(raw: unknown): EscalationRecord[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: EscalationRecord[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const e = item as Record<string, unknown>
    if (
      typeof e.id === 'string' &&
      (e.type === 'Provider review' ||
        e.type === 'Clinical supervisor review' ||
        e.type === 'Care manager escalation') &&
      (e.routeTo === 'Assigned provider' ||
        e.routeTo === 'Supervising clinician' ||
        e.routeTo === 'Care manager' ||
        e.routeTo === 'Custom assignee') &&
      (e.priority === 'Routine' || e.priority === 'Urgent') &&
      typeof e.reason === 'string' &&
      typeof e.createdAtLabel === 'string'
    ) {
      out.push({
        id: e.id,
        type: e.type,
        routeTo: e.routeTo,
        customAssignee: typeof e.customAssignee === 'string' ? e.customAssignee : undefined,
        priority: e.priority,
        reason: e.reason,
        note: typeof e.note === 'string' ? e.note : undefined,
        createdAtLabel: e.createdAtLabel
      })
    }
  }
  return out.length > 0 ? out : undefined
}

function getWorkflowDefaults(status: Patient['status']) {
  if (status === 'high_risk') {
    return {
      caseOwner: 'Provider review',
      careGapStatus: ['Escalation required', 'Awaiting provider review', 'Escalated today'],
      nextStep: 'Call patient now and escalate to provider if unreachable.'
    }
  }
  if (status === 'action_required') {
    return {
      caseOwner: 'Care team',
      careGapStatus: ['Outreach in progress', 'Follow-up due today', 'Provider input not yet required'],
      nextStep: 'Complete outreach and confirm next appointment.'
    }
  }
  return {
    caseOwner: 'Care team',
    careGapStatus: ['Monitoring active', 'No escalation needed', 'Review if condition changes'],
    nextStep: 'Continue monitoring during the observation window.'
  }
}

function qualityFieldsForStatus(status: Patient['status']) {
  if (status === 'high_risk') {
    return {
      careGapType: 'Post-discharge follow-up (HEDIS)',
      riskContext: 'Recent hospitalization increases risk and follow-up priority',
      valueImpact: [
        'Closes HEDIS care gap',
        'Reduces readmission risk',
        'Improves risk capture accuracy'
      ] as const
    }
  }
  if (status === 'action_required') {
    return {
      careGapType: 'Medication adherence follow-up (HEDIS-aligned)',
      riskContext: 'Chronic condition management requires accurate documentation (HCC)',
      valueImpact: [
        'Supports timely intervention',
        'Improves documentation continuity',
        'Prevents unresolved care gaps'
      ] as const
    }
  }
  return {
    careGapType: 'Preventive screening outreach (HEDIS)',
    riskContext: 'Ongoing chronic condition monitoring',
    valueImpact: [
      'Supports preventive care completion',
      'Maintains quality performance',
      'Escalates if risk worsens'
    ] as const
  }
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
  const recentActivity = parseActivityItems(candidate.recentActivity)
  const careGapStatus = parseStatusLines(candidate.careGapStatus)
  const valueImpact = parseValueImpactLines(candidate.valueImpact)
  const escalationHistory = parseEscalationHistory(candidate.escalationHistory)
  return {
    id: candidate.id,
    name: candidate.name,
    status,
    whyNow: candidate.whyNow,
    impact: candidate.impact,
    action: candidate.action,
    payer: typeof candidate.payer === 'string' ? candidate.payer : undefined,
    program: typeof candidate.program === 'string' ? candidate.program : undefined,
    assignedCareManager:
      typeof candidate.assignedCareManager === 'string' ? candidate.assignedCareManager : undefined,
    caseOwner: typeof candidate.caseOwner === 'string' ? candidate.caseOwner : undefined,
    careGapStatus,
    nextStep: typeof candidate.nextStep === 'string' ? candidate.nextStep : undefined,
    lastOutreach: typeof candidate.lastOutreach === 'string' ? candidate.lastOutreach : undefined,
    lastOutreachOutcome:
      typeof candidate.lastOutreachOutcome === 'string' ? candidate.lastOutreachOutcome : undefined,
    careGapType: typeof candidate.careGapType === 'string' ? candidate.careGapType : undefined,
    riskContext: typeof candidate.riskContext === 'string' ? candidate.riskContext : undefined,
    valueImpact,
    recentActivity,
    escalationHistory
  }
}

function enrichFromSeed(p: Patient): Patient {
  const seed = seedPatients.find(s => s.id === p.id)
  const q = qualityFieldsForStatus(p.status)
  if (!seed) {
    const workflow = getWorkflowDefaults(p.status)
    return {
      ...p,
      program: p.program ?? 'Post-discharge outreach',
      payer: p.payer ?? 'Medicare Advantage',
      assignedCareManager: p.assignedCareManager ?? 'Unassigned',
      caseOwner: p.caseOwner ?? workflow.caseOwner,
      careGapStatus: p.careGapStatus && p.careGapStatus.length > 0 ? p.careGapStatus : workflow.careGapStatus,
      nextStep: p.nextStep ?? workflow.nextStep,
      lastOutreach: p.lastOutreach ?? '—',
      lastOutreachOutcome: p.lastOutreachOutcome ?? 'No response',
      careGapType: p.careGapType ?? q.careGapType,
      riskContext: p.riskContext ?? q.riskContext,
      valueImpact:
        p.valueImpact && p.valueImpact.length > 0 ? p.valueImpact : [...q.valueImpact],
      recentActivity: p.recentActivity ?? [],
      escalationHistory: p.escalationHistory ?? []
    }
  }
  const workflow = getWorkflowDefaults(p.status)
  return {
    ...p,
    program: p.program ?? seed.program,
    payer: p.payer ?? seed.payer,
    assignedCareManager: p.assignedCareManager ?? seed.assignedCareManager,
    caseOwner: p.caseOwner ?? seed.caseOwner ?? workflow.caseOwner,
    careGapStatus:
      p.careGapStatus && p.careGapStatus.length > 0
        ? p.careGapStatus
        : seed.careGapStatus && seed.careGapStatus.length > 0
          ? seed.careGapStatus
          : workflow.careGapStatus,
    nextStep: p.nextStep ?? seed.nextStep ?? workflow.nextStep,
    lastOutreach: p.lastOutreach ?? seed.lastOutreach,
    lastOutreachOutcome: p.lastOutreachOutcome ?? seed.lastOutreachOutcome,
    careGapType: p.careGapType ?? seed.careGapType ?? q.careGapType,
    riskContext: p.riskContext ?? seed.riskContext ?? q.riskContext,
    valueImpact:
      p.valueImpact && p.valueImpact.length > 0
        ? p.valueImpact
        : seed.valueImpact && seed.valueImpact.length > 0
          ? [...seed.valueImpact]
          : [...q.valueImpact],
    recentActivity:
      p.recentActivity && p.recentActivity.length > 0 ? p.recentActivity : [...(seed.recentActivity ?? [])],
    escalationHistory: p.escalationHistory ?? seed.escalationHistory ?? []
  }
}

function secondaryBtnClass(extra = '') {
  return `rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 ${extra}`.trim()
}

const statusRank: Record<Patient['status'], number> = {
  high_risk: 0,
  action_required: 1,
  monitoring: 2
}

function actionRank(action: string) {
  if (action === 'Escalate Now') return 0
  if (action === 'Call Patient') return 1
  if (action === 'Review Labs') return 2
  if (action === 'Schedule Follow-up') return 3
  if (action === 'Check In') return 4
  return 5
}

function outreachRecencyRank(lastOutreach?: string) {
  if (!lastOutreach) return 99
  const n = Number.parseInt(lastOutreach, 10)
  if (Number.isNaN(n)) return 99
  return n
}

function sortByAiPriority(patients: Patient[]) {
  return [...patients].sort((a, b) => {
    const byStatus = statusRank[a.status] - statusRank[b.status]
    if (byStatus !== 0) return byStatus

    const byAction = actionRank(a.action) - actionRank(b.action)
    if (byAction !== 0) return byAction

    const byOutreachAge = outreachRecencyRank(b.lastOutreach) - outreachRecencyRank(a.lastOutreach)
    if (byOutreachAge !== 0) return byOutreachAge

    return a.name.localeCompare(b.name)
  })
}

export default function App() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [selected, setSelected] = useState<Patient | null>(null)
  const [isEscalationModalOpen, setIsEscalationModalOpen] = useState(false)
  const [escalationPatientId, setEscalationPatientId] = useState<string | null>(null)
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false)
  const [checkInPatientId, setCheckInPatientId] = useState<string | null>(null)
  const [isReviewLabsModalOpen, setIsReviewLabsModalOpen] = useState(false)
  const [reviewLabsPatientId, setReviewLabsPatientId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<QueueTab>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | (typeof OUTREACH_OUTCOMES)[number]>('all')
  const [payerFilter, setPayerFilter] = useState<'all' | (typeof PAYER_OPTIONS)[number]>('all')
  const [listViewMode, setListViewMode] = useState<ListViewMode>('cards')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formState, setFormState] = useState<Omit<Patient, 'id'>>(defaultFormState)

  const filteredPatients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return patients.filter(p => {
      if (q && !p.name.toLowerCase().includes(q)) return false
      if (payerFilter !== 'all' && p.payer !== payerFilter) return false
      if (outcomeFilter !== 'all' && p.lastOutreachOutcome !== outcomeFilter) return false
      return true
    })
  }, [patients, searchQuery, payerFilter, outcomeFilter])

  const actionCount = useMemo(() => countPatientsNeedingAction(filteredPatients), [filteredPatients])

  const tabCounts = useMemo(
    () => ({
      all: filteredPatients.length,
      high_risk: filteredPatients.filter(p => p.status === 'high_risk').length,
      action_required: filteredPatients.filter(p => p.status === 'action_required').length,
      monitoring: filteredPatients.filter(p => p.status === 'monitoring').length
    }),
    [filteredPatients]
  )

  const aiSortedPatients = useMemo(() => sortByAiPriority(filteredPatients), [filteredPatients])
  const visibleInTab = useMemo(
    () => filterQueueByTab(aiSortedPatients, activeTab),
    [aiSortedPatients, activeTab]
  )

  const patientGroups = useMemo(
    () => buildPatientGroups(aiSortedPatients).filter(g => g.patients.length > 0),
    [aiSortedPatients]
  )
  const escalationPatient = useMemo(
    () => patients.find(p => p.id === escalationPatientId) ?? null,
    [patients, escalationPatientId]
  )
  const checkInPatient = useMemo(
    () => patients.find(p => p.id === checkInPatientId) ?? null,
    [patients, checkInPatientId]
  )
  const reviewLabsPatient = useMemo(
    () => patients.find(p => p.id === reviewLabsPatientId) ?? null,
    [patients, reviewLabsPatientId]
  )

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
        const normalizedPatients = parsed
          .map(coercePatient)
          .filter(isValidPatient)
          .map(enrichFromSeed)
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
    if (visibleInTab.length === 0) {
      setSelected(null)
      return
    }
    setSelected(prev => {
      const id = prev?.id
      const stillVisible = id && visibleInTab.some(p => p.id === id)
      if (stillVisible && id) {
        return patients.find(p => p.id === id) ?? null
      }
      if (activeTab === 'all') {
        return (
          visibleInTab.find(p => p.status === 'high_risk') ||
          visibleInTab.find(p => p.status === 'action_required') ||
          visibleInTab[0]
        )
      }
      return visibleInTab[0]
    })
  }, [patients, activeTab, visibleInTab])

  const appendActivity = (patientId: string, text: string) => {
    const entry: ActivityItem = {
      id: crypto.randomUUID(),
      text,
      timestampLabel: 'today'
    }
    setPatients(prev =>
      prev.map(p =>
        p.id === patientId
          ? { ...p, recentActivity: [entry, ...(p.recentActivity ?? [])].slice(0, 25) }
          : p
      )
    )
  }

  const openEscalationModal = (patient: Patient) => {
    setSelected(patient)
    setEscalationPatientId(patient.id)
    setIsEscalationModalOpen(true)
  }

  const closeEscalationModal = () => {
    setIsEscalationModalOpen(false)
    setEscalationPatientId(null)
  }

  const openCheckInModal = (patient: Patient) => {
    setSelected(patient)
    setCheckInPatientId(patient.id)
    setIsCheckInModalOpen(true)
  }

  const closeCheckInModal = () => {
    setIsCheckInModalOpen(false)
    setCheckInPatientId(null)
  }

  const openReviewLabsModal = (patient: Patient) => {
    setSelected(patient)
    setReviewLabsPatientId(patient.id)
    setIsReviewLabsModalOpen(true)
  }

  const closeReviewLabsModal = () => {
    setIsReviewLabsModalOpen(false)
    setReviewLabsPatientId(null)
  }

  const handlePrimaryQueueAction = (p: Patient) => {
    if (p.action === 'Escalate Now') openEscalationModal(p)
    else if (p.action === 'Check In') openCheckInModal(p)
    else if (p.action === 'Review Labs') openReviewLabsModal(p)
  }

  const handleEscalationSubmit = (payload: EscalationPayload) => {
    if (!escalationPatientId) return
    const routeOwner =
      payload.routeTo === 'Assigned provider'
        ? 'Provider review'
        : payload.routeTo === 'Supervising clinician'
          ? 'Supervising clinician'
          : payload.routeTo === 'Care manager'
            ? 'Care manager'
            : payload.customAssignee || 'Custom assignee'
    const isProviderRoute = routeOwner === 'Provider review' || routeOwner === 'Supervising clinician'
    const careGapStatus = isProviderRoute
      ? ['Escalation documented', 'Awaiting provider review', 'Routed today']
      : ['Escalation documented', `Awaiting ${routeOwner} response`, 'Routed today']
    const nextStep = isProviderRoute
      ? 'Await provider review and follow up if no disposition is returned.'
      : 'Care team should monitor for response before next outreach attempt.'
    const activityText =
      payload.priority === 'Urgent'
        ? `Urgent escalation documented — routed to ${routeOwner.toLowerCase()}`
        : `Escalated case routed to ${routeOwner.toLowerCase()}`
    const escalationRecord: EscalationRecord = {
      id: crypto.randomUUID(),
      type: payload.type,
      routeTo: payload.routeTo,
      customAssignee: payload.customAssignee,
      priority: payload.priority,
      reason: payload.reason,
      note: payload.note,
      createdAtLabel: 'today'
    }

    setPatients(prev =>
      prev.map(p => {
        if (p.id !== escalationPatientId) return p
        const newActivity: ActivityItem = {
          id: crypto.randomUUID(),
          text: `${activityText}`,
          timestampLabel: 'today'
        }
        return {
          ...p,
          caseOwner: routeOwner,
          careGapStatus,
          nextStep,
          action: p.action === 'Escalate Now' ? 'Follow Up' : p.action,
          recentActivity: [newActivity, ...(p.recentActivity ?? [])].slice(0, 25),
          escalationHistory: [escalationRecord, ...(p.escalationHistory ?? [])]
        }
      })
    )

    closeEscalationModal()
  }

  const nextStepFromOutcome = (outcome: CheckInPayload['outcome']) => {
    if (outcome === 'Reached patient') return 'Continue monitoring for stability.'
    if (outcome === 'No response') return 'Retry outreach or escalate if no response continues.'
    if (outcome === 'Left voicemail' || outcome === 'Message sent') {
      return 'Await response and follow up if needed.'
    }
    return 'Document refusal and consider escalation if risk persists.'
  }

  function mapCheckInToLastOutreach(o: CheckInPayload['outcome']): string {
    if (o === 'Reached patient') return 'Reached patient'
    if (o === 'No response') return 'No response'
    if (o === 'Left voicemail' || o === 'Message sent') return 'Left message'
    return 'Declined'
  }

  const activityFromCheckIn = (payload: CheckInPayload) => {
    if (payload.outcome === 'Reached patient') {
      if (payload.statusUpdate === 'Improving') return `Spoke with patient - symptoms improving`
      if (payload.statusUpdate === 'No change') return `Spoke with patient - no change reported`
      if (payload.statusUpdate === 'Worsening') return `Spoke with patient - symptoms worsening`
      return `Spoke with patient via ${payload.contactMethod.toLowerCase()}`
    }
    if (payload.outcome === 'No response') {
      return `Check-in via ${payload.contactMethod.toLowerCase()} - no response`
    }
    if (payload.outcome === 'Left voicemail') return `Left voicemail via ${payload.contactMethod.toLowerCase()}`
    if (payload.outcome === 'Message sent') return `${payload.contactMethod} sent - awaiting response`
    return `Patient declined check-in via ${payload.contactMethod.toLowerCase()}`
  }

  const handleCheckInSubmit = (payload: CheckInPayload) => {
    if (!checkInPatientId) return
    const activityText = activityFromCheckIn(payload)
    const nextStep = nextStepFromOutcome(payload.outcome)

    setPatients(prev =>
      prev.map(p => {
        if (p.id !== checkInPatientId) return p
        const noteText = payload.note ? ` Note: ${payload.note}` : ''
        const statusText = payload.statusUpdate ? ` (${payload.statusUpdate.toLowerCase()})` : ''
        const entry: ActivityItem = {
          id: crypto.randomUUID(),
          text: `${activityText}${statusText}${noteText}`,
          timestampLabel: 'today'
        }
        return {
          ...p,
          lastOutreachOutcome: mapCheckInToLastOutreach(payload.outcome),
          recentActivity: [entry, ...(p.recentActivity ?? [])].slice(0, 25),
          nextStep
        }
      })
    )

    closeCheckInModal()
  }

  const handleReviewLabsSubmit = (payload: ReviewLabsPayload) => {
    if (!reviewLabsPatientId) return
    const dispositionActivity =
      payload.disposition === 'No action needed'
        ? 'Lab results reviewed - no action needed'
        : payload.disposition === 'Schedule follow-up'
          ? 'Lab results reviewed - follow-up required'
          : payload.disposition === 'Adjust care plan'
            ? 'Lab results reviewed - care plan adjustment needed'
            : 'Lab results reviewed - escalated to provider'
    const nextStep =
      payload.disposition === 'No action needed'
        ? 'Continue monitoring.'
        : payload.disposition === 'Schedule follow-up'
          ? 'Schedule follow-up to address abnormal lab values.'
          : payload.disposition === 'Adjust care plan'
            ? 'Coordinate care plan adjustment and reassess after intervention.'
            : 'Escalate to provider for clinical decision.'

    setPatients(prev =>
      prev.map(p => {
        if (p.id !== reviewLabsPatientId) return p
        const noteText = payload.note ? ` Note: ${payload.note}` : ''
        const assessmentText = payload.assessment ? ` (${payload.assessment.toLowerCase()})` : ''
        const activity: ActivityItem = {
          id: crypto.randomUUID(),
          text: `${dispositionActivity}${assessmentText}${noteText}`,
          timestampLabel: 'today'
        }
        const escalated = payload.disposition === 'Escalate to provider'
        return {
          ...p,
          caseOwner: escalated ? 'Provider review' : p.caseOwner,
          careGapStatus: escalated
            ? ['Lab review completed', 'Awaiting provider review', 'Routed today']
            : p.careGapStatus,
          nextStep,
          recentActivity: [activity, ...(p.recentActivity ?? [])].slice(0, 25)
        }
      })
    )

    closeReviewLabsModal()
  }

  const handleLogAttempt = (patientId: string) => {
    appendActivity(patientId, 'Outreach attempt logged')
  }

  const handleDefer = (patientId: string) => {
    appendActivity(patientId, 'Deferred — follow-up in 48h')
  }

  const handleMarkResolved = (patientId: string) => {
    setPatients(prev =>
      prev.map(p => {
        if (p.id !== patientId) return p
        const entry: ActivityItem = {
          id: crypto.randomUUID(),
          text: 'Marked resolved — moved to monitoring',
          timestampLabel: 'today'
        }
        return {
          ...p,
          status: 'monitoring',
          caseOwner: 'Care team',
          careGapStatus: ['Monitoring active', 'No escalation needed', 'Review if condition changes'],
          nextStep: 'Continue monitoring during the observation window.',
          action: 'View Status',
          recentActivity: [entry, ...(p.recentActivity ?? [])].slice(0, 25)
        }
      })
    )
  }

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
      action: patient.action,
      payer: patient.payer ?? defaultFormState.payer,
      program: patient.program ?? defaultFormState.program,
      assignedCareManager: patient.assignedCareManager ?? defaultFormState.assignedCareManager,
      caseOwner: patient.caseOwner ?? defaultFormState.caseOwner,
      careGapStatus: patient.careGapStatus ?? defaultFormState.careGapStatus,
      nextStep: patient.nextStep ?? defaultFormState.nextStep,
      lastOutreach: patient.lastOutreach ?? defaultFormState.lastOutreach,
      lastOutreachOutcome: patient.lastOutreachOutcome ?? defaultFormState.lastOutreachOutcome,
      careGapType: patient.careGapType ?? defaultFormState.careGapType,
      riskContext: patient.riskContext ?? defaultFormState.riskContext,
      valueImpact: patient.valueImpact?.length ? [...patient.valueImpact] : [...(defaultFormState.valueImpact ?? [])],
      recentActivity: patient.recentActivity ?? []
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
        ...formState,
        program: formState.program ?? 'Post-discharge outreach',
        payer: formState.payer ?? 'Medicare Advantage',
        assignedCareManager: formState.assignedCareManager ?? 'Unassigned',
        caseOwner: formState.caseOwner ?? getWorkflowDefaults(formState.status).caseOwner,
        careGapStatus: formState.careGapStatus ?? getWorkflowDefaults(formState.status).careGapStatus,
        nextStep: formState.nextStep ?? getWorkflowDefaults(formState.status).nextStep,
        lastOutreach: formState.lastOutreach ?? '—',
        lastOutreachOutcome: formState.lastOutreachOutcome ?? 'No response',
        careGapType: formState.careGapType,
        riskContext: formState.riskContext,
        valueImpact: formState.valueImpact?.length ? [...formState.valueImpact] : [...qualityFieldsForStatus(formState.status).valueImpact],
        recentActivity: formState.recentActivity ?? [],
        escalationHistory: []
      }
      setPatients(prev => [newPatient, ...prev])
      setSelected(newPatient)
    } else if (editingId) {
      setPatients(prev =>
        prev.map(p =>
          p.id === editingId
            ? {
                ...p,
                ...formState,
                program: formState.program ?? p.program,
                payer: formState.payer ?? p.payer,
                assignedCareManager: formState.assignedCareManager ?? p.assignedCareManager,
                caseOwner: formState.caseOwner ?? p.caseOwner,
                careGapStatus: formState.careGapStatus ?? p.careGapStatus,
                nextStep: formState.nextStep ?? p.nextStep,
                lastOutreach: formState.lastOutreach ?? p.lastOutreach,
                lastOutreachOutcome: formState.lastOutreachOutcome ?? p.lastOutreachOutcome,
                careGapType: formState.careGapType ?? p.careGapType,
                riskContext: formState.riskContext ?? p.riskContext,
                valueImpact: formState.valueImpact?.length ? [...formState.valueImpact] : p.valueImpact,
                recentActivity: formState.recentActivity ?? p.recentActivity,
                escalationHistory: p.escalationHistory
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
    setActiveTab('all')
    setSearchQuery('')
    setOutcomeFilter('all')
    setPayerFilter('all')
    setListViewMode('cards')
  }

  const renderPatientCard = (p: Patient) => {
    const isSelected = selected?.id === p.id
    return (
      <div
        key={p.id}
        onClick={() => setSelected(p)}
        className={`rounded-xl border bg-white p-4 transition hover:border-slate-300 ${
          isSelected ? 'border-slate-400' : 'border-slate-200 shadow-sm hover:shadow'
        }`}
      >
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-semibold text-slate-900">{p.name}</div>
            {p.careGapType ? (
              <p className="mt-1 line-clamp-2 text-xs leading-snug text-slate-500" title={p.careGapType}>
                Care gap: {p.careGapType}
              </p>
            ) : null}
          </div>
          <StatusBadge status={p.status} />
        </div>
        <div className="mb-2 text-sm text-slate-800">{p.whyNow}</div>
        <div className="mb-2 text-sm text-slate-500">{p.impact}</div>
        <p className="mb-1 text-xs text-slate-500">
          Last outreach: {p.lastOutreachOutcome ?? '—'}
        </p>
        <p className="mb-3 text-[11px] text-slate-400">{p.payer ?? '—'}</p>
        <PrimaryButton
          type="button"
          onClick={e => {
            e.stopPropagation()
            handlePrimaryQueueAction(p)
          }}
        >
          {p.action}
        </PrimaryButton>
      </div>
    )
  }

  const renderGroupedQueue = () => {
    if (filteredPatients.length === 0 || patientGroups.length === 0) {
      return (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center text-sm text-slate-600">
          No patients match the current filters.
        </div>
      )
    }
    return (
    <div className="space-y-7">
      {patientGroups.map(group => (
        <section key={group.label}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">{group.label}</h2>
            <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">
              {group.patients.length}
            </span>
          </div>
          <div className="space-y-3">{group.patients.map(p => renderPatientCard(p))}</div>
        </section>
      ))}
    </div>
    )
  }

  const renderFlatQueue = () => {
    if (filteredPatients.length === 0 || visibleInTab.length === 0) {
      return (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center text-sm text-slate-600">
          No patients match the current filters.
        </div>
      )
    }
    return <div className="space-y-3">{visibleInTab.map(p => renderPatientCard(p))}</div>
  }

  const renderTableQueue = () => {
    if (filteredPatients.length === 0) {
      return (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center text-sm text-slate-600">
          No patients match the current filters.
        </div>
      )
    }
    if (activeTab === 'all') {
      if (patientGroups.length === 0) {
        return (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center text-sm text-slate-600">
            No patients match the current filters.
          </div>
        )
      }
      return (
        <WorklistTable
          variant="grouped"
          groups={patientGroups}
          selectedId={selected?.id ?? null}
          onSelectPatient={setSelected}
          onPrimaryAction={handlePrimaryQueueAction}
        />
      )
    }
    if (visibleInTab.length === 0) {
      return (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center text-sm text-slate-600">
          No patients match the current filters.
        </div>
      )
    }
    return (
      <WorklistTable
        variant="flat"
        flatPatients={visibleInTab}
        selectedId={selected?.id ?? null}
        onSelectPatient={setSelected}
        onPrimaryAction={handlePrimaryQueueAction}
      />
    )
  }

  return (
    <div className="flex h-screen flex-col bg-slate-50 text-slate-900">
      <header className="h-16 w-full border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
          <h1 className="text-lg font-semibold text-slate-900">Care Gap Worklist</h1>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search patients..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
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

      <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden w-full">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-start gap-8">
            <section className="min-w-0 flex-1 pr-2">
              <TriageBar
                actionCount={actionCount}
                tabCounts={tabCounts}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                outcomeFilter={outcomeFilter}
                onOutcomeFilterChange={setOutcomeFilter}
                payerFilter={payerFilter}
                onPayerFilterChange={setPayerFilter}
                listViewMode={listViewMode}
                onListViewModeChange={setListViewMode}
              />
              {listViewMode === 'table' ? (
                renderTableQueue()
              ) : activeTab === 'all' ? (
                renderGroupedQueue()
              ) : (
                renderFlatQueue()
              )}
            </section>
            <aside className="w-[30%] shrink-0 pl-2">
              {selected ? (
                <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <h3 className="text-xl font-semibold text-slate-900">{selected.name}</h3>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(selected)}
                        className={secondaryBtnClass()}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePatient(selected.id)}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <StatusBadge status={selected.status} />
                  </div>

                  <div className="min-w-0 space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Why Now</h4>
                      <p className="mt-1 break-words text-sm text-slate-800">{selected.whyNow}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Care Gap Type</h4>
                      <p className="mt-1 break-words text-sm text-slate-800">
                        {selected.careGapType ?? '—'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Risk Context</h4>
                      <p className="mt-1 break-words text-sm text-slate-800">
                        {selected.riskContext ?? '—'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Impact</h4>
                      <p className="mt-1 break-words text-sm text-slate-800">{selected.impact}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Value Impact</h4>
                      {(selected.valueImpact ?? []).length === 0 ? (
                        <p className="mt-1 text-sm text-slate-500">—</p>
                      ) : (
                        <ul className="mt-1.5 list-none space-y-1 text-sm leading-snug text-slate-700">
                          {(selected.valueImpact ?? []).map(line => (
                            <li key={line} className="flex gap-2 break-words">
                              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-400" aria-hidden />
                              <span>{line}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Recommended Action
                      </h4>
                      <div className="mt-2 flex flex-col gap-2">
                        <PrimaryButton type="button" onClick={() => handlePrimaryQueueAction(selected)}>
                          {selected.action}
                        </PrimaryButton>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleLogAttempt(selected.id)}
                            className={secondaryBtnClass()}
                          >
                            Log Attempt
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDefer(selected.id)}
                            className={secondaryBtnClass()}
                          >
                            Defer
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMarkResolved(selected.id)}
                            className={secondaryBtnClass()}
                          >
                            Mark Resolved
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Next Step</h4>
                      <p className="mt-1 text-xs text-slate-500">AI-assisted recommendation</p>
                      <p className="mt-1 break-words text-sm text-slate-800">
                        {selected.nextStep ?? getWorkflowDefaults(selected.status).nextStep}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">Review before taking action</p>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Care Gap Status</h4>
                      <div className="mt-1 space-y-1 text-sm text-slate-800">
                        {(selected.careGapStatus ?? getWorkflowDefaults(selected.status).careGapStatus)
                          .slice(0, 3)
                          .map(line => (
                            <p key={line} className="break-words">
                              {line}
                            </p>
                          ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Care Context</h4>
                      <dl className="mt-2 space-y-1.5 text-sm text-slate-800">
                        <div className="grid min-w-0 grid-cols-[auto,1fr] gap-x-2">
                          <dt className="text-slate-500">Payer</dt>
                          <dd className="min-w-0 break-words">{selected.payer ?? '—'}</dd>
                        </div>
                        <div className="grid min-w-0 grid-cols-[auto,1fr] gap-x-2">
                          <dt className="text-slate-500">Program</dt>
                          <dd className="min-w-0 break-words">{selected.program ?? '—'}</dd>
                        </div>
                        <div className="grid min-w-0 grid-cols-[auto,1fr] gap-x-2">
                          <dt className="shrink-0 text-slate-500">Assigned care manager</dt>
                          <dd className="min-w-0 break-words">{selected.assignedCareManager ?? '—'}</dd>
                        </div>
                        <div className="grid min-w-0 grid-cols-[auto,1fr] gap-x-2">
                          <dt className="text-slate-500">Last outreach outcome</dt>
                          <dd className="min-w-0 break-words">{selected.lastOutreachOutcome ?? '—'}</dd>
                        </div>
                      </dl>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recent Activity</h4>
                      <ul className="mt-2 space-y-2 border-t border-slate-100 pt-2">
                        {(selected.recentActivity ?? []).length === 0 ? (
                          <li className="text-sm text-slate-500">No activity recorded.</li>
                        ) : (
                          (selected.recentActivity ?? []).map(item => (
                            <li key={item.id} className="break-words text-sm leading-snug text-slate-800">
                              <span>{item.text}</span>
                              <span className="text-slate-400"> — {item.timestampLabel}</span>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">
                  {visibleInTab.length === 0
                    ? 'No patient selected.'
                    : 'Select a patient to view details.'}
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
                aria-label="Close"
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
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

      {isEscalationModalOpen && escalationPatient ? (
        <EscalationModal
          patient={escalationPatient}
          onClose={closeEscalationModal}
          onSubmit={handleEscalationSubmit}
        />
      ) : null}

      {isCheckInModalOpen && checkInPatient ? (
        <CheckInModal
          patient={checkInPatient}
          onClose={closeCheckInModal}
          onSubmit={handleCheckInSubmit}
        />
      ) : null}

      {isReviewLabsModalOpen && reviewLabsPatient ? (
        <ReviewLabsModal
          patient={reviewLabsPatient}
          onClose={closeReviewLabsModal}
          onSubmit={handleReviewLabsSubmit}
        />
      ) : null}
    </div>
  )
}
