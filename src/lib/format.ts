export function formatDuration(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const pad = (n: number) => n.toString().padStart(2, "0")
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

export function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
}

export const formatKg = (n: number) =>
  `${Number.isInteger(n) ? n : n.toFixed(1)} kg`

export const formatVolume = (kg: number) =>
  kg >= 1000 ? `${(kg / 1000).toFixed(1)} t` : `${Math.round(kg)} kg`

/** Parse a numeric input value, treating empty/invalid as 0. */
export const num = (v: string) => {
  const n = parseFloat(v.replace(",", "."))
  return Number.isFinite(n) && n >= 0 ? n : 0
}
