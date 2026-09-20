import { pickDays, categorizeResults, PickResult } from './pick-day';
import { solarToLunar } from './lunar';
import { gregorianToJDN, formatDate, parseDate } from '../utils/date';

// 同时保留的候选区间上限（三五个候选区间）
export const MAX_RANGES = 5;
// 单个区间最长跨度（约3年，与择日性能预算一致）
export const MAX_RANGE_DAYS = 366 * 3;
// 对照时每个区间展示的靠前日期数
export const TOP_DATES_PER_RANGE = 5;

export interface RangeInput {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  events: string[];
  avoidShengxiao: string[];
}

export interface CompareDay extends PickResult {
  date: string;      // 公历 YYYY-MM-DD
  lunarKey: string;  // 农历唯一键，如 "2024-12-1"、"2023-L2-1"（L 表示闰月）
  lunarText: string; // 农历显示，如 "腊月初一"
}

export interface RangeStats {
  best: number;   // 大吉
  good: number;   // 吉
  normal: number; // 平
  bad: number;    // 凶
}

export interface CompareRange {
  id: number;
  startDate: string;
  endDate: string;
  events: string[];
  avoidShengxiao: string[];
  days: CompareDay[];        // 按分数从高到低排序
  stats: RangeStats;
  duplicatesSkipped: number; // 因农历日期与已有区间重复而被略过的天数
}

export type MarkType = 'candidate' | 'noted' | 'excluded';

export const MARK_LABELS: Record<MarkType, string> = {
  candidate: '备选',
  noted: '记号',
  excluded: '排除',
};

export interface DayMark {
  date: string;
  lunarKey: string;
  lunarText: string;
  score: number;
  type: MarkType;
  reason: string;   // 取舍理由；排除时必填
  markedAt: number;
}

export interface FinalChoice {
  date: string;
  lunarKey: string;
  lunarText: string;
  score: number;
  reason: string;   // 定日理由
  decidedAt: number;
}

interface BoardSnapshot {
  ranges: CompareRange[];
  marks: DayMark[];
  finalChoice: FinalChoice | null;
}

export class CompareBoard {
  ranges: CompareRange[] = [];
  marks: DayMark[] = [];
  finalChoice: FinalChoice | null = null;
  private nextId = 1;
  private usedLunarKeys = new Set<string>();

  // 加入一个候选区间；同一段农历日期在全板上只出现一次
  addRange(input: RangeInput): { range?: CompareRange; error?: string } {
    if (this.ranges.length >= MAX_RANGES) {
      return { error: `最多同时保留 ${MAX_RANGES} 个候选区间，请先移除一个` };
    }
    if (input.events.length === 0) {
      return { error: '请至少选择一个事项' };
    }
    const [sy, sm, sd] = parseDate(input.startDate);
    const [ey, em, ed] = parseDate(input.endDate);
    if (!sy || !sm || !sd || !ey || !em || !ed) {
      return { error: '日期格式不正确' };
    }
    if (sy < 1900 || ey > 2100) {
      return { error: '仅支持 1900-2100 年之间的日期' };
    }
    const startJdn = gregorianToJDN(sy, sm, sd);
    const endJdn = gregorianToJDN(ey, em, ed);
    if (startJdn > endJdn) {
      return { error: '开始日期不能晚于结束日期' };
    }
    if (endJdn - startJdn + 1 > MAX_RANGE_DAYS) {
      return { error: '单个区间最长约 3 年，请分段添加' };
    }

    const results = pickDays(sy, sm, sd, ey, em, ed, input.events, input.avoidShengxiao);
    const days: CompareDay[] = [];
    let duplicatesSkipped = 0;
    for (const r of results) {
      const lunar = solarToLunar(r.year, r.month, r.day);
      const lunarKey = `${lunar.year}-${lunar.isLeap ? 'L' : ''}${lunar.month}-${lunar.day}`;
      if (this.usedLunarKeys.has(lunarKey)) {
        duplicatesSkipped++;
        continue;
      }
      this.usedLunarKeys.add(lunarKey);
      days.push({
        ...r,
        date: formatDate(r.year, r.month, r.day),
        lunarKey,
        lunarText: `${lunar.monthName}${lunar.dayName}`,
      });
    }
    if (days.length === 0) {
      return { error: '该区间内的农历日期与已有区间完全重复' };
    }

    const cat = categorizeResults(days);
    const range: CompareRange = {
      id: this.nextId++,
      startDate: formatDate(sy, sm, sd),
      endDate: formatDate(ey, em, ed),
      events: [...input.events],
      avoidShengxiao: [...input.avoidShengxiao],
      days,
      stats: { best: cat.best.length, good: cat.good.length, normal: cat.normal.length, bad: cat.bad.length },
      duplicatesSkipped,
    };
    this.ranges.push(range);
    return { range };
  }

