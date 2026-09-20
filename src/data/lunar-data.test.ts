import { describe, it, expect } from 'vitest';
import { LUNAR_YEAR_DATA } from '../data/lunar-data';
import { solarToLunar, lunarToSolar } from '../almanac/lunar';
import { gregorianToJDN, jdnToGregorian } from '../utils/date';

describe('农历年数据完整性', () => {
  it('每年月天数+闰月天数应等于到下一个春节的间距', () => {
    for (let y = 1900; y < 2100; y++) {
      const data = LUNAR_YEAR_DATA[y - 1900];
      const total = data.md.reduce((a, b) => a + b, 0) + data.ld;
      const sfThis = gregorianToJDN(y, 1, 1) + data.sf;
      const next = LUNAR_YEAR_DATA[y - 1900 + 1];
      const sfNext = gregorianToJDN(y + 1, 1, 1) + next.sf;
      expect(sfNext - sfThis, `${y}年数据与春节间距不符`).toBe(total);
    }
  });

  it('1900-2100年农历日期不重复、逐日连续（跨年不错位）', () => {
    const startJdn = gregorianToJDN(1900, 1, 31); // 1900年春节
    const endJdn = gregorianToJDN(2100, 12, 31);
    const seen = new Set<string>();
    let prevKey = '';

    for (let jdn = startJdn; jdn <= endJdn; jdn++) {
      const [y, m, d] = jdnToGregorian(jdn);
      const lunar = solarToLunar(y, m, d);
      const key = `${lunar.year}-${lunar.isLeap ? 'L' : ''}${lunar.month}-${lunar.day}`;

      // 同一段农历日期不能重复出现
      expect(seen.has(key), `农历日期重复: ${key} @ ${y}-${m}-${d}`).toBe(false);
      seen.add(key);

      // 逐日连续：同一天内+1，或换月/换年从初一开始
      if (prevKey) {
        const [py, pm, pd] = jdnToGregorian(jdn - 1);
        const pl = solarToLunar(py, pm, pd);
        const sameMonthNext =
          pl.year === lunar.year && pl.month === lunar.month &&
          pl.isLeap === lunar.isLeap && lunar.day === pl.day + 1;
        const newMonth = lunar.day === 1;
        expect(sameMonthNext || newMonth,
          `农历不连续: ${py}-${pm}-${pd} -> ${y}-${m}-${d}（${prevKey} -> ${key}）`).toBe(true);
      }
      prevKey = key;
    }
  });

  it('跨年区间往返转换不错位', () => {
    const samples: [number, number, number][] = [
      [2024, 12, 31], [2025, 1, 1], [2025, 1, 28], [2025, 1, 29],
      [2023, 3, 22], [2023, 4, 19], [2023, 4, 20],
      [2099, 12, 31], [2100, 1, 1], [2100, 2, 8], [2100, 2, 9],
    ];
    for (const [y, m, d] of samples) {
      const lunar = solarToLunar(y, m, d);
      expect(lunarToSolar(lunar.year, lunar.month, lunar.day, lunar.isLeap),
        `${y}-${m}-${d} 往返转换错位`).toEqual([y, m, d]);
    }
  });

  it('已知闰月与春节抽查', () => {
    const leapMonths: Record<number, number> = {
      1900: 8, 1903: 5, 1919: 7, 1933: 5, 1949: 7, 1963: 4,
      1979: 6, 1995: 8, 2009: 5, 2014: 9, 2020: 4, 2023: 2, 2025: 6, 2033: 7,
    };
    for (const [y, lm] of Object.entries(leapMonths)) {
      expect(LUNAR_YEAR_DATA[Number(y) - 1900].lm, `${y}年闰月`).toBe(lm);
    }
    // 关键春节日期
    expect(solarToLunar(1900, 1, 31).day).toBe(1);
    expect(solarToLunar(2000, 2, 5).day).toBe(1);
    expect(solarToLunar(2024, 2, 10).day).toBe(1);
    expect(solarToLunar(2025, 1, 29).day).toBe(1);
    // 2024年腊月廿九是除夕（2025-01-28）
    const chuxi = solarToLunar(2025, 1, 28);
    expect(chuxi.year).toBe(2024);
    expect(chuxi.month).toBe(12);
    expect(chuxi.day).toBe(29);
  });
});
