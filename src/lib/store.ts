import { useSyncExternalStore } from "react"
import type {
  Database,
  LoggedSet,
  SessionExercise,
  WorkoutSession,
  WorkoutTemplate,
} from "./types"

const STORAGE_KEY = "zifit:db"

const emptyDb = (): Database => ({
  version: 1,
  templates: [],
  sessions: [],
  activeSession: null,
})

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)

function isDatabase(value: unknown): value is Database {
  if (!value || typeof value !== "object") return false
  const v = value as Partial<Database>
  return Array.isArray(v.templates) && Array.isArray(v.sessions)
}

function load(): Database {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyDb()
    const parsed: unknown = JSON.parse(raw)
    return isDatabase(parsed) ? { ...emptyDb(), ...parsed } : emptyDb()
  } catch {
    return emptyDb()
  }
}

let state: Database = load()
const listeners = new Set<() => void>()

function setState(updater: (db: Database) => Database) {
  state = updater(state)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Keep multiple open tabs/windows in sync.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return
    state = load()
    listeners.forEach((l) => l())
  })
}

export function useDb(): Database {
  return useSyncExternalStore(subscribe, () => state)
}

// ---------- Templates ----------

export function saveTemplate(template: WorkoutTemplate) {
  setState((db) => {
    const exists = db.templates.some((t) => t.id === template.id)
    const next = { ...template, updatedAt: Date.now() }
    return {
      ...db,
      templates: exists
        ? db.templates.map((t) => (t.id === template.id ? next : t))
        : [...db.templates, next],
    }
  })
}

export function deleteTemplate(id: string) {
  setState((db) => ({ ...db, templates: db.templates.filter((t) => t.id !== id) }))
}

// ---------- Sessions ----------

/** Most recent completed sets for an exercise name (case-insensitive). */
export function lastPerformance(db: Database, name: string): LoggedSet[] | null {
  const key = name.trim().toLowerCase()
  for (let i = db.sessions.length - 1; i >= 0; i--) {
    const ex = db.sessions[i].exercises.find((e) => e.name.trim().toLowerCase() === key)
    const done = ex?.sets.filter((s) => s.done)
    if (done && done.length) return done
  }
  return null
}

export function startSession(template: WorkoutTemplate | null) {
  setState((db) => {
    if (db.activeSession) return db
    const exercises: SessionExercise[] = (template?.exercises ?? []).map((te) => {
      const prev = lastPerformance(db, te.name)
      return {
        id: uid(),
        name: te.name,
        restSec: te.restSec,
        sets: Array.from({ length: Math.max(1, te.sets) }, (_, i) => ({
          id: uid(),
          reps: te.reps,
          // Prefer last logged weight for that set, falling back to the plan.
          weight: prev?.[i]?.weight ?? prev?.[prev.length - 1]?.weight ?? te.weight,
          done: false,
        })),
      }
    })
    const session: WorkoutSession = {
      id: uid(),
      templateId: template?.id ?? null,
      name: template?.name ?? "Quick workout",
      notes: "",
      startedAt: Date.now(),
      finishedAt: null,
      exercises,
    }
    return { ...db, activeSession: session }
  })
}

export function updateActiveSession(updater: (s: WorkoutSession) => WorkoutSession) {
  setState((db) => (db.activeSession ? { ...db, activeSession: updater(db.activeSession) } : db))
}

export function finishSession() {
  setState((db) => {
    if (!db.activeSession) return db
    const exercises = db.activeSession.exercises
      .map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) }))
      .filter((e) => e.sets.length > 0)
    const finished: WorkoutSession = {
      ...db.activeSession,
      exercises,
      finishedAt: Date.now(),
    }
    return { ...db, activeSession: null, sessions: [...db.sessions, finished] }
  })
}

export function discardSession() {
  setState((db) => ({ ...db, activeSession: null }))
}

export function deleteSession(id: string) {
  setState((db) => ({ ...db, sessions: db.sessions.filter((s) => s.id !== id) }))
}

// ---------- Backup ----------

export function exportDb(): string {
  return JSON.stringify(state, null, 2)
}

export function importDb(json: string) {
  const parsed: unknown = JSON.parse(json)
  if (!isDatabase(parsed)) throw new Error("Invalid backup file")
  setState(() => ({ ...emptyDb(), ...parsed }))
}

// ---------- Helpers ----------

export const sessionVolume = (s: WorkoutSession) =>
  s.exercises.reduce(
    (sum, e) => sum + e.sets.reduce((acc, set) => acc + (set.done ? set.weight * set.reps : 0), 0),
    0,
  )

export function knownExerciseNames(db: Database): string[] {
  const names = new Map<string, string>()
  const add = (n: string) => {
    const k = n.trim().toLowerCase()
    if (k && !names.has(k)) names.set(k, n.trim())
  }
  db.templates.forEach((t) => t.exercises.forEach((e) => add(e.name)))
  db.sessions.forEach((s) => s.exercises.forEach((e) => add(e.name)))
  return [...names.values()].sort((a, b) => a.localeCompare(b))
}
