const DAY_CODES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

export type ScheduleConfig = {
  sendWindowStart: string; // "09:00"
  sendWindowEnd: string; // "17:00"
  sendDaysOfWeek: string; // "MON,TUE,WED,THU,FRI"
  maxSendsPerDay: number;
  minDelaySeconds: number;
  maxDelaySeconds: number;
  startAt?: Date | null;
};

function parseTimeOnDay(day: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  const d = new Date(day);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Distributes `count` sends across the configured sending window, respecting
 * per-day caps and a randomized delay between sends — no burst sending
 * (spec section 22). Purely a scheduling calculation; actual dispatch
 * happens in the send queue processor once `scheduledAt` has passed.
 */
export function computeSendSchedule(count: number, config: ScheduleConfig): Date[] {
  const allowedDays = new Set(
    config.sendDaysOfWeek
      .split(",")
      .map((d) => d.trim().toUpperCase())
      .filter(Boolean),
  );

  const results: Date[] = [];
  const cursorDay = new Date(config.startAt && config.startAt > new Date() ? config.startAt : new Date());
  cursorDay.setSeconds(0, 0);

  let sentToday = 0;
  let cursor = new Date(cursorDay);

  // Move cursor forward to the first allowed day/time.
  function isAllowedDay(d: Date) {
    return allowedDays.size === 0 || allowedDays.has(DAY_CODES[d.getDay()]);
  }

  function advanceToNextAllowedWindowStart(from: Date): Date {
    const next = new Date(from);
    next.setDate(next.getDate() + 1);
    while (!isAllowedDay(next)) {
      next.setDate(next.getDate() + 1);
    }
    return parseTimeOnDay(next, config.sendWindowStart);
  }

  if (!isAllowedDay(cursor)) {
    cursor = advanceToNextAllowedWindowStart(cursor);
  } else {
    const windowStart = parseTimeOnDay(cursor, config.sendWindowStart);
    const windowEnd = parseTimeOnDay(cursor, config.sendWindowEnd);
    if (cursor < windowStart) cursor = windowStart;
    if (cursor > windowEnd) cursor = advanceToNextAllowedWindowStart(cursor);
  }

  while (results.length < count) {
    const dayWindowEnd = parseTimeOnDay(cursor, config.sendWindowEnd);

    if (sentToday >= config.maxSendsPerDay || cursor > dayWindowEnd) {
      cursor = advanceToNextAllowedWindowStart(cursor);
      sentToday = 0;
      continue;
    }

    results.push(new Date(cursor));
    sentToday += 1;

    const delaySeconds = randomInt(config.minDelaySeconds, Math.max(config.minDelaySeconds, config.maxDelaySeconds));
    cursor = new Date(cursor.getTime() + delaySeconds * 1000);
  }

  return results;
}
