// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderPick } from './pick';

function setupApp() {
  document.body.innerHTML = '<div id="app"></div>';
  return document.getElementById('app')!;
}

function selectFirstEvent() {
  const btn = document.querySelector<HTMLButtonElement>('.event-btn');
  btn!.click();
}

function setDates(start: string, end: string) {
  (document.getElementById('start-date') as HTMLInputElement).value = start;
  (document.getElementById('end-date') as HTMLInputElement).value = end;
}

function submit() {
  document.querySelector<HTMLButtonElement>('.submit-btn')!.click();
}

describe('择日向导对比板（UI 冒烟）', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('空板提示与表单渲染', () => {
    const app = setupApp();
    renderPick(app);
    expect(document.querySelector('.board-empty')?.textContent).toContain('还没有候选区间');
    expect(document.querySelector('.submit-btn')?.textContent).toContain('加入对比');
  });

  it('可连续加入多个区间并显示对照统计', () => {
    const app = setupApp();
    renderPick(app);
    selectFirstEvent();

    setDates('2026-03-01', '2026-03-31');
    submit();
    setDates('2026-04-01', '2026-04-30');
    submit();

    expect(document.querySelectorAll('.compare-col').length).toBe(2);
    expect(document.querySelector('.board-count')?.textContent).toContain('候选区间 2/5');
    const statsText = document.querySelector('.compare-stats')?.textContent ?? '';
    expect(statsText).toContain('大吉');
    expect(statsText).toContain('凶');
    // 每个区间展示靠前日期
    expect(document.querySelectorAll('.compare-col')[0].querySelectorAll('.top-date-row').length).toBe(5);
  });

  it('重叠区间会提示农历重复已略过', () => {
    const app = setupApp();
    renderPick(app);
    selectFirstEvent();
    setDates('2026-03-01', '2026-04-30');
    submit();
    setDates('2026-04-01', '2026-05-31');
    submit();
    expect(document.querySelector('.compare-dup-note')?.textContent).toContain('重复');
    expect(document.querySelector('.compare-dup-note')?.textContent).toContain('已略过');
  });

  it('标记、排除需填原因、定日与导出全链路', () => {
    const app = setupApp();
    renderPick(app);
    selectFirstEvent();
    setDates('2026-03-01', '2026-03-31');
    submit();

    const promptSpy = vi.spyOn(window, 'prompt');
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    // 排除但不填原因 -> 报错
    promptSpy.mockReturnValue('');
    document.querySelector<HTMLButtonElement>('.top-date-row .mark-btn-excluded')!.click();
    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('排除原因'));

    // 排除并填原因
    promptSpy.mockReturnValue('冲家人生肖');
    document.querySelector<HTMLButtonElement>('.top-date-row .mark-btn-excluded')!.click();
    expect(document.querySelector('.marks-excluded .marks-item-text')?.textContent).toContain('冲家人生肖');

    // 勾备选
    promptSpy.mockReturnValue('周末方便');
    const rows = document.querySelectorAll('.top-date-row');
    rows[1].querySelector<HTMLButtonElement>('.mark-btn-candidate')!.click();
    expect(document.querySelector('.marks-candidate .marks-item-text')?.textContent).toContain('周末方便');

    // 定为吉日
    promptSpy.mockReturnValue('分数高且是周末');
    document.querySelector<HTMLButtonElement>('.decide-btn')!.click();
    expect(document.querySelector('.final-banner')?.textContent).toContain('已定吉日');
    expect(document.querySelector('.final-reason')?.textContent).toContain('分数高且是周末');

    // 刷新页面（重新渲染）后状态仍在
    renderPick(setupApp());
    expect(document.querySelector('.final-banner')?.textContent).toContain('已定吉日');
    expect(document.querySelector('.marks-excluded')).not.toBeNull();
  });

  it('清空对比后回到空板', () => {
    const app = setupApp();
    renderPick(app);
    selectFirstEvent();
    setDates('2026-03-01', '2026-03-31');
    submit();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    document.querySelector<HTMLButtonElement>('.clear-board-btn')!.click();
    expect(document.querySelector('.board-empty')).not.toBeNull();
    expect(localStorage.getItem('pick-compare-board-v1')).toContain('"ranges":[]');
  });

  it('导出按钮应生成对比结果文件下载', async () => {
    const app = setupApp();
    renderPick(app);
    selectFirstEvent();
    setDates('2026-03-01', '2026-03-31');
    submit();

    const blobs: Blob[] = [];
    vi.stubGlobal('URL', Object.assign(URL, {
      createObjectURL: (b: Blob) => { blobs.push(b); return 'blob:mock'; },
      revokeObjectURL: () => {},
    }));
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    document.querySelector<HTMLButtonElement>('.export-btn-inline')!.click();
    expect(blobs.length).toBe(1);
    expect(clickSpy).toHaveBeenCalled();
    const text = await blobs[0].text();
    expect(text).toContain('择日对比结果');
    expect(text).toContain('区间1：2026-03-01 ~ 2026-03-31');
    vi.unstubAllGlobals();
  });
});
