import { Comparison, Decision, DayMark } from '../almanac/compare';

// 择日会话：标记/备注以公历日期键为索引，区间结果可整体重算
export interface PickSession {
  events: string[];
  avoidText: string;
  intervals: Array<{ id: string; label: string; start: string; end: string }>;
  marks: Record<string, { mark: DayMark; note: string }>;
  decision?: Decision;
  updatedAt: string;
}

const STORAGE_KEY = 'pick-session-v2';

export function loadSession(): PickSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PickSession;
    if (!parsed || !Array.isArray(parsed.intervals)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(session: PickSession): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // 存储不可用时静默降级（隐私模式等）
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// 把会话里保存的标记恢复到新算出的对照结果上
export function restoreMarks(comp: Comparison, marks: PickSession['marks']): Comparison {
  let touched = false;
  const days = comp.days.map(d => {
    const saved = marks[d.solarKey];
    if (saved) {
      touched = true;
      return { ...d, mark: saved.mark, note: saved.note };
    }
    return d;
  });

  if (!touched) return comp;

  const byKey = new Map(days.map(d => [d.solarKey, d]));
  const intervals = comp.intervals.map(it => ({
    ...it,
    top: it.top.map(d => byKey.get(d.solarKey) || d),
    days: it.days.map(d => byKey.get(d.solarKey) || d)
  }));

  return { ...comp, days, intervals };
}
