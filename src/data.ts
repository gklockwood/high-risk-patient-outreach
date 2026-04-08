export type PatientStatus = 'high_risk' | 'action_required' | 'monitoring'

export type Patient = {
  id: string
  name: string
  status: PatientStatus
  whyNow: string
  impact: string
  action: string
}

export const seedPatients: Patient[] = [
  {
    id: '1',
    name: 'Anderson, Margaret',
    status: 'high_risk',
    whyNow: 'No response after intervention (5+ days overdue)',
    impact: 'High risk of hospitalization',
    action: 'Escalate Now'
  },
  {
    id: '2',
    name: 'Williams, Frank',
    status: 'high_risk',
    whyNow: 'No response after intervention (5+ days overdue)',
    impact: 'Escalation required to prevent worsening condition',
    action: 'Escalate Now'
  },
  {
    id: '3',
    name: 'Vargas, Daniel',
    status: 'high_risk',
    whyNow: 'No contact after discharge follow-up window',
    impact: 'Care gap remains open and readmission risk is elevated',
    action: 'Call Patient'
  },
  {
    id: '4',
    name: 'Patel, Christopher',
    status: 'action_required',
    whyNow: 'No improvement after intervention',
    impact: 'Follow-up needed to prevent treatment delay',
    action: 'Schedule Follow-up'
  },
  {
    id: '5',
    name: 'Nguyen, Ava',
    status: 'monitoring',
    whyNow: 'Recent medication adjustment',
    impact: 'Monitoring for stability',
    action: 'Check In'
  },
  {
    id: '6',
    name: 'Rivera, Sofia',
    status: 'action_required',
    whyNow: 'Missed follow-up appointment',
    impact: 'Care plan progression may stall',
    action: 'Call Patient'
  },
  {
    id: '7',
    name: 'Brooks, James',
    status: 'monitoring',
    whyNow: 'Recently documented symptom improvement',
    impact: 'No immediate action needed',
    action: 'View Details'
  },
  {
    id: '8',
    name: 'Kim, Hannah',
    status: 'action_required',
    whyNow: 'Lab review due today',
    impact: 'Treatment decision pending',
    action: 'Review Labs'
  },
  {
    id: '9',
    name: 'Torres, Elena',
    status: 'monitoring',
    whyNow: 'Observation period in progress',
    impact: 'Continue monitoring for progression',
    action: 'Check In'
  },
  {
    id: '10',
    name: 'Murphy, Liam',
    status: 'action_required',
    whyNow: 'Medication adherence check overdue',
    impact: 'Care gap may remain unresolved',
    action: 'Call Patient'
  }
]
