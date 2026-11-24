import { useState } from "react"
import { Dumbbell, History, Timer } from "lucide-react"
import { Toaster } from "./components/ui/sonner"
import { WorkoutsView } from "./components/workouts-view"
import { SessionView } from "./components/session-view"
import { HistoryView } from "./components/history-view"
import { useDb } from "./lib/store"
import { cn } from "./lib/utils"

type View = "workouts" | "session" | "history"

const NAV: { id: View; label: string; icon: typeof Dumbbell }[] = [
  { id: "workouts", label: "Workouts", icon: Dumbbell },
  { id: "session", label: "Train", icon: Timer },
  { id: "history", label: "History", icon: History },
]

const TITLES: Record<View, string> = {
  workouts: "Workouts",
  session: "Train",
  history: "History",
}

export default function App() {
  const db = useDb()
  const [view, setView] = useState<View>(() => (db.activeSession ? "session" : "workouts"))

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="bg-background/80 sticky top-0 z-30 border-b px-4 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="flex h-14 items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">{TITLES[view]}</h1>
          <span className="text-primary font-script text-2xl">zifit</span>
        </div>
      </header>

      <main className="flex-1 px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))]">
        {view === "workouts" && <WorkoutsView onStarted={() => setView("session")} />}
        {view === "session" && <SessionView onFinished={() => setView("history")} />}
        {view === "history" && <HistoryView />}
      </main>

      <nav className="bg-background/90 fixed inset-x-0 bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-3">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              aria-current={view === id ? "page" : undefined}
              className={cn(
                "relative flex h-16 flex-col items-center justify-center gap-1 text-xs transition-colors",
                view === id ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-5" />
              {label}
              {id === "session" && db.activeSession && (
                <span className="bg-primary absolute top-3 right-[calc(50%-1rem)] size-2 animate-pulse rounded-full" />
              )}
            </button>
          ))}
        </div>
      </nav>

      <Toaster position="top-center" />
    </div>
  )
}
