export type PatientStatus = 'high_risk' | 'action_required' | 'monitoring'

export type ActivityItem = {
  id: string
  text: string
  timestampLabel: string
}

export type EscalationRecord = {
  id: string
  type: 'Provider review' | 'Clinical supervisor review' | 'Care manager escalation'
  routeTo: 'Assigned provider' | 'Supervising clinician' | 'Care manager' | 'Custom assignee'
  customAssignee?: string
  priority: 'Routine' | 'Urgent'
  reason: string
  note?: string
  createdAtLabel: string
}

export type Patient = {
  id: string
  name: string
  status: PatientStatus
  whyNow: string
  impact: string
  action: string
  payer?: string
  program?: string
  assignedCareManager?: string
  caseOwner?: string
  careGapStatus?: string[]
  nextStep?: string
  lastOutreach?: string
  /** Result of the most recent outreach attempt (population health worklist signal) */
  lastOutreachOutcome?: string
  /** Quality / care-gap framing (e.g. HEDIS-aligned measure in plain language) */
  careGapType?: string
  /** Risk adjustment / documentation context for care ops (not a coding tool) */
  riskContext?: string
  /** Short lines linking workflow to quality, documentation, and outcomes */
  valueImpact?: string[]
  recentActivity?: ActivityItem[]
  escalationHistory?: EscalationRecord[]
}

/** Values used for outcome filter + seeding */
export const OUTREACH_OUTCOMES = [
  'Left message',
  'Wrong number',
  'No response',
  'Reached patient',
  'Declined',
  'Follow-up scheduled'
] as const

export const PAYER_OPTIONS = [
  'Cigna Health',
  'Medicare Advantage',
  'Medicaid Managed Care',
  'Aetna',
  'Blue Cross Blue Shield'
] as const

export type QueueTab = 'all' | 'high_risk' | 'action_required' | 'monitoring'

export function countPatientsNeedingAction(patients: Patient[]): number {
  return patients.filter(p => p.status === 'high_risk' || p.status === 'action_required').length
}

export function filterQueueByTab(patients: Patient[], tab: QueueTab): Patient[] {
  if (tab === 'all') return patients
  return patients.filter(p => p.status === tab)
}

export function buildPatientGroups(patients: Patient[]) {
  return [
    { label: 'High Risk' as const, patients: patients.filter(p => p.status === 'high_risk') },
    { label: 'Action Required' as const, patients: patients.filter(p => p.status === 'action_required') },
    { label: 'Monitoring' as const, patients: patients.filter(p => p.status === 'monitoring') }
  ]
}

const act = (id: string, text: string, timestampLabel: string): ActivityItem => ({
  id,
  text,
  timestampLabel
})

