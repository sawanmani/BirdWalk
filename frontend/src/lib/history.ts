import type { Mission, Prediction } from './types'

// Local-only session history (ALIGNMENT.md: no account, no database).
// Stored in browser localStorage; the user can delete everything.

export interface SessionRecord {
  id: string
  createdAt: string
  source: 'recording' | 'upload' | 'sample'
  sourceLabel?: string | null
  topPrediction: Pick<Prediction, 'species_common_name' | 'model_score'> | null
  uncertain: boolean
  mission?: Pick<Mission, 'id' | 'title' | 'category'> | null
  missionCompleted: boolean
  isDemoFixture: boolean
}

const KEY = 'birdwalk.sessions.v1'

export function loadSessions(): SessionRecord[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as SessionRecord[]) : []
  } catch {
    return []
  }
}

export function saveSession(record: SessionRecord): SessionRecord[] {
  const existing = loadSessions()
  const without = existing.filter((s) => s.id !== record.id)
  const next = [record, ...without].slice(0, 100)
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* storage full or blocked; history is best-effort only */
  }
  return next
}

export function markMissionCompleted(id: string): SessionRecord[] {
  const next = loadSessions().map((s) =>
    s.id === id ? { ...s, missionCompleted: true } : s,
  )
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  return next
}

export function clearSessions(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

export function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `s_${Date.now()}_${Math.random().toString(16).slice(2)}`
}
