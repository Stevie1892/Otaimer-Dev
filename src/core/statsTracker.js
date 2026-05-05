const STATS_KEY = 'otaimer_stats';
const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

let stats = { workSessions: [], timerResets: [], timerLifecycles: [] };
let currentSessionStart = null;

export function initStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.workSessions && parsed.timerResets) {
        stats.workSessions = parsed.workSessions;
        stats.timerResets = parsed.timerResets;
        stats.timerLifecycles = parsed.timerLifecycles || [];
      }
    }
  } catch {
    stats = { workSessions: [], timerResets: [], timerLifecycles: [] };
  }
}

function persist() {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {}
}

export function startWorkSession() {
  if (currentSessionStart) return;
  currentSessionStart = Date.now();
}

export function endWorkSession() {
  if (!currentSessionStart) return;
  const now = Date.now();
  const duration = now - currentSessionStart;
  if (duration > 60000) { // Only record sessions > 1 minute
    stats.workSessions.push({ start: currentSessionStart, end: now });
    persist();
  }
  currentSessionStart = null;
}

export function checkIdleAndEndSession() {
  // Call this when app comes back from background
  // If idle > 5 min, end the session
  // (Handled by caller with backgroundTime)
}

// --- Timer Reset Recording ---

export function recordTimerReset(overtimeMs, timerContext) {
  // Only record if overtime > 5 seconds (filter accidental touches)
  if (overtimeMs > 5000) {
    stats.timerResets.push({
      ts: Date.now(),
      overtime: overtimeMs,
      timerId: timerContext.timerId,
      timerName: timerContext.timerName,
      timerColor: timerContext.timerColor,
      groupId: timerContext.groupId
    });
    persist();
  }
}

// --- Lifecycle Management ---

export function recordTimerCreated(timerId, physicalId, groupId, name, color) {
  stats.timerLifecycles.push({
    timerId,
    physicalId,
    groupId,
    name,
    color,
    createdAt: Date.now(),
    closedAt: null,
    closedReason: null
  });
  persist();
}

export function recordTimerClosed(timerId, reason) {
  const record = stats.timerLifecycles.find(r => r.timerId === timerId && r.closedAt === null);
  if (record) {
    record.closedAt = Date.now();
    record.closedReason = reason;
    persist();
  }
}

export function cleanLifecycleRecord(timerId) {
  const idx = stats.timerLifecycles.findIndex(r => r.timerId === timerId);
  if (idx !== -1) {
    stats.timerLifecycles.splice(idx, 1);
    persist();
  }
}

export function findLifecycleByName(physicalId, name) {
  return stats.timerLifecycles.find(
    r => r.physicalId === physicalId && r.name === name && r.closedReason === 'renamed'
  );
}

export function reopenLifecycleRecord(timerId) {
  const record = stats.timerLifecycles.find(r => r.timerId === timerId);
  if (record) {
    record.closedAt = null;
    record.closedReason = null;
    persist();
  }
}

export function updateLifecycleColor(timerId, color) {
  const record = stats.timerLifecycles.find(r => r.timerId === timerId && r.closedAt === null);
  if (record) {
    record.color = color;
    persist();
  }
}

export function hasBusinessResets(timerId) {
  return stats.timerResets.some(r => r.timerId === timerId);
}

export function getActiveLifecycleForPhysical(physicalId) {
  return stats.timerLifecycles.find(r => r.physicalId === physicalId && r.closedAt === null);
}

export function handleTimerDeletion(physicalId) {
  const records = stats.timerLifecycles.filter(r => r.physicalId === physicalId);
  let needsPersist = false;
  for (const record of records) {
    if (hasBusinessResets(record.timerId)) {
      // Has business data — keep lifecycle record, mark as deleted
      if (record.closedAt === null) {
        record.closedAt = Date.now();
        record.closedReason = 'deleted';
        needsPersist = true;
      }
    } else {
      // No business data — clean up lifecycle record
      const idx = stats.timerLifecycles.indexOf(record);
      if (idx !== -1) {
        stats.timerLifecycles.splice(idx, 1);
        needsPersist = true;
      }
    }
  }
  if (needsPersist) persist();
}

// --- Query Functions ---

export function isLegacyRecord(record) {
  return !record.hasOwnProperty('timerId') || record.timerId == null;
}

export function getResetsForDateRange(startDateStr, endDateStr) {
  const start = new Date(startDateStr + 'T00:00:00').getTime();
  const end = new Date(endDateStr + 'T23:59:59').getTime();
  return stats.timerResets.filter(r => {
    if (isLegacyRecord(r)) return false;
    return r.ts >= start && r.ts <= end;
  });
}

export function getPerTimerBreakdown(resets) {
  const map = new Map();
  for (const r of resets) {
    const key = r.timerId;
    if (!map.has(key)) {
      map.set(key, {
        timerId: r.timerId,
        name: r.timerName,
        color: r.timerColor,
        groupId: r.groupId || null,
        count: 0,
        totalOvertime: 0,
        avgOvertime: 0
      });
    }
    const entry = map.get(key);
    entry.count++;
    entry.totalOvertime += r.overtime;
  }
  for (const entry of map.values()) {
    entry.avgOvertime = entry.count > 0 ? entry.totalOvertime / entry.count : 0;
  }
  return map;
}

export function getActiveTimersForDate(dateStr) {
  const dayStart = new Date(dateStr + 'T00:00:00').getTime();
  const dayEnd = new Date(dateStr + 'T23:59:59').getTime();
  return stats.timerLifecycles.filter(r => {
    if (r.createdAt > dayEnd) return false;
    if (r.closedAt !== null && r.closedAt < dayStart) return false;
    return true;
  });
}

export function getStatsData() {
  return stats;
}

export function getCurrentSessionElapsed() {
  if (!currentSessionStart) return 0;
  return Date.now() - currentSessionStart;
}

export function clearAllStats() {
  stats = { workSessions: [], timerResets: [], timerLifecycles: [] };
  persist();
}

export function isStatsEmpty() {
  return stats.workSessions.length === 0 && stats.timerResets.length === 0;
}

// Query helpers
export function getWorkMsForDate(dateStr) {
  // dateStr format: "2026-05-03"
  let total = 0;
  for (const s of stats.workSessions) {
    if (isSameDay(new Date(s.start), dateStr)) {
      total += (s.end - s.start);
    }
  }
  // Add current session if it's today
  if (currentSessionStart && isSameDay(new Date(currentSessionStart), dateStr)) {
    total += (Date.now() - currentSessionStart);
  }
  return total;
}

export function getResetsForDate(dateStr) {
  return stats.timerResets.filter(r => {
    if (isLegacyRecord(r)) return false;
    return isSameDay(new Date(r.ts), dateStr);
  });
}

export function isSameDay(date, dateStr) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}` === dateStr;
}

export function formatDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getWeekRange(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = 0
  const monday = new Date(d);
  monday.setDate(d.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

export function getMonthRange(date) {
  const d = new Date(date);
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  last.setHours(23, 59, 59, 999);
  return { start: first, end: last };
}

export function getDaysInRange(startDate, endDate) {
  const days = [];
  const d = new Date(startDate);
  d.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  while (d <= end) {
    days.push(formatDateStr(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}