  // 移除区间；随之清理只存在于该区间的标记与定日
  removeRange(id: number): boolean {
    const idx = this.ranges.findIndex(r => r.id === id);
    if (idx < 0) return false;
    this.ranges.splice(idx, 1);
    this.usedLunarKeys = new Set(this.ranges.flatMap(r => r.days.map(d => d.lunarKey)));
    this.marks = this.marks.filter(m => this.usedLunarKeys.has(m.lunarKey));
    if (this.finalChoice && !this.usedLunarKeys.has(this.finalChoice.lunarKey)) {
      this.finalChoice = null;
    }
    return true;
  }

  clear() {
    this.ranges = [];
    this.marks = [];
    this.finalChoice = null;
    this.usedLunarKeys.clear();
  }

  // 每个区间排在前面的日期
  topDates(range: CompareRange, n: number = TOP_DATES_PER_RANGE): CompareDay[] {
    return range.days.slice(0, n);
  }

  findDay(lunarKey: string): CompareDay | undefined {
    for (const r of this.ranges) {
      const day = r.days.find(d => d.lunarKey === lunarKey);
      if (day) return day;
    }
    return undefined;
  }

  getMark(lunarKey: string): DayMark | undefined {
    return this.marks.find(m => m.lunarKey === lunarKey);
  }

  // 给某一天做标记：备选 / 记号 / 排除；同一日期只保留一种标记，重复设置会覆盖
  setMark(lunarKey: string, type: MarkType, reason: string): { mark?: DayMark; error?: string } {
    const day = this.findDay(lunarKey);
    if (!day) return { error: '该日期不在候选区间内' };
    const trimmed = reason.trim();
    if (type === 'excluded' && !trimmed) {
      return { error: '排除日期必须写清排除原因' };
    }
    if (type === 'excluded' && this.finalChoice?.lunarKey === lunarKey) {
      return { error: '该日期已定为吉日，请先撤销定日再排除' };
    }
    const existing = this.getMark(lunarKey);
    if (existing) {
      existing.type = type;
      existing.reason = trimmed;
      existing.markedAt = Date.now();
      return { mark: existing };
    }
    const mark: DayMark = {
      date: day.date,
      lunarKey,
      lunarText: day.lunarText,
      score: day.score,
      type,
      reason: trimmed,
      markedAt: Date.now(),
    };
    this.marks.push(mark);
    return { mark };
  }

  clearMark(lunarKey: string): boolean {
    const idx = this.marks.findIndex(m => m.lunarKey === lunarKey);
    if (idx < 0) return false;
    this.marks.splice(idx, 1);
    return true;
  }

  // 定下一天，并记下当时的理由
  decide(lunarKey: string, reason: string): { choice?: FinalChoice; error?: string } {
    const day = this.findDay(lunarKey);
    if (!day) return { error: '该日期不在候选区间内' };
    const trimmed = reason.trim();
    if (!trimmed) return { error: '定日请记下理由' };
    if (this.getMark(lunarKey)?.type === 'excluded') {
      return { error: '该日期已被排除，不能定为吉日' };
    }
    this.finalChoice = {
      date: day.date,
      lunarKey,
      lunarText: day.lunarText,
      score: day.score,
      reason: trimmed,
      decidedAt: Date.now(),
    };
    return { choice: this.finalChoice };
  }

