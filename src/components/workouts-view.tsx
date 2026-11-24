import { useState } from "react"
import { Dumbbell, Pencil, Play, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { ConfirmDialog } from "./confirm-dialog"
import { TemplateEditor } from "./template-editor"
import { deleteTemplate, startSession, useDb } from "../lib/store"
import { formatDate, formatKg } from "../lib/format"
import type { WorkoutTemplate } from "../lib/types"

export function WorkoutsView({ onStarted }: { onStarted: () => void }) {
  const db = useDb()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<WorkoutTemplate | null>(null)

  const openEditor = (t: WorkoutTemplate | null) => {
    setEditing(t)
    setEditorOpen(true)
  }

  const start = (t: WorkoutTemplate | null) => {
    if (db.activeSession) {
      toast.error("Finish or discard your current workout first.")
      onStarted()
      return
    }
    startSession(t)
    onStarted()
  }

  const lastDone = (templateId: string) => {
    for (let i = db.sessions.length - 1; i >= 0; i--) {
      if (db.sessions[i].templateId === templateId) return db.sessions[i].finishedAt
    }
    return null
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button className="flex-1" onClick={() => openEditor(null)}>
          <Plus /> New workout
        </Button>
        <Button variant="secondary" className="flex-1" onClick={() => start(null)}>
          <Play /> Quick start
        </Button>
      </div>

      {db.templates.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground flex flex-col items-center gap-3 py-10 text-center">
            <Dumbbell className="size-10 opacity-50" />
            <p>No workouts yet. Design your first routine to get started.</p>
          </CardContent>
        </Card>
      ) : (
        db.templates.map((t) => {
          const last = lastDone(t.id)
          return (
            <Card key={t.id}>
              <CardHeader>
                <CardTitle>{t.name}</CardTitle>
                <CardDescription>
                  {t.exercises.length} exercise{t.exercises.length === 1 ? "" : "s"}
                  {last ? ` · last done ${formatDate(last)}` : ""}
                </CardDescription>
                <CardAction className="flex gap-1">
                  <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => openEditor(t)}>
                    <Pencil />
                  </Button>
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="icon" aria-label="Delete">
                        <Trash2 />
                      </Button>
                    }
                    title={`Delete "${t.name}"?`}
                    description="Your workout history is kept. This only removes the plan."
                    confirmLabel="Delete"
                    destructive
                    onConfirm={() => deleteTemplate(t.id)}
                  />
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-3">
                {t.notes && <p className="text-muted-foreground text-sm">{t.notes}</p>}
                <ul className="space-y-1 text-sm">
                  {t.exercises.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-2">
                      <span className="truncate">{e.name}</span>
                      <Badge variant="secondary" className="shrink-0 tabular-nums">
                        {e.sets} × {e.reps}
                        {e.weight > 0 ? ` @ ${formatKg(e.weight)}` : ""}
                      </Badge>
                    </li>
                  ))}
                </ul>
                <Button className="w-full" onClick={() => start(t)}>
                  <Play /> Start
                </Button>
              </CardContent>
            </Card>
          )
        })
      )}

      <TemplateEditor open={editorOpen} onOpenChange={setEditorOpen} template={editing} />
    </div>
  )
}
