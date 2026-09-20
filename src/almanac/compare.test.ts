import { describe, it, expect } from 'vitest';
import {
  buildComparison, validateInterval, applyMark, excludeDay,
  makeDecision, comparisonToCSV, solarKeyOf, CompareDay, IntervalSpec
} from './compare';
import { solarToLunar } from './lunar';
import { gregorianToJDN, jdnToGregorian } from '../utils/date';

function spec(id: string, label: string, start: string, end: string): IntervalSpec {
  return { id, label, start, end };
}

describe('多区间对照', () => {
  it('跨年区间逐日计算不错位', () => {
    const comp = buildComparison({
      events: ['嫁娶'],
      avoidShengxiao: [],
      intervals: [spec('a', '跨年', '2024-12-25', '2025-02-05')]
    });

    // 含首尾共 43 天（2024 年 12 月 7 天 + 2025 年 1 月 31 天 + 2 月 5 天）
    expect(comp.intervals[0].stats.total).toBe(43);

    // 每一天都能由农历反查回原公历日期（历法不错位）
    for (const d of comp.days) {
      const lunar = solarToLunar(d.year, d.month, d.day);
      expect(lunar.year).toBe(d.lunarYear);
      expect(lunar.month).toBe(d.lunarMonth);
      expect(lunar.day).toBe(d.lunarDay);
      expect(lunar.isLeap).toBe(d.lunarIsLeap);
    }

    // 春节边界：2025-01-29 是农历乙巳年正月初一，之前仍属甲辰年腊月
    const beforeSF = comp.days.find(d => d.solarKey === '2025-01-28')!;
    const sf = comp.days.find(d => d.solarKey === '2025-01-29')!;
    expect(beforeSF.lunarMonthName).toContain('腊');
    expect(sf.lunarMonthName).toBe('正月');
    expect(sf.lunarDayName).toBe('初一');
  });

  it('JDN 反解在公历跨年边界连续', () => {
    // 2024-12-31 的下一天必须是 2025-01-01
    const jdn = gregorianToJDN(2024, 12, 31);
    expect(jdnToGregorian(jdn + 1)).toEqual([2025, 1, 1]);
    // 世纪年（非闰年）也不能错
    expect(jdnToGregorian(gregorianToJDN(2100, 2, 28) + 1)).toEqual([2100, 3, 1]);
    expect(jdnToGregorian(gregorianToJDN(2000, 2, 28) + 1)).toEqual([2000, 2, 29]);
  });

  it('同一段农历日期跨区间不重复出现', () => {
    const comp = buildComparison({
      events: ['嫁娶'],
      avoidShengxiao: [],
      intervals: [
        spec('a', '区间甲', '2025-02-01', '2025-02-28'),
        spec('b', '区间乙', '2025-02-15', '2025-03-15')
      ]
    });

    // 公历重叠（2/15-2/28）与农历重叠都只保留一条
    const keys = comp.days.map(d => d.solarKey);
    expect(new Set(keys).size).toBe(keys.length);
    const lunarKeys = comp.days.map(d => d.lunarKey);
    expect(new Set(lunarKeys).size).toBe(lunarKeys.length);

    // 折叠的日期都有明确归属
    const b = comp.intervals[1];
    expect(b.collapsed.length).toBeGreaterThan(0);
    for (const c of b.collapsed) {
      const owner = comp.lunarFirst[c.lunarKey];
      expect(owner).toBeTruthy();
      expect(owner.intervalLabel).toBe('区间甲');
    }

    // 区间乙仍然保留了不与甲重复的日期（3/1-3/15）
    expect(b.days.length).toBeGreaterThan(0);
  });

  it('每个区间独立统计大吉/吉/平/凶天数', () => {
    const comp = buildComparison({
      events: ['嫁娶'],
      avoidShengxiao: [],
      intervals: [spec('a', '正月', '2025-02-01', '2025-02-28')]
    });
    const s = comp.intervals[0].stats;
    expect(s.best + s.good + s.normal + s.bad).toBe(s.total);
  });

  it('无效区间给出错误而不影响其它区间', () => {
    const comp = buildComparison({
      events: ['嫁娶'],
      avoidShengxiao: [],
      intervals: [
        spec('a', '坏区间', '2025-03-01', '2025-02-01'),
        spec('b', '好区间', '2025-02-01', '2025-02-10')
      ]
    });
    expect(comp.intervals[0].stats.valid).toBe(false);
    expect(comp.intervals[0].stats.error).toContain('起始');
    expect(comp.intervals[1].stats.valid).toBe(true);
  });

  it('拒绝不存在的公历日期（如 2 月 30 日）', () => {
    expect(validateInterval(spec('a', 'x', '2025-02-30', '2025-03-01'))).toBeTruthy();
    expect(validateInterval(spec('a', 'x', '2025-02-01', '2025-02-28'))).toBeUndefined();
  });

  it('排除必须填写原因，备选/记号可写说明', () => {
    const day = {} as CompareDay;
    expect(() => excludeDay(day, '   ')).toThrow();
    const excluded = excludeDay(day, '冲长辈生肖马');
    expect(excluded.mark).toBe('excluded');
    expect(excluded.note).toBe('冲长辈生肖马');

    const marked = applyMark(day, 'note', '等长辈再确认');
    expect(marked.mark).toBe('note');
  });

  it('不能定夺已排除的日期，且必须写理由', () => {
    const comp = buildComparison({
      events: ['嫁娶'],
      avoidShengxiao: [],
      intervals: [spec('a', '甲', '2025-02-01', '2025-02-20')]
    });
    const day = comp.days[0];
    expect(() => makeDecision(day, '')).toThrow();

    const excluded = excludeDay(day, '忌嫁娶');
    expect(() => makeDecision(excluded, '就选它')).toThrow();

    const decision = makeDecision(day, '大吉且不冲家人生肖，周末方便亲友到场');
    expect(decision.solarKey).toBe(day.solarKey);
    expect(decision.reason).toContain('周末');
    expect(decision.decidedAt).toBeTruthy();
  });

  it('CSV 导出包含区间统计、逐日标记与定夺理由', () => {
    const comp = buildComparison({
      events: ['嫁娶', '搬家'],
      avoidShengxiao: ['马'],
      intervals: [
        spec('a', '区间甲', '2025-02-01', '2025-02-15'),
        spec('b', '区间乙', '2025-03-01', '2025-03-10')
      ]
    });
    const marked = applyMark(comp.days[0], 'candidate', '备选');
    const idx = comp.days.findIndex(d => d.solarKey === marked.solarKey);
    comp.days[idx] = marked;

    const decision = makeDecision(comp.days[1], '综合评分最高');
    const csv = comparisonToCSV(comp, decision);

    expect(csv).toContain('区间甲');
    expect(csv).toContain('大吉');
    expect(csv).toContain('备选');
    expect(csv).toContain('最终定夺');
    expect(csv).toContain('综合评分最高');
    expect(csv.startsWith('﻿')).toBe(true);
    // 农历日期带月日名称
    expect(csv).toContain('月');
  });

  it('最多支持 5 个候选区间的常量约束', async () => {
    const mod = await import('./compare');
    expect(mod.MAX_INTERVALS).toBe(5);
  });

  it('solarKeyOf 格式稳定', () => {
    expect(solarKeyOf(2025, 1, 9)).toBe('2025-01-09');
  });

  it('闰月与正常月的同名农历日期视为不同日期', () => {
    // 2023 年闰二月：二月初一(2023-02-20) 与闰二月初一(2023-03-22) 不应被误判为重复
    const comp = buildComparison({
      events: ['嫁娶'],
      avoidShengxiao: [],
      intervals: [spec('a', '前', '2023-02-19', '2023-02-21'), spec('b', '后', '2023-03-21', '2023-03-23')]
    });
    const normal = comp.days.find(d => d.solarKey === '2023-02-20')!;
    const leap = comp.days.find(d => d.solarKey === '2023-03-22')!;
    expect(normal).toBeTruthy();
    expect(leap).toBeTruthy();
    expect(normal.lunarIsLeap).toBe(false);
    expect(leap.lunarIsLeap).toBe(true);
    expect(normal.lunarKey).not.toBe(leap.lunarKey);
    expect(comp.days.length).toBe(6);
  });

  it('跨三年的长区间统计完整且结果可复现', () => {
    const c1 = buildComparison({
      events: ['嫁娶', '搬家', '动土'],
      avoidShengxiao: ['鼠'],
      intervals: [spec('a', '三年', '2024-01-01', '2026-12-31')]
    });
    const c2 = buildComparison({
      events: ['嫁娶', '搬家', '动土'],
      avoidShengxiao: ['鼠'],
      intervals: [spec('a', '三年', '2024-01-01', '2026-12-31')]
    });
    // 2024-01-01 到 2026-12-31 共 1096 天（含 2024 闰日）
    expect(c1.intervals[0].stats.total).toBe(1096);
    expect(c1.days.map(d => d.solarKey)).toEqual(c2.days.map(d => d.solarKey));
    // 分数排序在长区间仍成立
    for (let i = 1; i < c1.days.length; i++) {
      expect(c1.days[i].score).toBeLessThanOrEqual(c1.days[i - 1].score);
    }
    // 性能要求：3 年区间 < 300ms
    expect(c1.intervals[0].stats.elapsedMs).toBeLessThan(300);
  });
});
