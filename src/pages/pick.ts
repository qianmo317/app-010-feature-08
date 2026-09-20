import { router } from '../router';
import { createElement, clearElement } from '../utils/dom';
import { EVENT_WEIGHTS } from '../almanac/yiji';
import {
  CompareBoard, CompareRange, CompareDay, MarkType, MARK_LABELS,
  MAX_RANGES, TOP_DATES_PER_RANGE,
} from '../almanac/compare';

const STORAGE_KEY = 'pick-compare-board-v1';
const EXPANDED_TOP_N = 30;

export function renderPick(app: HTMLElement) {
  clearElement(app);
  app.className = 'page pick-page';

  const board = loadBoard();
  const expandedRanges = new Set<number>();

  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, board.toJSON());
    } catch {
      // 隐私模式等场景下本地保存不可用时静默降级
    }
  };

  const now = new Date();
  const defaultStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const defaultEnd = `${now.getFullYear() + 1}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // 头部
  const header = createElement('div', 'page-header');
  const backBtn = createElement('button', 'back-btn', '◀ 返回');
  backBtn.addEventListener('click', () => router.navigate('/'));
  const title = createElement('h1', 'page-title', '择日向导');
  header.append(backBtn, title);

  // 表单
  const form = createElement('div', 'pick-form');

  // 事项选择
  const eventsSection = createElement('div', 'form-section');
  eventsSection.innerHTML = '<label>选择事项（可多选）</label>';
  const eventsGrid = createElement('div', 'events-grid');
  const selectedEvents = new Set<string>();

  Object.keys(EVENT_WEIGHTS).forEach(event => {
    const btn = createElement('button', 'event-btn', event);
    btn.addEventListener('click', () => {
      if (selectedEvents.has(event)) {
        selectedEvents.delete(event);
        btn.classList.remove('selected');
      } else {
        selectedEvents.add(event);
        btn.classList.add('selected');
      }
    });
    eventsGrid.appendChild(btn);
  });
  eventsSection.appendChild(eventsGrid);

  // 日期范围
  const dateSection = createElement('div', 'form-section');
  dateSection.innerHTML = `
    <label>日期范围（每次算一个区间，加入后可再添加，最多 ${MAX_RANGES} 个对照）</label>
    <div class="date-range">
      <input type="date" id="start-date" value="${defaultStart}">
      <span>至</span>
      <input type="date" id="end-date" value="${defaultEnd}">
    </div>
  `;

  // 避讳
  const avoidSection = createElement('div', 'form-section');
  avoidSection.innerHTML = `
    <label>避讳生肖（可选，多选用逗号分隔）</label>
    <input type="text" id="avoid-shengxiao" placeholder="如：鼠,马,鸡">
  `;

  // 提交按钮
  const submitBtn = createElement('button', 'submit-btn', '计算并加入对比');

  form.append(eventsSection, dateSection, avoidSection, submitBtn);

  // 对比板区域
  const boardArea = createElement('div', 'board-area');

  submitBtn.addEventListener('click', () => {
    const startDate = (document.getElementById('start-date') as HTMLInputElement).value;
    const endDate = (document.getElementById('end-date') as HTMLInputElement).value;
    const avoidInput = (document.getElementById('avoid-shengxiao') as HTMLInputElement).value;
    const avoidShengxiao = avoidInput.split(/[,，]/).map(s => s.trim()).filter(Boolean);

    const res = board.addRange({
      startDate,
      endDate,
      events: Array.from(selectedEvents),
      avoidShengxiao,
    });
    if (res.error) {
      alert(res.error);
      return;
    }
    save();
    renderBoard();
  });

  app.append(header, form, boardArea);
  renderBoard();

  // ---- 以下为对比板渲染 ----

  function renderBoard() {
    clearElement(boardArea);

    if (board.ranges.length === 0) {
      const empty = createElement('div', 'board-empty',
        '还没有候选区间。算好一个区间后会保留在这里，可连续添加三五个区间对照，再把中意的日期勾成备选、记号或排除。');
      boardArea.appendChild(empty);
      return;
    }

    // 汇总条
    const summary = createElement('div', 'board-summary');
    const markCount = board.marks.length;
    summary.appendChild(createElement('span', 'board-count',
      `候选区间 ${board.ranges.length}/${MAX_RANGES} · 已标记 ${markCount} 天`));

    const exportBtn = createElement('button', 'export-btn-inline', '导出对比结果');
    exportBtn.addEventListener('click', () => {
      const text = board.exportText();
      const blob = new Blob(['\uFEFF' + text], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `择日对比_${new Date().toISOString().slice(0, 10)}.md`;
      a.click();
      URL.revokeObjectURL(url);
    });

    const clearBtn = createElement('button', 'clear-board-btn', '清空对比');
    clearBtn.addEventListener('click', () => {
      if (!confirm('确定清空所有候选区间、标记和定日吗？')) return;
      board.clear();
      save();
      renderBoard();
    });

    summary.append(exportBtn, clearBtn);
    boardArea.appendChild(summary);

    // 已定吉日横幅
    if (board.finalChoice) {
      boardArea.appendChild(createFinalBanner(board.finalChoice));
    }

    // 区间对照
    const grid = createElement('div', 'compare-grid');
    board.ranges.forEach((range, i) => {
      grid.appendChild(createRangeColumn(range, i));
    });
    boardArea.appendChild(grid);

    // 取舍记录面板
    if (board.marks.length > 0) {
      boardArea.appendChild(createMarksPanel());
    }
  }

  function createRangeColumn(range: CompareRange, index: number): HTMLElement {
    const col = createElement('div', 'compare-col');

    const head = createElement('div', 'compare-col-head');
    head.appendChild(createElement('div', 'compare-col-title', `区间${index + 1}`));
    const removeBtn = createElement('button', 'range-remove-btn', '移除');
    removeBtn.addEventListener('click', () => {
      board.removeRange(range.id);
      save();
      renderBoard();
    });
    head.appendChild(removeBtn);
    col.appendChild(head);

    col.appendChild(createElement('div', 'compare-col-range', `${range.startDate} ~ ${range.endDate}`));
    const avoid = range.avoidShengxiao.length > 0 ? ` · 避${range.avoidShengxiao.join('、')}` : '';
    col.appendChild(createElement('div', 'compare-col-events', `事项：${range.events.join('、')}${avoid}`));

    const stats = createElement('div', 'compare-stats');
    stats.innerHTML = `
      <span class="stat-best">大吉 ${range.stats.best}</span>
      <span class="stat-good">吉 ${range.stats.good}</span>
      <span class="stat-normal">平 ${range.stats.normal}</span>
      <span class="stat-bad">凶 ${range.stats.bad}</span>
    `;
    col.appendChild(stats);

    if (range.duplicatesSkipped > 0) {
      col.appendChild(createElement('div', 'compare-dup-note',
        `与已有区间重复 ${range.duplicatesSkipped} 天，已略过`));
    }

    // 排在前面的日期
    const expanded = expandedRanges.has(range.id);
    const topN = expanded ? EXPANDED_TOP_N : TOP_DATES_PER_RANGE;
    const list = createElement('div', 'top-date-list');
    board.topDates(range, topN).forEach(day => {
      list.appendChild(createTopDateRow(day));
    });
    col.appendChild(list);

    if (range.days.length > TOP_DATES_PER_RANGE) {
      const toggleBtn = createElement('button', 'top-toggle-btn',
        expanded ? `收起（只看前 ${TOP_DATES_PER_RANGE} 天）` : `展开更多（前 ${EXPANDED_TOP_N} 天，共 ${range.days.length} 天）`);
      toggleBtn.addEventListener('click', () => {
        if (expanded) expandedRanges.delete(range.id);
        else expandedRanges.add(range.id);
        renderBoard();
      });
      col.appendChild(toggleBtn);
    }

    return col;
  }

  function createTopDateRow(day: CompareDay): HTMLElement {
    const mark = board.getMark(day.lunarKey);
    const isFinal = board.finalChoice?.lunarKey === day.lunarKey;
    const row = createElement('div',
      `top-date-row${mark ? ` mark-${mark.type}` : ''}${isFinal ? ' is-final' : ''}`);

    const main = createElement('div', 'top-date-main');
    main.innerHTML = `
      <span class="top-date-solar">${day.date}</span>
      <span class="top-date-lunar">${day.lunarText}</span>
      <span class="top-date-score">${day.score}分</span>
      ${isFinal ? '<span class="final-badge">已定</span>' : ''}
    `;
    main.title = '点击查看当日详情';
    main.addEventListener('click', () => router.navigate(`/day/${day.date}`));
    row.appendChild(main);

    const actions = createElement('div', 'top-date-actions');
    (['candidate', 'noted', 'excluded'] as MarkType[]).forEach(type => {
      const btn = createElement('button',
        `mark-btn mark-btn-${type}${mark?.type === type ? ' active' : ''}`,
        MARK_LABELS[type]);
      btn.addEventListener('click', () => onMarkClick(day, type));
      actions.appendChild(btn);
    });
    row.appendChild(actions);

    if (mark?.reason) {
      row.appendChild(createElement('div', 'top-date-reason', `${MARK_LABELS[mark.type]}理由：${mark.reason}`));
    }
    return row;
  }

  function onMarkClick(day: CompareDay, type: MarkType) {
    const existing = board.getMark(day.lunarKey);
    if (existing?.type === type) {
      // 再点一次同类标记 = 取消
      board.clearMark(day.lunarKey);
    } else {
      const hint = type === 'excluded' ? '（排除必须写清原因）' : '（可留空）';
      const reason = window.prompt(
        `将 ${day.date}（${day.lunarText}）标记为「${MARK_LABELS[type]}」，写一句取舍理由${hint}：`,
        existing?.reason ?? '');
      if (reason === null) return;
      const res = board.setMark(day.lunarKey, type, reason);
      if (res.error) {
        alert(res.error);
        return;
      }
    }
    save();
    renderBoard();
  }

  function onDecide(lunarKey: string) {
    const day = board.findDay(lunarKey);
    if (!day) return;
    const mark = board.getMark(lunarKey);
    const reason = window.prompt(
      `定下 ${day.date}（农历${day.lunarText}）为吉日，记下当时的理由：`,
      mark?.reason ?? '');
    if (reason === null) return;
    const res = board.decide(lunarKey, reason);
    if (res.error) {
      alert(res.error);
      return;
    }
    save();
    renderBoard();
  }

  function createFinalBanner(choice: NonNullable<CompareBoard['finalChoice']>): HTMLElement {
    const banner = createElement('div', 'final-banner');
    const decidedAt = new Date(choice.decidedAt).toLocaleString('zh-CN', { hour12: false });
    banner.innerHTML = `
      <div class="final-title">🎯 已定吉日：${choice.date}（农历${choice.lunarText}，${choice.score}分）</div>
      <div class="final-reason">定日理由：${choice.reason}</div>
      <div class="final-time">定日时间：${decidedAt}</div>
    `;
    const undoBtn = createElement('button', 'final-undo-btn', '撤销定日');
    undoBtn.addEventListener('click', () => {
      board.clearDecision();
      save();
      renderBoard();
    });
    banner.appendChild(undoBtn);
    return banner;
  }

  function createMarksPanel(): HTMLElement {
    const panel = createElement('div', 'marks-panel');
    panel.appendChild(createElement('h3', 'marks-title', '取舍记录'));

    (['candidate', 'noted', 'excluded'] as MarkType[]).forEach(type => {
      const list = board.marksByType(type);
      if (list.length === 0) return;
      const group = createElement('div', `marks-group marks-${type}`);
      const titleText = type === 'excluded' ? '排除（含排除原因）' : MARK_LABELS[type];
      group.appendChild(createElement('div', 'marks-group-title', `${titleText}（${list.length}）`));

      list.forEach(mark => {
        const item = createElement('div', 'marks-item');
        const text = createElement('span', 'marks-item-text',
          `${mark.date}（${mark.lunarText}，${mark.score}分）${mark.reason ? `：${mark.reason}` : ''}`);
        item.appendChild(text);

        if (type === 'candidate') {
          const decideBtn = createElement('button', 'decide-btn', '定为吉日');
          decideBtn.addEventListener('click', () => onDecide(mark.lunarKey));
          item.appendChild(decideBtn);
        }
        const unmarkBtn = createElement('button', 'unmark-btn', '取消');
        unmarkBtn.addEventListener('click', () => {
          board.clearMark(mark.lunarKey);
          save();
          renderBoard();
        });
        item.appendChild(unmarkBtn);
        group.appendChild(item);
      });
      panel.appendChild(group);
    });
    return panel;
  }
}

function loadBoard(): CompareBoard {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const board = CompareBoard.fromJSON(raw);
      if (board) return board;
    }
  } catch {
    // 本地保存不可用时使用空对比板
  }
  return new CompareBoard();
}
