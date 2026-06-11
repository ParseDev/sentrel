// Tiny human-readable describer for 5-field cron expressions. Covers the
// patterns people actually write in a scheduler UI (fixed times, weekday
// ranges/lists, day-of-month, minute/hour steps). Returns null when it
// can't make sense of the expression — callers show a "custom schedule"
// fallback instead of guessing.

const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const MONTHS = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

function pad(n: number): string {
  return String(n).padStart(2, "0")
}

function dowName(n: number): string | null {
  const i = n === 7 ? 0 : n
  return i >= 0 && i <= 6 ? DOW[i] : null
}

// "1-5" / "1,3,5" / "5" → readable day phrase
function describeDow(field: string): string | null {
  if (field === "*") return null
  const range = field.match(/^(\d)-(\d)$/)
  if (range) {
    const a = dowName(Number(range[1]))
    const b = dowName(Number(range[2]))
    return a && b ? `${a} to ${b}` : null
  }
  const parts = field.split(",").map((p) => dowName(Number(p)))
  if (parts.every(Boolean)) {
    if (parts.length === 1) return `every ${parts[0]}`
    return parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1]
  }
  return null
}

export function describeCron(expr: string): string | null {
  const fields = expr.trim().split(/\s+/)
  if (fields.length !== 5) return null
  const [m, h, dom, mon, dow] = fields

  // Time phrase
  let time: string | null = null
  const minStep = m.match(/^\*\/(\d+)$/)
  const hourStep = h.match(/^\*\/(\d+)$/)
  if (minStep && h === "*") {
    time = `Every ${minStep[1]} minutes`
  } else if (/^\d+$/.test(m) && hourStep) {
    time = `At minute ${m} past every ${hourStep[1]} hours`
  } else if (/^\d+$/.test(m) && h === "*") {
    time = m === "0" ? "Every hour, on the hour" : `At minute ${m} past every hour`
  } else if (/^\d+$/.test(m) && /^\d+$/.test(h)) {
    time = `At ${pad(Number(h))}:${pad(Number(m))}`
  } else {
    return null
  }

  // Day phrase
  let day: string | null = null
  const dowPhrase = describeDow(dow)
  if (dom === "*" && dowPhrase) {
    day = dowPhrase
  } else if (/^\d+$/.test(dom) && dow === "*") {
    day = `on day ${dom} of the month`
  } else if (dom === "*" && dow === "*") {
    day = time.startsWith("At ") ? "every day" : null
  } else if (dom !== "*" || dow !== "*") {
    return null
  }

  // Month phrase
  let month: string | null = null
  if (mon !== "*") {
    if (/^\d+$/.test(mon) && Number(mon) >= 1 && Number(mon) <= 12) {
      month = `in ${MONTHS[Number(mon)]}`
    } else {
      return null
    }
  }

  return [time, day, month].filter(Boolean).join(", ")
}

export const CRON_PRESETS: Array<{ label: string; cron: string }> = [
  { label: "Weekdays at 09:00",        cron: "0 9 * * 1-5" },
  { label: "Weekdays at 08:30",        cron: "30 8 * * 1-5" },
  { label: "Every day at 09:00",       cron: "0 9 * * *" },
  { label: "Every Monday at 09:00",    cron: "0 9 * * 1" },
  { label: "Every Friday at 16:00",    cron: "0 16 * * 5" },
  { label: "1st of the month, 09:00",  cron: "0 9 1 * *" },
  { label: "Every hour",               cron: "0 * * * *" },
]

// IANA zones for the picker — the browser's full list with the user's
// local zone and UTC pinned to the top.
export function timezoneOptions(): string[] {
  const local = Intl.DateTimeFormat().resolvedOptions().timeZone
  let all: string[] = []
  try {
    all = (Intl as unknown as { supportedValuesOf(k: string): string[] }).supportedValuesOf("timeZone")
  } catch {
    all = ["UTC", "Europe/Paris", "Europe/London", "America/New_York", "America/Los_Angeles", "Asia/Dubai", "Asia/Tokyo"]
  }
  const pinned = [local, "UTC"].filter((z, i, a) => z && a.indexOf(z) === i)
  return [...pinned, ...all.filter((z) => !pinned.includes(z))]
}
