export interface ExpiryInfo {
  isoDate: string   // serializable — no Date objects cross the server/client boundary
  label: string     // e.g. "26 Jun"
  dte: number       // calendar days to expiry
  isMonthly: boolean
}

function dteDays(from: Date, to: Date): number {
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000))
}

function nextDayOfWeek(from: Date, dow: number): Date {
  const d = new Date(from)
  d.setHours(15, 30, 0, 0) // NSE close
  const diff = (dow - d.getDay() + 7) % 7
  d.setDate(d.getDate() + (diff === 0 ? 7 : diff))
  return d
}

function lastThursdayOfMonth(year: number, month: number): Date {
  const last = new Date(year, month + 1, 0, 15, 30, 0, 0)
  const diff = (last.getDay() - 4 + 7) % 7
  last.setDate(last.getDate() - diff)
  return last
}

function toInfo(expiry: Date, now: Date, isMonthly: boolean): ExpiryInfo {
  return {
    isoDate: expiry.toISOString(),
    label: expiry.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    dte: dteDays(now, expiry),
    isMonthly,
  }
}

function monthlyFallback(now: Date): ExpiryInfo {
  const nm = now.getMonth() + 1 > 11 ? 0 : now.getMonth() + 1
  const ny = now.getMonth() + 1 > 11 ? now.getFullYear() + 1 : now.getFullYear()
  return toInfo(lastThursdayOfMonth(ny, nm), now, true)
}

export function getNiftyExpiry(): ExpiryInfo {
  const now = new Date()
  const weekly = nextDayOfWeek(now, 4) // Thursday
  if (dteDays(now, weekly) >= 7) return toInfo(weekly, now, false)
  return monthlyFallback(now)
}

export function getBankNiftyExpiry(): ExpiryInfo {
  const now = new Date()
  const weekly = nextDayOfWeek(now, 3) // Wednesday
  if (dteDays(now, weekly) >= 7) return toInfo(weekly, now, false)
  return monthlyFallback(now)
}
