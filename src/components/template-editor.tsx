import { useState } from "react"
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react"
import { Button } from "./ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { knownExerciseNames, saveTemplate, uid, useDb } from "../lib/store"
import { num } from "../lib/format"
import type { TemplateExercise, WorkoutTemplate } from "../lib/types"

const newExercise = (): TemplateExercise => ({
  id: uid(),
  name: "",
  sets: 3,
  reps: 10,
  weight: 0,
  restSec: 90,
})

const blankTemplate = (): WorkoutTemplate => ({
  id: uid(),
  name: "",
  notes: "",
  exercises: [newExercise()],
  createdAt: Date.now(),
  updatedAt: Date.now(),
})

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: WorkoutTemplate | null
}

export function TemplateEditor({ open, onOpenChange, template }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        {/* Keyed so the form state resets whenever a different template is opened. */}
        {open && (
          <EditorForm
            key={template?.id ?? "new"}
            initial={template ?? blankTemplate()}
            isNew={!template}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function EditorForm({
  initial,
  isNew,
  onDone,
}: {
  initial: WorkoutTemplate
  isNew: boolean
  onDone: () => void
}) {
  const db = useDb()
  const [draft, setDraft] = useState<WorkoutTemplate>(initial)
  const suggestions = knownExerciseNames(db)

  const updateExercise = (id: string, patch: Partial<TemplateExercise>) =>
    setDraft((d) => ({
      ...d,
      exercises: d.exercises.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }))

  const move = (index: number, dir: -1 | 1) =>
    setDraft((d) => {
      const target = index + dir
      if (target < 0 || target >= d.exercises.length) return d
      const exercises = [...d.exercises]
      ;[exercises[index], exercises[target]] = [exercises[target], exercises[index]]
      return { ...d, exercises }
    })

  const validExercises = draft.exercises.filter((e) => e.name.trim())
  const canSave = draft.name.trim() !== "" && validExercises.length > 0

  const handleSave = () => {
    if (!canSave) return
    saveTemplate({
      ...draft,
      name: draft.name.trim(),
      exercises: validExercises.map((e) => ({ ...e, name: e.name.trim() })),
    })
    onDone()
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isNew ? "New workout" : "Edit workout"}</DialogTitle>
        <DialogDescription>Plan the exercises, sets, reps and starting weights.</DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tpl-name">Name</Label>
          <Input
            id="tpl-name"
            placeholder="e.g. Push day"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tpl-notes">Notes</Label>
          <Textarea
            id="tpl-notes"
            placeholder="Optional"
            rows={2}
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          />
        </div>

        <div className="space-y-3">
          <Label>Exercises</Label>
          <datalist id="exercise-suggestions">
            {suggestions.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
          {draft.exercises.map((ex, i) => (
            <div key={ex.id} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center gap-1">
                <Input
                  aria-label="Exercise name"
                  placeholder="Exercise name"
                  list="exercise-suggestions"
                  value={ex.name}
                  onChange={(e) => updateExercise(ex.id, { name: e.target.value })}
                />
                <Button variant="ghost" size="icon" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">
                  <ArrowUp />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => move(i, 1)}
                  disabled={i === draft.exercises.length - 1}
                  aria-label="Move down"
                >
                  <ArrowDown />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remove exercise"
                  onClick={() =>
                    setDraft((d) => ({ ...d, exercises: d.exercises.filter((e) => e.id !== ex.id) }))
                  }
                >
                  <Trash2 />
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <NumberField label="Sets" value={ex.sets} onChange={(v) => updateExercise(ex.id, { sets: Math.round(v) })} />
                <NumberField label="Reps" value={ex.reps} onChange={(v) => updateExercise(ex.id, { reps: Math.round(v) })} />
                <NumberField label="Kg" value={ex.weight} step={0.5} onChange={(v) => updateExercise(ex.id, { weight: v })} />
                <NumberField label="Rest s" value={ex.restSec} step={15} onChange={(v) => updateExercise(ex.id, { restSec: Math.round(v) })} />
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setDraft((d) => ({ ...d, exercises: [...d.exercises, newExercise()] }))}
          >
            <Plus /> Add exercise
          </Button>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!canSave}>
          Save
        </Button>
      </DialogFooter>
    </>
  )
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  step?: number
}) {
  return (
    <label className="space-y-1">
      <span className="text-muted-foreground text-xs">{label}</span>
      <Input
        type="number"
        inputMode="decimal"
        min={0}
        step={step}
        value={value === 0 ? "" : value}
        placeholder="0"
        onChange={(e) => onChange(num(e.target.value))}
      />
    </label>
  )
}
