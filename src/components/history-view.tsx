import { useMemo, useRef, useState } from "react"
import { CalendarDays, Download, History, Trash2, Trophy, Upload } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog"
import { Separator } from "./ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { ConfirmDialog } from "./confirm-dialog"
import { deleteSession, exportDb, importDb, sessionVolume, useDb } from "../lib/store"
import { formatDate, formatDuration, formatKg, formatVolume } from "../lib/format"
import type { WorkoutSession } from "../lib/types"

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export function HistoryView() {
  const db = useDb()
  const [selected, setSelected] = useState<WorkoutSession | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const sessions = useMemo(() => [...db.sessions].reverse(), [db.sessions])
  const [openedAt] = useState(() => Date.now())

  const stats = useMemo(() => {
    const weekAgo = openedAt - WEEK_MS
    return {
      total: db.sessions.length,
      thisWeek: db.sessions.filter((s) => (s.finishedAt ?? 0) >= weekAgo).length,
      volume: db.sessions.reduce((sum, s) => sum + sessionVolume(s), 0),
    }
  }, [db.sessions, openedAt])

  const records = useMemo(() => {
    const map = new Map<string, { name: string; best: number; bestReps: number; last: number; count: number }>()
    for (const s of db.sessions) {
      for (const e of s.exercises) {
        const key = e.name.trim().toLowerCase()
        const r = map.get(key) ?? { name: e.name, best: 0, bestReps: 0, last: 0, count: 0 }
        r.count += 1
        r.last = Math.max(r.last, s.finishedAt ?? s.startedAt)
        for (const set of e.sets) {
          if (set.weight > r.best || (set.weight === r.best && set.reps > r.bestReps)) {
            r.best = set.weight
            r.bestReps = set.reps
          }
        }
        map.set(key, r)
      }
    }
    return [...map.values()].sort((a, b) => b.last - a.last)
  }, [db.sessions])

  const handleExport = () => {
    const blob = new Blob([exportDb()], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `zifit-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (file: File) => {
    try {
      importDb(await file.text())
      toast.success("Backup restored")
    } catch {
      toast.error("Could not read that backup file")
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Workouts" value={stats.total.toString()} />
        <Stat label="Last 7 days" value={stats.thisWeek.toString()} />
        <Stat label="Volume" value={formatVolume(stats.volume)} />
      </div>

      <Tabs defaultValue="sessions">
        <TabsList className="w-full">
          <TabsTrigger value="sessions">
            <CalendarDays /> Sessions
          </TabsTrigger>
          <TabsTrigger value="records">
            <Trophy /> Exercises
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-3">
          {sessions.length === 0 ? (
            <EmptyState text="Finished workouts will show up here." />
          ) : (
            sessions.map((s) => (
              <Card
                key={s.id}
                className="hover:bg-accent/50 cursor-pointer gap-2 py-4 transition-colors"
                onClick={() => setSelected(s)}
              >
                <CardHeader>
                  <CardTitle>{s.name}</CardTitle>
                  <CardDescription>
                    {formatDate(s.startedAt)} · {formatDuration((s.finishedAt ?? s.startedAt) - s.startedAt)}
                  </CardDescription>
                  <CardAction>
                    <Badge variant="secondary">{formatVolume(sessionVolume(s))}</Badge>
                  </CardAction>
                </CardHeader>
                <CardContent className="text-muted-foreground truncate text-sm">
                  {s.exercises.map((e) => `${e.sets.length}× ${e.name}`).join(" · ")}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="records" className="space-y-2">
          {records.length === 0 ? (
            <EmptyState text="Personal bests per exercise will show up here." />
          ) : (
            <Card className="py-2">
              <CardContent className="divide-y px-4">
                {records.map((r) => (
                  <div key={r.name} className="flex items-center justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{r.name}</div>
                      <div className="text-muted-foreground text-xs">
                        {r.count} session{r.count === 1 ? "" : "s"} · last {formatDate(r.last)}
                      </div>
                    </div>
                    <Badge className="shrink-0 tabular-nums">
                      <Trophy /> {formatKg(r.best)} × {r.bestReps}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Separator />

      <div className="space-y-2">
        <p className="text-muted-foreground text-xs">
          Data is stored only on this device. Export a backup to move it or keep it safe.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={handleExport}>
            <Download /> Export
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="outline" className="flex-1">
                <Upload /> Import
              </Button>
            }
            title="Restore from backup?"
            description="This replaces all workouts and history on this device with the backup's contents."
            confirmLabel="Choose file"
            onConfirm={() => fileRef.current?.click()}
          />
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleImport(file)
              e.target.value = ""
            }}
          />
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.name}</DialogTitle>
                <DialogDescription>
                  {new Date(selected.startedAt).toLocaleString()} ·{" "}
                  {formatDuration((selected.finishedAt ?? selected.startedAt) - selected.startedAt)} ·{" "}
                  {formatVolume(sessionVolume(selected))}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {selected.exercises.map((e) => (
                  <div key={e.id}>
                    <div className="mb-1 font-medium">{e.name}</div>
                    <ol className="text-muted-foreground space-y-0.5 text-sm tabular-nums">
                      {e.sets.map((set, i) => (
                        <li key={set.id}>
                          {i + 1}. {formatKg(set.weight)} × {set.reps}
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
                {selected.notes && (
                  <p className="bg-muted rounded-md p-3 text-sm whitespace-pre-wrap">{selected.notes}</p>
                )}
                <ConfirmDialog
                  trigger={
                    <Button variant="outline" className="text-destructive w-full">
                      <Trash2 /> Delete session
                    </Button>
                  }
                  title="Delete this session?"
                  description="This can't be undone."
                  confirmLabel="Delete"
                  destructive
                  onConfirm={() => {
                    deleteSession(selected.id)
                    setSelected(null)
                  }}
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="gap-1 py-3">
      <CardContent className="px-3">
        <div className="text-xl font-semibold tabular-nums">{value}</div>
        <div className="text-muted-foreground text-xs">{label}</div>
      </CardContent>
    </Card>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card>
      <CardContent className="text-muted-foreground flex flex-col items-center gap-3 py-10 text-center">
        <History className="size-10 opacity-50" />
        <p>{text}</p>
      </CardContent>
    </Card>
  )
}
