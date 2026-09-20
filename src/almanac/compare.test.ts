import { describe, it, expect } from 'vitest';
import { CompareBoard, MAX_RANGES } from './compare';

function addOk(board: CompareBoard, start: string, end: string, events = ['嫁娶']) {
  const res = board.addRange({ startDate: start, endDate: end, events, avoidShengxiao: [] });
  expect(res.error).toBeUndefined();
  return res.range!;
}

describe('候选区间管理', () => {
  it('应统计大吉/吉/平/凶天数并按分数排序', () => {
    const board = new CompareBoard();
    const range = addOk(board, '2026-03-01', '2026-03-31');
    const { best, good, normal, bad } = range.stats;
    expect(best + good + normal + bad).toBe(31);
    expect(range.days.length).toBe(31);
    for (let i = 1; i < range.days.length; i++) {
      expect(range.days[i].score).toBeLessThanOrEqual(range.days[i - 1].score);
    }
  });

  it('最多同时保留5个候选区间', () => {
    const board = new CompareBoard();
    for (let i = 0; i < MAX_RANGES; i++) {
      addOk(board, `2026-0${i + 1}-01`, `2026-0${i + 1}-28`);
    }
    const res = board.addRange({ startDate: '2026-06-01', endDate: '2026-06-30', events: ['嫁娶'], avoidShengxiao: [] });
    expect(res.error).toContain('5');
    expect(board.ranges.length).toBe(MAX_RANGES);
  });

  it('应校验日期合法性', () => {
    const board = new CompareBoard();
    expect(board.addRange({ startDate: '2026-05-01', endDate: '2026-04-01', events: ['嫁娶'], avoidShengxiao: [] }).error).toContain('开始日期');
    expect(board.addRange({ startDate: '2026-01-01', endDate: '2026-01-10', events: [], avoidShengxiao: [] }).error).toContain('事项');
    expect(board.addRange({ startDate: '2026-01-01', endDate: '2030-01-01', events: ['嫁娶'], avoidShengxiao: [] }).error).toContain('3 年');
  });

  it('重叠区间的同一段农历日期不能重复出现', () => {
    const board = new CompareBoard();
    addOk(board, '2026-01-01', '2026-03-31');
    const second = addOk(board, '2026-02-01', '2026-04-30');

    // 2-3月与前一区间重叠，应被略过
    expect(second.duplicatesSkipped).toBeGreaterThan(0);
    // 全板农历日期唯一
    const allKeys = board.ranges.flatMap(r => r.days.map(d => d.lunarKey));
    expect(new Set(allKeys).size).toBe(allKeys.length);
    // 第二区间只保留4月的日期
    expect(second.days.every(d => d.date >= '2026-04-01')).toBe(true);
  });

  it('完全重复的区间应拒绝加入', () => {
    const board = new CompareBoard();
    addOk(board, '2026-01-01', '2026-01-31');
    const res = board.addRange({ startDate: '2026-01-01', endDate: '2026-01-31', events: ['嫁娶'], avoidShengxiao: [] });
    expect(res.error).toContain('重复');
    expect(board.ranges.length).toBe(1);
  });

  it('跨年区间算出来不能错位', () => {
    const board = new CompareBoard();
    const range = addOk(board, '2024-12-01', '2025-02-15');

    const byDate = new Map(range.days.map(d => [d.date, d]));
    // 2024-12-31 是农历腊月初一
    expect(byDate.get('2024-12-31')?.lunarText).toBe('腊月初一');
    // 2025-01-28 是除夕（腊月廿九），仍属农历2024年
    expect(byDate.get('2025-01-28')?.lunarText).toBe('腊月廿九');
    expect(byDate.get('2025-01-28')?.lunarKey.startsWith('2024-')).toBe(true);
    // 2025-01-29 是春节（正月初一）
    expect(byDate.get('2025-01-29')?.lunarText).toBe('正月初一');
    expect(byDate.get('2025-01-29')?.lunarKey.startsWith('2025-')).toBe(true);
    // 区间内农历日期无重复
    const keys = range.days.map(d => d.lunarKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('日期标记与定日', () => {
  function boardWithRange() {
    const board = new CompareBoard();
    const range = addOk(board, '2026-03-01', '2026-03-31');
    return { board, day: range.days[0], day2: range.days[1] };
  }

  it('每个日期可标记为备选/记号/排除并记录理由', () => {
    const { board, day } = boardWithRange();
    expect(board.setMark(day.lunarKey, 'candidate', '周末，方便亲友').error).toBeUndefined();
    expect(board.getMark(day.lunarKey)?.type).toBe('candidate');
    expect(board.getMark(day.lunarKey)?.reason).toBe('周末，方便亲友');
    // 同一日期改标记会覆盖
    board.setMark(day.lunarKey, 'noted', '再想想');
    expect(board.getMark(day.lunarKey)?.type).toBe('noted');
    expect(board.marks.length).toBe(1);
    // 取消标记
    expect(board.clearMark(day.lunarKey)).toBe(true);
    expect(board.getMark(day.lunarKey)).toBeUndefined();
  });

  it('被排除的日期必须写清排除原因', () => {
    const { board, day } = boardWithRange();
    expect(board.setMark(day.lunarKey, 'excluded', '').error).toContain('排除原因');
    expect(board.setMark(day.lunarKey, 'excluded', '   ').error).toContain('排除原因');
    expect(board.setMark(day.lunarKey, 'excluded', '冲新人生肖').error).toBeUndefined();
    expect(board.getMark(day.lunarKey)?.reason).toBe('冲新人生肖');
  });

  it('定日要记下理由，被排除的日期不能定', () => {
    const { board, day, day2 } = boardWithRange();
    expect(board.decide(day.lunarKey, '').error).toContain('理由');
    board.setMark(day.lunarKey, 'excluded', '与家人生日冲突');
    expect(board.decide(day.lunarKey, '就想这天').error).toContain('排除');

    expect(board.decide(day2.lunarKey, '分数最高且是周末').error).toBeUndefined();
    expect(board.finalChoice?.date).toBe(day2.date);
    expect(board.finalChoice?.reason).toBe('分数最高且是周末');
    // 已定吉日不能再被排除
    expect(board.setMark(day2.lunarKey, 'excluded', '改主意了').error).toContain('撤销定日');
    // 撤销后可排除
    board.clearDecision();
    expect(board.setMark(day2.lunarKey, 'excluded', '改主意了').error).toBeUndefined();
  });

  it('移除区间后其标记与定日一并清理', () => {
    const { board, day } = boardWithRange();
    board.setMark(day.lunarKey, 'candidate', '不错');
    board.decide(day.lunarKey, '就它了');
    const id = board.ranges[0].id;
    expect(board.removeRange(id)).toBe(true);
    expect(board.marks.length).toBe(0);
    expect(board.finalChoice).toBeNull();
  });
});

describe('导出对比结果', () => {
  it('导出内容应包含区间统计、标记理由、排除原因与定日理由', () => {
    const board = new CompareBoard();
    const r1 = addOk(board, '2024-12-01', '2025-01-31', ['嫁娶', '搬家']);
    addOk(board, '2025-02-01', '2025-02-28');

    const best = r1.days[0];
    const excluded = r1.days[r1.days.length - 1];
    board.setMark(best.lunarKey, 'candidate', '分数最高');
    board.setMark(excluded.lunarKey, 'excluded', '冲家人生肖');
    board.decide(best.lunarKey, '分数最高且酒店有空档');

    const text = board.exportText();
    // 区间对照与统计
    expect(text).toContain('区间1：2024-12-01 ~ 2025-01-31');
    expect(text).toContain('区间2：2025-02-01 ~ 2025-02-28');
    expect(text).toMatch(/大吉 \d+ 天 \/ 吉 \d+ 天 \/ 平 \d+ 天 \/ 凶 \d+ 天/);
    // 靠前日期与农历
    expect(text).toContain(best.date);
    expect(text).toContain(best.lunarText);
    // 取舍与排除原因
    expect(text).toContain('分数最高');
    expect(text).toContain('排除（含排除原因）');
    expect(text).toContain('冲家人生肖');
    // 最终定日与理由
    expect(text).toContain('最终定日');
    expect(text).toContain('分数最高且酒店有空档');
  });

  it('本地保存后可完整恢复，农历去重仍然生效', () => {
    const board = new CompareBoard();
    const r1 = addOk(board, '2026-01-01', '2026-02-28');
    board.setMark(r1.days[0].lunarKey, 'candidate', '留着');
    board.decide(r1.days[0].lunarKey, '先定这个');

    const restored = CompareBoard.fromJSON(board.toJSON());
    expect(restored).not.toBeNull();
    expect(restored!.ranges.length).toBe(1);
    expect(restored!.marks.length).toBe(1);
    expect(restored!.finalChoice?.reason).toBe('先定这个');
    // 恢复后农历键集合已重建，重叠区间仍会去重
    const res = restored!.addRange({ startDate: '2026-02-01', endDate: '2026-03-31', events: ['嫁娶'], avoidShengxiao: [] });
    expect(res.error).toBeUndefined();
    expect(res.range!.duplicatesSkipped).toBeGreaterThan(0);
    const allKeys = restored!.ranges.flatMap(r => r.days.map(d => d.lunarKey));
    expect(new Set(allKeys).size).toBe(allKeys.length);
  });

  it('损坏的存档应安全忽略', () => {
    expect(CompareBoard.fromJSON('not-json')).toBeNull();
    expect(CompareBoard.fromJSON('{"foo":1}')).toBeNull();
  });
});
