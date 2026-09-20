import { PickResult, pickDays, GRADE_LABEL, DayGrade } from './pick-day';
import { gregorianToJDN, jdnToGregorian } from '../utils/date';

export type DayMark = 'none' | 'candidate' | 'note' | 'excluded';

export interface IntervalSpec {
  id: string;
  label: string;
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

export interface CompareDay extends PickResult {
  intervalId: string;
  intervalLabel: string;
  /** 公历日期键，也是全对照中日期的唯一身份 */
  solarKey: string;
  /** 该日期是否同时落入其他候选区间（公历重叠） */
  alsoIn: string[];
  mark: DayMark;
  note: string;
}

export interface IntervalStats {
  total: number;
  best: number;
  good: number;
  normal: number;
  bad: number;
  elapsedMs: number;
  valid: boolean;
  error?: string;
}

export interface CompareInterval extends IntervalSpec {
  stats: IntervalStats;
  /** 分数排在前面的日期（大吉 + 吉，按分数） */
  top: CompareDay[];
  /** 该区间内、因农历日期已在更早的候选区间出现而被折叠的日期 */
  collapsed: CompareDay[];
  /** 全部日期（按分数排序），供展开查看 */
  days: CompareDay[];
}

export interface CompareInput {
  events: string[];
  avoidShengxiao: string[];
  intervals: IntervalSpec[];
}

export interface Comparison {
  generatedAt: string;
  events: string[];
  avoidShengxiao: string[];
  intervals: CompareInterval[];
  /** 全部「拥有者」日期（去重后，按分数排序） */
  days: CompareDay[];
  /** 按农历键索引：第一个拥有该农历日期的公历日期 */
  lunarFirst: Record<string, { solarKey: string; intervalLabel: string }>;
}

export interface Decision {
  solarKey: string;
  year: number;
  month: number;
  day: number;
  reason: string;
  decidedAt: string; // ISO 时间
}

export const MAX_INTERVALS = 5;
const TOP_LIMIT = 30;

export function solarKeyOf(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// 校验单个区间
export function validateInterval(spec: IntervalSpec): string | undefined {
  if (!spec.start || !spec.end) return '请填写完整的起止日期';
  const s = parseDate(spec.start);
  const e = parseDate(spec.end);
  if (!s || !e) return '日期格式不正确';
  if (gregorianToJDN(...s) > gregorianToJDN(...e)) return '起始日期不能晚于结束日期';
  return undefined;
}

function parseDate(s: string): [number, number, number] | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return undefined;
  const [, y, mo, d] = m;
  const t: [number, number, number] = [Number(y), Number(mo), Number(d)];
  // 拒绝 2 月 30 日这类不存在的公历日期（跨年区间防错位）
  const [ry, rm, rd] = jdnToGregorian(gregorianToJDN(...t));
  if (ry !== t[0] || rm !== t[1] || rd !== t[2]) return undefined;
  return t;
}

// 构建多区间对照
export function buildComparison(input: CompareInput): Comparison {
  const seenLunar = new Map<string, { solarKey: string; intervalLabel: string }>();
  // 同一公历日期落在多个区间时，只在最早加入的区间出现
  const seenSolar = new Set<string>();
  const ownerBySolar = new Map<string, CompareDay>();
  const allDays: CompareDay[] = [];
  const compareIntervals: CompareInterval[] = [];

  for (const spec of input.intervals) {
    const error = validateInterval(spec);
    if (error) {
      compareIntervals.push(makeEmptyInterval(spec, error));
      continue;
    }

    const [sy, sm, sd] = parseDate(spec.start)!;
    const [ey, em, ed] = parseDate(spec.end)!;

    const t0 = performance.now();
    const picked = pickDays(sy, sm, sd, ey, em, ed, input.events, input.avoidShengxiao);
    const elapsedMs = performance.now() - t0;

    const days: CompareDay[] = [];
    const collapsed: CompareDay[] = [];
    const counts: Record<DayGrade, number> = { best: 0, good: 0, normal: 0, bad: 0 };

    for (const r of picked) {
      const solarKey = solarKeyOf(r.year, r.month, r.day);
      const day: CompareDay = {
        ...r,
        intervalId: spec.id,
        intervalLabel: spec.label,
        solarKey,
        alsoIn: [],
        mark: 'none',
        note: ''
      };

      counts[r.grade]++;

      if (seenSolar.has(solarKey)) {
        // 公历重叠：折叠并在拥有者处登记
        collapsed.push(day);
        continue;
      }

      const firstLunar = seenLunar.get(r.lunarKey);
      if (firstLunar) {
        // 同一段农历日期不能重复出现：折叠，并在拥有者卡片上标注
        collapsed.push(day);
        const owner = ownerBySolar.get(firstLunar.solarKey);
        if (owner && !owner.alsoIn.includes(spec.label)) owner.alsoIn.push(spec.label);
        continue;
      }

      seenSolar.add(solarKey);
      seenLunar.set(r.lunarKey, { solarKey, intervalLabel: spec.label });
      ownerBySolar.set(solarKey, day);
      days.push(day);
      allDays.push(day);
    }

    // 公历重叠的日期，在拥有者卡片上标注「也见于」
    for (const dup of collapsed) {
      const owner = ownerBySolar.get(dup.solarKey);
      if (owner && !owner.alsoIn.includes(spec.label)) owner.alsoIn.push(spec.label);
    }

    days.sort((a, b) => b.score - a.score);
    collapsed.sort((a, b) => b.score - a.score);

    compareIntervals.push({
      ...spec,
      stats: {
        total: picked.length,
        best: counts.best,
        good: counts.good,
        normal: counts.normal,
        bad: counts.bad,
        elapsedMs,
        valid: true
      },
      top: days.filter(d => d.grade === 'best' || d.grade === 'good').slice(0, TOP_LIMIT),
      collapsed,
      days
    });
  }

  allDays.sort((a, b) =>
    (b.score - a.score) ||
    gregorianToJDN(a.year, a.month, a.day) - gregorianToJDN(b.year, b.month, b.day)
  );

  return {
    generatedAt: new Date().toISOString(),
    events: input.events,
    avoidShengxiao: input.avoidShengxiao,
    intervals: compareIntervals,
    days: allDays,
    lunarFirst: Object.fromEntries(seenLunar)
  };
}

function makeEmptyInterval(spec: IntervalSpec, error: string): CompareInterval {
  return {
    ...spec,
    stats: { total: 0, best: 0, good: 0, normal: 0, bad: 0, elapsedMs: 0, valid: false, error },
    top: [],
    collapsed: [],
    days: []
  };
}

// ---- 标记操作（返回新对象，保证不可变） ----

export function applyMark(day: CompareDay, mark: DayMark, note: string): CompareDay {
  return { ...day, mark, note: note.trim() };
}

// 排除必须写明原因
export function excludeDay(day: CompareDay, reason: string): CompareDay {
  const r = reason.trim();
  if (!r) throw new Error('排除日期必须写明原因');
  return { ...day, mark: 'excluded', note: r };
}

// 从对照中按公历键找日期
export function findDay(comp: Comparison, solarKey: string): CompareDay | undefined {
  return comp.days.find(d => d.solarKey === solarKey);
}

// 定夺：只能在未排除的日期中定，并记录理由
export function makeDecision(day: CompareDay, reason: string): Decision {
  if (day.mark === 'excluded') throw new Error('该日期已排除，不能定为最终日期');
  const r = reason.trim();
  if (!r) throw new Error('请写下定夺的理由');
  return {
    solarKey: day.solarKey,
    year: day.year,
    month: day.month,
    day: day.day,
    reason: r,
    decidedAt: new Date().toISOString()
  };
}

// ---- 导出 CSV ----

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function comparisonToCSV(comp: Comparison, decision?: Decision): string {
  const lines: string[] = [];
  lines.push(['老黄历择日候选区间对照'].map(csvCell).join(','));
  lines.push(['生成时间', comp.generatedAt].map(csvCell).join(','));
  lines.push(['事项', comp.events.join('、')].map(csvCell).join(','));
  if (comp.avoidShengxiao.length) {
    lines.push(['避讳生肖', comp.avoidShengxiao.join('、')].map(csvCell).join(','));
  }
  lines.push('');

  // 区间统计对照
  lines.push(['区间', '名称', '起', '止', '大吉', '吉', '平', '凶', '合计', '计算耗时(ms)'].map(csvCell).join(','));
  comp.intervals.forEach((it, i) => {
    lines.push([
      i + 1, it.label, it.start, it.end,
      it.stats.valid ? it.stats.best : '-',
      it.stats.valid ? it.stats.good : '-',
      it.stats.valid ? it.stats.normal : '-',
      it.stats.valid ? it.stats.bad : '-',
      it.stats.valid ? it.stats.total : it.stats.error || '无效',
      it.stats.valid ? it.stats.elapsedMs.toFixed(1) : '-'
    ].map(csvCell).join(','));
  });
  lines.push('');

  // 逐日明细（去重后的拥有者日期）
  lines.push(['公历', '星期', '农历', '干支', '评级', '分数', '所属区间', '也见于', '标记', '备注/排除原因', '宜', '忌'].map(csvCell).join(','));
  const weekNames = ['日', '一', '二', '三', '四', '五', '六'];
  const markLabel: Record<DayMark, string> = { none: '', candidate: '备选', note: '记号', excluded: '排除' };
  for (const d of comp.days) {
    lines.push([
      d.solarKey,
      '周' + weekNames[d.weekDay],
      `${d.lunarYear}年${d.lunarMonthName}${d.lunarDayName}`,
      d.ganZhi,
      GRADE_LABEL[d.grade],
      d.score,
      d.intervalLabel,
      d.alsoIn.join('、'),
      markLabel[d.mark],
      d.note,
      d.yi.join('、'),
      d.ji.join('、')
    ].map(csvCell).join(','));
  }

  // 折叠（去重掉）的日期也留痕，写明与谁重复
  const collapsedRows = comp.intervals.flatMap(it =>
    it.collapsed.map(d => ({ d, owner: it }))
  );
  if (collapsedRows.length) {
    lines.push('');
    lines.push(['以下日期与其它候选区间重复，未重复列入对照'].map(csvCell).join(','));
    lines.push(['公历', '农历', '来自区间', '重复于'].map(csvCell).join(','));
    for (const { d } of collapsedRows) {
      const first = comp.lunarFirst[d.lunarKey];
      const repeatOf = first
        ? `${first.intervalLabel}（${first.solarKey}）`
        : '公历同日';
      lines.push([d.solarKey, `${d.lunarYear}年${d.lunarMonthName}${d.lunarDayName}`, d.intervalLabel, repeatOf].map(csvCell).join(','));
    }
  }

  if (decision) {
    lines.push('');
    lines.push(['最终定夺', decision.solarKey].map(csvCell).join(','));
    lines.push(['定夺理由', decision.reason].map(csvCell).join(','));
    lines.push(['定夺时间', decision.decidedAt].map(csvCell).join(','));
  }

  return '﻿' + lines.join('\r\n'); // BOM，Excel 打开中文不乱码
}
