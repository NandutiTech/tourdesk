import { useStore, getToken } from './store'
import { AppState } from './types'

export async function syncToCloud(): Promise<boolean> {
  const token = getToken()
  if (!token) return false

  const state = useStore.getState()
  const payload = {
    artists: state.artists,
    tours: state.tours,
    meetings: state.meetings,
    subs: state.subs,
    trips: state.trips,
    expenses: state.expenses,
    guests: state.guests,
    contacts: state.contacts,
    mgrTours: state.mgrTours,
    cachets: state.cachets,
    artistHours: state.artistHours,
    hoursGoal: state.hoursGoal,
    hoursPerEventType: state.hoursPerEventType,
    calY: state.calY,
    calM: state.calM,
    earnY: state.earnY,
    earnM: state.earnM,
  }

  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ action: 'saveAll', data: payload })
    })
    const data = await res.json()
    return data.success === true
  } catch {
    return false
  }
}

export async function loadFromCloud(): Promise<Partial<AppState> | null> {
  const token = getToken()
  if (!token) return null

  try {
    const res = await fetch('/api/sync', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
    const data = await res.json()
    if (data.error) return null
    return data
  } catch {
    return null
  }
}

export async function callClaude(messages: any[], maxTokens = 1000): Promise<any> {
  const token = getToken()
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      messages
    })
  })
  return res.json()
}
