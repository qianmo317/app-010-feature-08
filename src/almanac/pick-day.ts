import { scoreDay, getDayYiJi } from './yiji';
import { solarToLunar } from './lunar';
import { gregorianToJDN, jdnToGregorian, getWeekDay } from '../utils/date';

export type DayGrade = 'best' | 'good' | 'normal' | 'bad';

export const GRADE_LABEL: Record<DayGrade, string> = {
  best: '大吉',
  good: '吉',
  normal: '平',
  bad: '凶'
};

export interface PickResult {
  year: number;
  month: number;
  day: number;
  score: number;
  grade: DayGrade;
  yi: string[];
  ji: string[];
  ganZhi: string;
  chong: string;
  chongShengxiao: string;
  reason: string;
  weekDay: number;
  lunarKey: string;
  lunarYear: number;
  lunarMonth: number;
  lunarDay: number;
  lunarIsLeap: boolean;
  lunarMonthName: string;
  lunarDayName: string;
}

// 评级（与 categorizeResults 阈值一致）
export function gradeOf(score: number): DayGrade {
  if (score >= 80) return 'best';
  if (score >= 60) return 'good';
  if (score >= 40) return 'normal';
  return 'bad';
}

// 农历日的唯一键：同一农历日期（含闰月标记）在不同候选区间间只出现一次
export function buildLunarKey(lunarYear: number, lunarMonth: number, lunarDay: number, isLeap: boolean): string {
  return `${lunarYear}-${isLeap ? 'L' : ''}${lunarMonth}-${lunarDay}`;
}

export function pickDays(
  startYear: number, startMonth: number, startDay: number,
  endYear: number, endMonth: number, endDay: number,
  events: string[],
  avoidShengxiao: string[] = []
): PickResult[] {
  const startJdn = gregorianToJDN(startYear, startMonth, startDay);
  const endJdn = gregorianToJDN(endYear, endMonth, endDay);
  const results: PickResult[] = [];

  // 跨年区间按儒略日逐日推进，公历年月日全部由 JDN 反解，
  // 不依赖任何「当年」状态，因此跨年边界不会错位。
  for (let jdn = startJdn; jdn <= endJdn; jdn++) {
    const [year, month, day] = jdnToGregorian(jdn);
    const score = scoreDay(year, month, day, events, avoidShengxiao);
    const yiJi = getDayYiJi(year, month, day);
    const lunar = solarToLunar(year, month, day);

    // 生成推荐理由
    const reasons: string[] = [];
    if (score >= 80) reasons.push('大吉之日');
    else if (score >= 60) reasons.push('吉日');

    for (const event of events) {
      if (yiJi.yi.some(y => event.includes(y) || y.includes(event))) {
        reasons.push(`宜${event}`);
      }
    }

    if (avoidShengxiao.length > 0 && avoidShengxiao.includes(yiJi.chongShengxiao)) {
      reasons.push(`冲${yiJi.chongShengxiao}，避讳减分`);
    }

    results.push({
      year, month, day,
      score,
      grade: gradeOf(score),
      yi: yiJi.yi,
      ji: yiJi.ji,
      ganZhi: lunar.dayGanZhi,
      chong: yiJi.chong,
      chongShengxiao: yiJi.chongShengxiao,
      reason: reasons.join('；') || '平日常日',
      weekDay: getWeekDay(year, month, day),
      lunarKey: buildLunarKey(lunar.year, lunar.month, lunar.day, lunar.isLeap),
      lunarYear: lunar.year,
      lunarMonth: lunar.month,
      lunarDay: lunar.day,
      lunarIsLeap: lunar.isLeap,
      lunarMonthName: lunar.monthName,
      lunarDayName: lunar.dayName
    });
  }

  // 按分数排序，同分按日期先后，保证跨年结果顺序稳定
  return results.sort((a, b) =>
    (b.score - a.score) ||
    gregorianToJDN(a.year, a.month, a.day) - gregorianToJDN(b.year, b.month, b.day)
  );
}

// 择日结果分类
export function categorizeResults(results: PickResult[]): {
  best: PickResult[];
  good: PickResult[];
  normal: PickResult[];
  bad: PickResult[];
} {
  return {
    best: results.filter(r => r.grade === 'best'),
    good: results.filter(r => r.grade === 'good'),
    normal: results.filter(r => r.grade === 'normal'),
    bad: results.filter(r => r.grade === 'bad')
  };
}