export const seedPatients: Patient[] = [
  {
    id: '1',
    name: 'Anderson, Margaret',
    status: 'high_risk',
    whyNow: 'No response after intervention (5+ days overdue)',
    impact: 'High risk of hospitalization',
    action: 'Escalate Now',
    payer: 'Medicare Advantage',
    program: 'Post-discharge outreach',
    assignedCareManager: 'Sarah L.',
    lastOutreach: '2 days ago',
    lastOutreachOutcome: 'No response',
    careGapType: 'Post-discharge follow-up (HEDIS)',
    riskContext: 'Recent hospitalization + chronic condition burden (HCC)',
    valueImpact: [
      'Closes HEDIS care gap',
      'Reduces readmission risk',
      'Improves risk capture accuracy'
    ],
    recentActivity: [
      act('1a', 'Escalated to care manager', 'today'),
      act('1b', 'Called patient — no answer', '2 days ago'),
      act('1c', 'SMS reminder sent', '3 days ago'),
      act('1d', 'Follow-up scheduled', '5 days ago')
    ]
  },
  {
    id: '2',
    name: 'Williams, Frank',
    status: 'high_risk',
    whyNow: 'No response after intervention (5+ days overdue)',
    impact: 'Escalation required to prevent worsening condition',
    action: 'Escalate Now',
    payer: 'Medicaid Managed Care',
    program: 'CHF remote monitoring',
    assignedCareManager: 'Sarah L.',
    lastOutreach: '1 day ago',
    lastOutreachOutcome: 'Left message',
    careGapType: 'Blood pressure control follow-up (HEDIS)',
    riskContext: 'Diabetes + CHF risk profile (HCC)',
    valueImpact: [
      'Closes HEDIS care gap',
      'Reduces readmission risk',
      'Prioritizes timely provider follow-up'
    ],
    recentActivity: [
      act('2a', 'Care manager paged on-call', 'today'),
      act('2b', 'Voicemail left', '1 day ago'),
      act('2c', 'Letter mailed to home address', '4 days ago')
    ]
  },
  {
    id: '3',
    name: 'Vargas, Daniel',
    status: 'high_risk',
    whyNow: 'No contact after discharge follow-up window',
    impact: 'Care gap remains open and readmission risk is elevated',
    action: 'Call Patient',
    payer: 'Cigna Health',
    program: 'Post-discharge outreach',
    assignedCareManager: 'Marcus T.',
    lastOutreach: '3 days ago',
    lastOutreachOutcome: 'Wrong number',
    careGapType: 'Post-discharge follow-up (HEDIS)',
    riskContext: 'Recent hospitalization increases risk and follow-up priority',
    valueImpact: [
      'Closes HEDIS care gap',
      'Reduces readmission risk',
      'Improves documentation for risk adjustment'
    ],
    recentActivity: [
      act('3a', 'Discharge call attempted — busy', 'today'),
      act('3b', 'SMS reminder sent', '3 days ago'),
      act('3c', 'Escalated to care manager', '5 days ago')
    ]
  },
  {
    id: '4',
    name: 'Patel, Christopher',
    status: 'action_required',
    whyNow: 'No improvement after intervention',
    impact: 'Follow-up needed to prevent treatment delay',
    action: 'Schedule Follow-up',
    payer: 'Blue Cross Blue Shield',
    program: 'Diabetes care gap closure',
    assignedCareManager: 'Sarah L.',
    lastOutreach: '4 days ago',
    lastOutreachOutcome: 'Reached patient',
    careGapType: 'Diabetes A1C screening (HEDIS)',
    riskContext: 'Chronic condition management requires accurate documentation (HCC)',
    valueImpact: [
      'Supports timely intervention',
      'Improves documentation continuity',
      'Prevents unresolved care gaps'
    ],
    recentActivity: [
      act('4a', 'Follow-up scheduled', 'today'),
      act('4b', 'Nurse message in portal', '4 days ago'),
      act('4c', 'Lab review requested', '6 days ago')
    ]
  },
  {
    id: '5',
    name: 'Nguyen, Ava',
    status: 'monitoring',
    whyNow: 'Recent medication adjustment',
    impact: 'Monitoring for stability',
    action: 'Check In',
    payer: 'Aetna',
    program: 'Medication therapy management',
    assignedCareManager: 'Elena R.',
    lastOutreach: '1 day ago',
    lastOutreachOutcome: 'Follow-up scheduled',
    careGapType: 'Medication adherence follow-up (HEDIS-aligned)',
    riskContext: 'Ongoing chronic condition monitoring',
    valueImpact: [
      'Supports preventive care completion',
      'Maintains quality performance',
      'Escalates if risk worsens'
    ],
    recentActivity: [
      act('5a', 'Check-in call completed', 'today'),
      act('5b', 'Pharmacy sync confirmed', '1 day ago'),
      act('5c', 'SMS reminder sent', '5 days ago')
    ]
  },
  {
    id: '6',
    name: 'Rivera, Sofia',
    status: 'action_required',
    whyNow: 'Missed follow-up appointment',
    impact: 'Care plan progression may stall',
    action: 'Call Patient',
    payer: 'Medicare Advantage',
    program: 'Post-discharge outreach',
    assignedCareManager: 'Marcus T.',
    lastOutreach: '6 days ago',
    lastOutreachOutcome: 'Declined',
    careGapType: 'Post-discharge follow-up (HEDIS)',
    riskContext: 'Undocumented chronic condition may affect risk accuracy',
    valueImpact: [
      'Closes HEDIS care gap',
      'Improves risk capture accuracy',
      'Prioritizes timely provider follow-up'
    ],
    recentActivity: [
      act('6a', 'Appointment reschedule link sent', 'today'),
      act('6b', 'Called patient — no answer', '2 days ago'),
      act('6c', 'SMS reminder sent', '6 days ago')
    ]
  },
  {
    id: '7',
    name: 'Brooks, James',
    status: 'monitoring',
    whyNow: 'Recently documented symptom improvement',
    impact: 'No immediate action needed',
    action: 'View Details',
    payer: 'Cigna Health',
    program: 'COPD care pathway',
    assignedCareManager: 'Sarah L.',
    lastOutreach: '3 days ago',
    lastOutreachOutcome: 'Left message',
    careGapType: 'Preventive screening outreach (HEDIS)',
    riskContext: 'Suspected COPD requires documentation review (HCC)',
    valueImpact: [
      'Supports preventive care completion',
      'Improves documentation for risk adjustment',
      'Escalates if risk worsens'
    ],
    recentActivity: [
      act('7a', 'Symptom survey completed', 'today'),
      act('7b', 'Nurse note added', '3 days ago'),
      act('7c', 'Follow-up scheduled', '2 weeks ago')
    ]
  },
  {
    id: '8',
    name: 'Kim, Hannah',
    status: 'action_required',
    whyNow: 'Lab review due today',
    impact: 'Treatment decision pending',
    action: 'Review Labs',
    payer: 'Medicaid Managed Care',
    program: 'Chronic kidney disease',
    assignedCareManager: 'Elena R.',
    lastOutreach: '2 days ago',
    lastOutreachOutcome: 'No response',
    careGapType: 'Chronic care lab monitoring (HEDIS-aligned)',
    riskContext: 'Multiple chronic conditions increase risk complexity (HCC)',
    valueImpact: [
      'Supports timely intervention',
      'Improves documentation continuity',
      'Reduces readmission risk'
    ],
    recentActivity: [
      act('8a', 'Lab review requested', 'today'),
      act('8b', 'Patient notified via portal', 'today'),
      act('8c', 'Results received from lab', '2 days ago')
    ]
  },
  {
    id: '9',
    name: 'Torres, Elena',
    status: 'monitoring',
    whyNow: 'Observation period in progress',
    impact: 'Continue monitoring for progression',
    action: 'Check In',
    payer: 'Aetna',
    program: 'Post-discharge outreach',
    assignedCareManager: 'Marcus T.',
    lastOutreach: '5 days ago',
    lastOutreachOutcome: 'Reached patient',
    careGapType: 'Post-discharge follow-up (HEDIS)',
    riskContext: 'Recent hospitalization increases risk and follow-up priority',
    valueImpact: [
      'Closes HEDIS care gap',
      'Maintains quality performance',
      'Reduces readmission risk'
    ],
    recentActivity: [
      act('9a', 'Observation window extended', 'today'),
      act('9b', 'SMS reminder sent', '5 days ago'),
      act('9c', 'Care plan reviewed', '1 week ago')
    ]
  },
  {
    id: '10',
    name: 'Murphy, Liam',
    status: 'action_required',
    whyNow: 'Medication adherence check overdue',
    impact: 'Care gap may remain unresolved',
    action: 'Call Patient',
    payer: 'Blue Cross Blue Shield',
    program: 'Medication therapy management',
    assignedCareManager: 'Sarah L.',
    lastOutreach: '4 days ago',
    lastOutreachOutcome: 'Wrong number',
    careGapType: 'Medication adherence follow-up (HEDIS-aligned)',
    riskContext: 'Chronic condition management requires accurate documentation (HCC)',
    valueImpact: [
      'Supports timely intervention',
      'Prevents unresolved care gaps',
      'Improves documentation continuity'
    ],
    recentActivity: [
      act('10a', 'Adherence outreach queued', 'today'),
      act('10b', 'Pharmacy outreach logged', '4 days ago'),
      act('10c', 'Voicemail left', '1 week ago')
    ]
  }
]
