import { useEffect, useState } from "react"
import { Check, Flag, Play, Plus, Timer, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "./ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Input } from "./ui/input"
import { Textarea } from "./ui/textarea"
import { ConfirmDialog } from "./confirm-dialog"
import {
  discardSession,
  finishSession,
  knownExerciseNames,
  lastPerformance,
  startSession,
  uid,
  updateActiveSession,
  useDb,
} from "../lib/store"
import { formatDuration, num } from "../lib/format"
import type { LoggedSet, SessionExercise } from "../lib/types"
import { cn } from "../lib/utils"

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

export function SessionView({ onFinished }: { onFinished: () => void }) {
  const db = useDb()
  const session = db.activeSession
  const now = useNow()
  const [restUntil, setRestUntil] = useState<number | null>(null)
  const [newExercise, setNewExercise] = useState("")

  const restLeft = restUntil ? Math.ceil((restUntil - now) / 1000) : 0
  useEffect(() => {
    if (!restUntil) return
    const id = setTimeout(() => {
      setRestUntil(null)
      navigator.vibrate?.([200, 100, 200])
      toast("Rest over. Next set!")
    }, Math.max(0, restUntil - Date.now()))
    return () => clearTimeout(id)
  }, [restUntil])

  if (!session) {
    return (
      <Card>
        <CardContent className="text-muted-foreground flex flex-col items-center gap-3 py-10 text-center">
          <Timer className="size-10 opacity-50" />
          <p>No workout in progress.</p>
          <Button onClick={() => startSession(null)}>
            <Play /> Start empty workout
          </Button>
        </CardContent>
      </Card>
    )
  }

  const updateExercise = (exId: string, fn: (e: SessionExercise) => SessionExercise) =>
    updateActiveSession((s) => ({
      ...s,
      exercises: s.exercises.map((e) => (e.id === exId ? fn(e) : e)),
    }))

  const updateSet = (exId: string, setId: string, patch: Partial<LoggedSet>) =>
    updateExercise(exId, (e) => ({
      ...e,
      sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
    }))

  const toggleDone = (ex: SessionExercise, set: LoggedSet) => {
    const done = !set.done
    updateSet(ex.id, set.id, { done })
    if (done && ex.restSec > 0) setRestUntil(Date.now() + ex.restSec * 1000)
  }

  const addExercise = () => {
    const name = newExercise.trim()
    if (!name) return
    const prev = lastPerformance(db, name)
    updateActiveSession((s) => ({
      ...s,
      exercises: [
        ...s.exercises,
        {
          id: uid(),
          name,
          restSec: 90,
          sets: (prev ?? [{ reps: 10, weight: 0 }]).map((p) => ({
            id: uid(),
            reps: p.reps,
            weight: p.weight,
            done: false,
          })),
        },
      ],
    }))
    setNewExercise("")
  }

  const totalSets = session.exercises.reduce((n, e) => n + e.sets.length, 0)
  const doneSets = session.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)

  const finish = () => {
    if (doneSets === 0) {
      toast.error("Complete at least one set, or discard the workout.")
      return
    }
    finishSession()
    toast.success("Workout saved 💪")
    onFinished()
  }

  return (
    <div className="space-y-4 pb-20">
      <Card>
        <CardHeader>
          <CardTitle>
            <Input
              aria-label="Workout name"
              className="h-auto border-none bg-transparent! p-0 text-lg font-semibold shadow-none focus-visible:ring-0"
              value={session.name}
              onChange={(e) => updateActiveSession((s) => ({ ...s, name: e.target.value }))}
            />
          </CardTitle>
          <CardAction className="text-primary font-mono text-lg tabular-nums">
            {formatDuration(now - session.startedAt)}
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-muted-foreground text-sm">
            {doneSets} / {totalSets} sets done
          </div>
          <div className="bg-secondary h-2 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full transition-all"
              style={{ width: `${totalSets ? (doneSets / totalSets) * 100 : 0}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {session.exercises.map((ex) => {
        const prev = lastPerformance(db, ex.name)
        return (
          <Card key={ex.id} className="gap-3">
            <CardHeader>
              <CardTitle>{ex.name}</CardTitle>
              <CardAction>
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="icon" aria-label="Remove exercise">
                      <Trash2 />
                    </Button>
                  }
                  title={`Remove ${ex.name}?`}
                  description="All sets for this exercise in the current workout will be removed."
                  confirmLabel="Remove"
                  destructive
                  onConfirm={() =>
                    updateActiveSession((s) => ({
                      ...s,
                      exercises: s.exercises.filter((e) => e.id !== ex.id),
                    }))
                  }
                />
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-muted-foreground grid grid-cols-[2rem_1fr_1fr_1fr_2.5rem] items-center gap-2 text-xs">
                <span>Set</span>
                <span>Previous</span>
                <span>Kg</span>
                <span>Reps</span>
                <span />
              </div>
              {ex.sets.map((set, i) => {
                const p = prev?.[i]
                return (
                  <div
                    key={set.id}
                    className={cn(
                      "grid grid-cols-[2rem_1fr_1fr_1fr_2.5rem] items-center gap-2 rounded-md transition-colors",
                      set.done && "bg-primary/10",
                    )}
                  >
                    <button
                      className="text-muted-foreground text-center text-sm font-medium"
                      aria-label="Remove set"
                      title="Tap to remove set"
                      onClick={() =>
                        updateExercise(ex.id, (e) => ({ ...e, sets: e.sets.filter((s) => s.id !== set.id) }))
                      }
                    >
                      {i + 1}
                    </button>
                    <span className="text-muted-foreground truncate text-xs tabular-nums">
                      {p ? `${p.weight}×${p.reps}` : "–"}
                    </span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step={0.5}
                      min={0}
                      aria-label={`Set ${i + 1} weight`}
                      className="h-9 text-center tabular-nums"
                      value={set.weight === 0 ? "" : set.weight}
                      placeholder="0"
                      onChange={(e) => updateSet(ex.id, set.id, { weight: num(e.target.value) })}
                    />
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      aria-label={`Set ${i + 1} reps`}
                      className="h-9 text-center tabular-nums"
                      value={set.reps === 0 ? "" : set.reps}
                      placeholder="0"
                      onChange={(e) => updateSet(ex.id, set.id, { reps: Math.round(num(e.target.value)) })}
                    />
                    <Button
                      size="icon"
                      variant={set.done ? "default" : "secondary"}
                      aria-label={set.done ? "Mark set not done" : "Mark set done"}
                      onClick={() => toggleDone(ex, set)}
                    >
                      <Check />
                    </Button>
                  </div>
                )
              })}
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() =>
                  updateExercise(ex.id, (e) => {
                    const last = e.sets[e.sets.length - 1]
                    return {
                      ...e,
                      sets: [
                        ...e.sets,
                        { id: uid(), reps: last?.reps ?? 10, weight: last?.weight ?? 0, done: false },
                      ],
                    }
                  })
                }
              >
                <Plus /> Add set
              </Button>
            </CardContent>
          </Card>
        )
      })}

      <Card>
        <CardContent className="space-y-3">
          <datalist id="session-exercise-suggestions">
            {knownExerciseNames(db).map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              addExercise()
            }}
          >
            <Input
              placeholder="Add exercise…"
              list="session-exercise-suggestions"
              value={newExercise}
              onChange={(e) => setNewExercise(e.target.value)}
            />
            <Button type="submit" variant="secondary" disabled={!newExercise.trim()}>
              <Plus /> Add
            </Button>
          </form>
          <Textarea
            placeholder="Workout notes (optional)"
            rows={2}
            value={session.notes}
            onChange={(e) => updateActiveSession((s) => ({ ...s, notes: e.target.value }))}
          />
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <ConfirmDialog
          trigger={
            <Button variant="outline" className="flex-1">
              <X /> Discard
            </Button>
          }
          title="Discard workout?"
          description="Nothing from this workout will be saved."
          confirmLabel="Discard"
          destructive
          onConfirm={() => {
            discardSession()
            setRestUntil(null)
          }}
        />
        <Button className="flex-1" onClick={finish}>
          <Flag /> Finish
        </Button>
      </div>

      {restUntil && restLeft > 0 && (
        <div className="bg-card fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md items-center justify-between rounded-xl border p-3 shadow-lg">
          <div className="flex items-center gap-2">
            <Timer className="text-primary size-5" />
            <span className="text-sm">Rest</span>
            <span className="font-mono text-lg tabular-nums">{formatDuration(restLeft * 1000)}</span>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="secondary" onClick={() => setRestUntil((t) => (t ?? Date.now()) + 15000)}>
              +15s
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setRestUntil(null)}>
              Skip
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
