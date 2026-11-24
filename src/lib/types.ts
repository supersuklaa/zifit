export interface TemplateExercise {
  id: string
  name: string
  sets: number
  reps: number
  weight: number
  restSec: number
}

export interface WorkoutTemplate {
  id: string
  name: string
  notes: string
  exercises: TemplateExercise[]
  createdAt: number
  updatedAt: number
}

export interface LoggedSet {
  id: string
  reps: number
  weight: number
  done: boolean
}

export interface SessionExercise {
  id: string
  name: string
  restSec: number
  sets: LoggedSet[]
}

export interface WorkoutSession {
  id: string
  templateId: string | null
  name: string
  notes: string
  startedAt: number
  finishedAt: number | null
  exercises: SessionExercise[]
}

export interface Database {
  version: 1
  templates: WorkoutTemplate[]
  sessions: WorkoutSession[]
  activeSession: WorkoutSession | null
}