  clearDecision() {
    this.finalChoice = null;
  }

  marksByType(type: MarkType): DayMark[] {
    return this.marks
      .filter(m => m.type === type)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // 导出对比结果（Markdown 文本）
  exportText(): string {
    const fmtTime = (t: number) => new Date(t).toLocaleString('zh-CN', { hour12: false });
    const lines: string[] = [];
    lines.push('# 择日对比结果');
    lines.push('');
    lines.push(`导出时间：${fmtTime(Date.now())}`);
    lines.push('');
    lines.push('## 候选区间对照');
    lines.push('');

    this.ranges.forEach((r, i) => {
      lines.push(`### 区间${i + 1}：${r.startDate} ~ ${r.endDate}`);
      const avoid = r.avoidShengxiao.length > 0 ? `；避讳生肖：${r.avoidShengxiao.join('、')}` : '';
      lines.push(`事项：${r.events.join('、')}${avoid}`);
      const dup = r.duplicatesSkipped > 0 ? `；与已有区间重复 ${r.duplicatesSkipped} 天，已略过` : '';
      lines.push(`大吉 ${r.stats.best} 天 / 吉 ${r.stats.good} 天 / 平 ${r.stats.normal} 天 / 凶 ${r.stats.bad} 天${dup}`);
      lines.push('');
      lines.push('| 日期 | 农历 | 分数 | 标记 | 取舍理由 |');
      lines.push('| --- | --- | --- | --- | --- |');
      for (const d of this.topDates(r)) {
        const mark = this.getMark(d.lunarKey);
        const isFinal = this.finalChoice?.lunarKey === d.lunarKey;
        const markText = `${mark ? MARK_LABELS[mark.type] : ''}${isFinal ? '（已定）' : ''}`;
        lines.push(`| ${d.date} | ${d.lunarText} | ${d.score} | ${markText} | ${mark?.reason ?? ''} |`);
      }
      lines.push('');
    });

    lines.push('## 取舍记录');
    lines.push('');
    for (const type of ['candidate', 'noted', 'excluded'] as MarkType[]) {
      const list = this.marksByType(type);
      const title = type === 'excluded' ? '排除（含排除原因）' : MARK_LABELS[type];
      lines.push(`### ${title}（${list.length}）`);
      if (list.length === 0) {
        lines.push('（无）');
      } else {
        for (const m of list) {
          lines.push(`- ${m.date}（${m.lunarText}，${m.score}分）：${m.reason || '（未填理由）'}`);
        }
      }
      lines.push('');
    }

    lines.push('## 最终定日');
    lines.push('');
    if (this.finalChoice) {
      lines.push(`${this.finalChoice.date}（农历${this.finalChoice.lunarText}，${this.finalChoice.score}分）`);
      lines.push(`定日理由：${this.finalChoice.reason}`);
      lines.push(`定日时间：${fmtTime(this.finalChoice.decidedAt)}`);
    } else {
      lines.push('（尚未定日）');
    }
    lines.push('');
    lines.push('老黄历择日 · 仅供参考');
    return lines.join('\n');
  }

  // 序列化（用于本地保存）
  toJSON(): string {
    const snapshot: BoardSnapshot = {
      ranges: this.ranges,
      marks: this.marks,
      finalChoice: this.finalChoice,
    };
    return JSON.stringify(snapshot);
  }

  static fromJSON(json: string): CompareBoard | null {
    try {
      const data = JSON.parse(json) as BoardSnapshot;
      if (!data || !Array.isArray(data.ranges) || !Array.isArray(data.marks)) {
        return null;
      }
      const board = new CompareBoard();
      board.ranges = data.ranges;
      board.marks = data.marks;
      board.finalChoice = data.finalChoice ?? null;
      board.usedLunarKeys = new Set(board.ranges.flatMap(r => r.days.map(d => d.lunarKey)));
      board.nextId = board.ranges.reduce((max, r) => Math.max(max, r.id), 0) + 1;
      return board;
    } catch {
      return null;
    }
  }
}
