import { router } from '../router';
import { createElement, clearElement } from '../utils/dom';
import { EVENT_WEIGHTS } from '../almanac/yiji';
import { GRADE_LABEL } from '../almanac/pick-day';
import {
  buildComparison, comparisonToCSV, applyMark, excludeDay, makeDecision,
  findDay, validateInterval,
  MAX_INTERVALS,
  Comparison, CompareDay, DayMark, Decision, IntervalSpec
} from '../almanac/compare';
import { loadSession, saveSession, clearSession, restoreMarks, PickSession } from './pick-session';
import { exportComparisonImage } from './pick-export';

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
const MARK_NAMES: Record<DayMark, string> = { none: '未标记', candidate: '备选', note: '记号', excluded: '排除' };

interface IntervalForm {
  id: string;
  label: string;
  start: string;
  end: string;
}

export function renderPick(app: HTMLElement) {
  clearElement(app);
  app.className = 'page pick-page';

  const now = new Date();
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const defaultStart = iso(now);
  const defaultEnd = iso(new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()));

  // ---- 恢复会话 ----
  const saved = loadSession();
  const selectedEvents = new Set<string>(saved?.events ?? []);
  let avoidText = saved?.avoidText ?? '';
  let intervalForms: IntervalForm[] = saved?.intervals?.length
    ? saved.intervals.map(i => ({ ...i }))
    : [{ id: uid(), label: '区间一', start: defaultStart, end: defaultEnd }];
  let marks: Record<string, { mark: DayMark; note: string }> = saved?.marks ?? {};
  let decision: Decision | undefined = saved?.decision;
  let comparison: Comparison | undefined;

  // ---- 头部 ----
  const header = createElement('div', 'page-header');
  const backBtn = createElement('button', 'back-btn', '◀ 返回');
  backBtn.addEventListener('click', () => router.navigate('/'));
  header.append(backBtn, createElement('h1', 'page-title', '择日向导 · 多区间对照'));

  // ---- 事项 ----
  const eventsSection = createElement('div', 'form-section');
  eventsSection.innerHTML = '<label>选择事项（所有候选区间共用，可多选）</label>';
  const eventsGrid = createElement('div', 'events-grid');
  Object.keys(EVENT_WEIGHTS).forEach(event => {
    const btn = createElement('button', 'event-btn' + (selectedEvents.has(event) ? ' selected' : ''), event);
    btn.addEventListener('click', () => {
      if (selectedEvents.has(event)) { selectedEvents.delete(event); btn.classList.remove('selected'); }
      else { selectedEvents.add(event); btn.classList.add('selected'); }
    });
    eventsGrid.appendChild(btn);
  });
  eventsSection.appendChild(eventsGrid);

  // ---- 避讳 ----
  const avoidSection = createElement('div', 'form-section');
  avoidSection.innerHTML = `<label>避讳生肖（可选，多选用逗号分隔）</label>`;
  const avoidInput = document.createElement('input');
  avoidInput.type = 'text';
  avoidInput.placeholder = '如：鼠,马,鸡';
  avoidInput.value = avoidText;
  avoidInput.addEventListener('input', () => { avoidText = avoidInput.value; });
  avoidSection.appendChild(avoidInput);

  // ---- 候选区间 ----
  const intervalsWrap = createElement('div', 'intervals-wrap');
  const intervalsHint = createElement('div', 'form-hint', `可同时保留 ${MAX_INTERVALS} 个候选区间对照，每个区间单独命名`);

  function renderIntervalForms() {
    clearElement(intervalsWrap);
    intervalForms.forEach((form, idx) => {
      const row = createElement('div', 'interval-row');
      const nameInput = document.createElement('input');
      nameInput.className = 'interval-name';
      nameInput.value = form.label;
      nameInput.placeholder = `区间${['一', '二', '三', '四', '五'][idx] ?? idx + 1}`;
      nameInput.addEventListener('input', () => { form.label = nameInput.value || nameInput.placeholder; });

      const startInput = dateInput(form.start);
      const endInput = dateInput(form.end);
      startInput.addEventListener('change', () => { form.start = startInput.value; });
      endInput.addEventListener('change', () => { form.end = endInput.value; });

      const dates = createElement('div', 'interval-dates');
      dates.append(startInput, createElement('span', '', '至'), endInput);

      const removeBtn = createElement('button', 'interval-remove', '✕') as HTMLButtonElement;
      removeBtn.title = '删除该候选区间';
      removeBtn.disabled = intervalForms.length <= 1;
      removeBtn.addEventListener('click', () => {
        intervalForms = intervalForms.filter(f => f.id !== form.id);
        renderIntervalForms();
      });

      row.append(nameInput, dates, removeBtn);
      intervalsWrap.appendChild(row);
    });

    if (intervalForms.length < MAX_INTERVALS) {
      const addBtn = createElement('button', 'interval-add', `＋ 再添一个候选区间（还可加 ${MAX_INTERVALS - intervalForms.length} 个）`);
      addBtn.addEventListener('click', () => {
        const idx = intervalForms.length;
        intervalForms.push({
          id: uid(),
          label: `区间${['一', '二', '三', '四', '五'][idx] ?? idx + 1}`,
          start: defaultStart,
          end: defaultEnd
        });
        renderIntervalForms();
      });
      intervalsWrap.appendChild(addBtn);
    }
  }
  renderIntervalForms();

  // ---- 操作按钮 ----
  const actionsRow = createElement('div', 'pick-actions');
  const submitBtn = createElement('button', 'submit-btn', '计算并对照');
  const resetBtn = createElement('button', 'reset-btn', '清空重来');
  actionsRow.append(submitBtn, resetBtn);

  const formCard = createElement('div', 'pick-form');
  formCard.append(eventsSection, avoidSection, intervalsHint, intervalsWrap, actionsRow);

  // ---- 结果区 ----
  const resultArea = createElement('div', 'compare-area');

  submitBtn.addEventListener('click', () => {
    if (selectedEvents.size === 0) { alert('请至少选择一个事项'); return; }

    const avoid = avoidText.split(/[,，\s]+/).map(s => s.trim()).filter(Boolean);
    const specs: IntervalSpec[] = intervalForms.map(f => ({
      id: f.id,
      label: f.label.trim() || '未命名区间',
      start: f.start,
      end: f.end
    }));

    // 先做可见的区间校验提示
    for (const s of specs) {
      const err = validateInterval(s);
      if (err) { alert(`「${s.label}」${err}`); return; }
    }

    const raw = buildComparison({ events: Array.from(selectedEvents), avoidShengxiao: avoid, intervals: specs });
    // 只保留仍在对照结果中的日期标记，丢弃旧区间遗留
    const validKeys = new Set(raw.days.map(d => d.solarKey));
    marks = Object.fromEntries(Object.entries(marks).filter(([k]) => validKeys.has(k)));
    comparison = restoreMarks(raw, marks);
    // 已定夺的日期若已不在结果中、或后来被排除，取消定夺
    const decided = decision && comparison.days.find(d => d.solarKey === decision!.solarKey);
    if (decision && (!decided || decided.mark === 'excluded')) decision = undefined;
    persist();
    renderComparison();
  });

  resetBtn.addEventListener('click', () => {
    if (!confirm('确定清空全部候选区间、标记与定夺记录？')) return;
    clearSession();
    selectedEvents.clear();
    marks = {};
    decision = undefined;
    comparison = undefined;
    clearElement(resultArea);
    renderPick(app);
  });

  // ---- 持久化 ----
  function persist() {
    const session: PickSession = {
      events: Array.from(selectedEvents),
      avoidText,
      intervals: intervalForms.map(f => ({ id: f.id, label: f.label, start: f.start, end: f.end })),
      marks,
      decision,
      updatedAt: new Date().toISOString()
    };
    saveSession(session);
  }

  // ---- 标记操作 ----
  function updateDay(solarKey: string, updater: (d: CompareDay) => CompareDay) {
    if (!comparison) return;
    const current = findDay(comparison, solarKey);
    if (!current) return;
    const next = updater(current);
    marks[solarKey] = { mark: next.mark, note: next.note };
    comparison = restoreMarks(comparison, marks);
    persist();
    renderComparison();
  }

  // ---- 渲染对照结果 ----
  function renderComparison() {
    clearElement(resultArea);
    if (!comparison) return;
    const comp = comparison;

    // 候选 / 记号 / 排除 概览
    const candidateDays = comp.days.filter(d => d.mark === 'candidate');
    const noteDays = comp.days.filter(d => d.mark === 'note');
    const excludedDays = comp.days.filter(d => d.mark === 'excluded');

    // 定夺条
    resultArea.appendChild(renderDecisionBar(comp));

    // 区间统计并列
    const statsRow = createElement('div', 'stats-row');
    comp.intervals.forEach((it, i) => {
      const card = createElement('div', 'stat-card' + (it.stats.valid ? '' : ' invalid'));
      const title = createElement('div', 'stat-title',
        `区间${['一', '二', '三', '四', '五'][i] ?? i + 1} · ${it.label}`);
      const range = createElement('div', 'stat-range', `${it.start} ~ ${it.end}`);
      card.append(title, range);
      if (!it.stats.valid) {
        card.appendChild(createElement('div', 'stat-error', it.stats.error || '区间无效'));
      } else {
        const nums = createElement('div', 'stat-nums');
        nums.append(
          statNum('大吉', it.stats.best, 'best'),
          statNum('吉', it.stats.good, 'good'),
          statNum('平', it.stats.normal, 'normal'),
          statNum('凶', it.stats.bad, 'bad'),
          statNum('合计', it.stats.total, 'total')
        );
        card.appendChild(nums);
        card.appendChild(createElement('div', 'stat-elapsed',
          `${it.stats.elapsedMs.toFixed(1)}ms · 去重折叠 ${it.collapsed.length} 天`));
      }
      statsRow.appendChild(card);
    });
    resultArea.appendChild(statsRow);

    // 标记概览
    if (candidateDays.length || noteDays.length || excludedDays.length) {
      const board = createElement('div', 'mark-board card-like');
      board.innerHTML = '<h3>我的取舍</h3>';
      if (candidateDays.length) board.appendChild(markGroup('备选', candidateDays, 'candidate'));
      if (noteDays.length) board.appendChild(markGroup('记号', noteDays, 'note'));
      if (excludedDays.length) board.appendChild(markGroup('排除（含原因）', excludedDays, 'excluded'));
      resultArea.appendChild(board);
    }

    // 各区间前排日期对照
    // 每个区间拥有的日期是已去重的（compare 层保证），此处只处理跨区间视图重复：
    // 一张卡片只在最早出现的区间段落渲染一次。
    const topShownBefore: Set<string>[] = [];
    const allShownBefore: Set<string>[] = [];
    {
      const topSeen = new Set<string>();
      const allSeen = new Set<string>();
      for (const it of comp.intervals) {
        topShownBefore.push(new Set(topSeen));
        allShownBefore.push(new Set(allSeen));
        it.top.forEach(d => topSeen.add(d.solarKey));
        it.days.forEach(d => allSeen.add(d.solarKey));
      }
    }

    comp.intervals.forEach((it, i) => {
      const sec = createElement('div', 'interval-top-section');
      const header2 = createElement('div', 'interval-top-header');
      header2.appendChild(createElement('span', '',
        `区间${['一', '二', '三', '四', '五'][i] ?? i + 1}「${it.label}」前排吉日`));
      const toggle = createElement('button', 'link-btn', '展开全部日期 ▾') as HTMLButtonElement;
      let expanded = false;
      const grid = createElement('div', 'day-grid');

      function drawTop() {
        clearElement(grid);
        const source = expanded ? it.days : it.top;
        const seenBefore = expanded ? allShownBefore[i] : topShownBefore[i];
        const list = source.filter(d => !seenBefore.has(d.solarKey));
        const hiddenCount = source.length - list.length;
        if (list.length === 0) {
          grid.appendChild(createElement('div', 'empty-tip',
            it.stats.valid
              ? (hiddenCount ? '该区间日期均已在前面的区间卡片中列出' : '该区间没有大吉/吉的日期，可展开全部查看')
              : '区间无效'));
        } else {
          list.forEach(d => grid.appendChild(renderDayCard(d)));
          if (hiddenCount) {
            grid.appendChild(createElement('div', 'empty-tip',
              `另有 ${hiddenCount} 天已在前面区间的卡片中列出（同一段日期不重复摆卡片）`));
          }
        }
      }
      toggle.addEventListener('click', () => {
        expanded = !expanded;
        toggle.textContent = expanded ? '只看前排吉日 ▴' : `展开全部日期（${it.days.length} 天）▾`;
        drawTop();
      });
      toggle.textContent = it.days.length > it.top.length ? `展开全部日期（${it.days.length} 天）▾` : '全部为前排吉日';
      if (it.days.length <= it.top.length) toggle.disabled = true;

      header2.appendChild(toggle);
      sec.append(header2, grid);
      drawTop();

      if (it.collapsed.length) {
        const dup = createElement('details', 'collapsed-tip');
        dup.innerHTML = `<summary>有 ${it.collapsed.length} 天与其它候选区间是同一段农历日期或公历同日，已去重不重复列出</summary>`;
        const ul = document.createElement('div');
        ul.className = 'collapsed-list';
        it.collapsed.slice(0, 60).forEach(d => {
          const owner = comp.lunarFirst[d.lunarKey];
          const ownerKey = owner?.solarKey;
          const ownerIsSameSolar = ownerKey === d.solarKey;
          const reason = owner
            ? (ownerIsSameSolar
                ? `公历同日，已在「${owner.intervalLabel}」列出`
                : `农历同为 ${d.lunarYear}年${d.lunarMonthName}${d.lunarDayName}，对应公历 ${ownerKey}（${owner.intervalLabel}）`)
            : '公历同日，已在更早的区间列出';
          ul.appendChild(createElement('div', 'collapsed-item', `${d.solarKey}（${d.lunarMonthName}${d.lunarDayName}）— ${reason}`));
        });
        if (it.collapsed.length > 60) {
          ul.appendChild(createElement('div', 'collapsed-item', `……其余 ${it.collapsed.length - 60} 天同理`));
        }
        dup.appendChild(ul);
        sec.appendChild(dup);
      }

      resultArea.appendChild(sec);
    });

    // 导出
    const exportRow = createElement('div', 'export-row');
    const csvBtn = createElement('button', 'export-btn secondary', '导出对照（CSV/Excel）');
    csvBtn.addEventListener('click', () => {
      const csv = comparisonToCSV(comp, decision);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `择日对照_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
    const imgBtn = createElement('button', 'export-btn', '导出对照长图') as HTMLButtonElement;
    imgBtn.addEventListener('click', () => {
      imgBtn.textContent = '生成图片中...';
      imgBtn.disabled = true;
      exportComparisonImage(comp, decision).finally(() => {
        imgBtn.textContent = '导出对照长图';
        imgBtn.disabled = false;
      });
    });
    exportRow.append(csvBtn, imgBtn);
    resultArea.appendChild(exportRow);
  }

  // ---- 定夺条 ----
  function renderDecisionBar(comp: Comparison): HTMLElement {
    const bar = createElement('div', 'decision-bar');
    if (decision) {
      const d = decision;
      bar.classList.add('decided');
      bar.innerHTML = `
        <div class="decision-head">★ 已定下：${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}
          <span class="decision-time">（${new Date(d.decidedAt).toLocaleString('zh-CN')}）</span></div>
        <div class="decision-reason">定夺理由：${escapeHtml(d.reason)}</div>
      `;
      const undo = createElement('button', 'link-btn', '撤销定夺');
      undo.addEventListener('click', () => { decision = undefined; persist(); renderComparison(); });
      bar.appendChild(undo);
      return bar;
    }

    bar.innerHTML = '<div class="decision-head">从备选日期中定下一天</div>';
    const candidates = comp.days.filter(d => d.mark === 'candidate');
    if (candidates.length === 0) {
      bar.appendChild(createElement('div', 'decision-hint', '先在下方日期卡片上点「备选」勾出候选，再回到这里定夺。'));
      return bar;
    }

    const select = document.createElement('select');
    select.className = 'decision-select';
    candidates.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.solarKey;
      opt.textContent = `${d.solarKey}（${GRADE_LABEL[d.grade]} ${d.score}分 · ${d.lunarMonthName}${d.lunarDayName}）${d.note ? '— ' + d.note : ''}`;
      select.appendChild(opt);
    });

    const reasonInput = document.createElement('input');
    reasonInput.className = 'decision-reason-input';
    reasonInput.placeholder = '写下为什么最终选这一天（必填，会随结果一起导出）';

    const confirmBtn = createElement('button', 'decide-btn', '定下这一天');
    confirmBtn.addEventListener('click', () => {
      const day = findDay(comp, select.value);
      if (!day) return;
      try {
        decision = makeDecision(day, reasonInput.value);
      } catch (e) {
        alert((e as Error).message);
        return;
      }
      persist();
      renderComparison();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    const row = createElement('div', 'decision-form');
    row.append(select, reasonInput, confirmBtn);
    bar.appendChild(row);
    return bar;
  }

  // ---- 单日卡片 ----
  function renderDayCard(d: CompareDay): HTMLElement {
    const card = createElement('div',
      `day-card grade-${d.grade} mark-${d.mark}`);
    card.dataset.solarKey = d.solarKey;
    card.innerHTML = `
      <div class="dc-head">
        <span class="dc-date">${d.solarKey}</span>
        <span class="dc-weekday">周${WEEK[d.weekDay]}</span>
        <span class="dc-grade">${GRADE_LABEL[d.grade]} ${d.score}</span>
      </div>
      <div class="dc-sub">${d.lunarYear}年${d.lunarMonthName}${d.lunarDayName} · ${d.ganZhi}日</div>
      ${d.chongShengxiao ? `<div class="dc-chong">冲${d.chongShengxiao}${comparison?.avoidShengxiao.includes(d.chongShengxiao) ? '（命中避讳）' : ''}</div>` : ''}
      <div class="dc-reason">${d.reason}</div>
      ${d.alsoIn.length ? `<div class="dc-alsoin">同一段日期也见于：${d.alsoIn.join('、')}</div>` : ''}
      ${d.note ? `<div class="dc-note ${d.mark === 'excluded' ? 'is-excluded' : ''}">${d.mark === 'excluded' ? '排除原因：' : '备注：'}${escapeHtml(d.note)}</div>` : ''}
    `;

    // 点击日期头部跳转单日详情
    card.querySelector('.dc-head')?.addEventListener('click', () => {
      router.navigate(`/day/${d.solarKey}`);
    });

    const actions = createElement('div', 'dc-actions');

    const candBtn = markBtn('备选', d.mark === 'candidate', () => {
      if (d.mark === 'candidate') {
        updateDay(d.solarKey, x => applyMark(x, 'none', ''));
      } else {
        askNote(`把 ${d.solarKey} 勾为备选`, d.mark === 'note' ? d.note : '', '为什么留作备选？（可留空）', note => {
          updateDay(d.solarKey, x => applyMark(x, 'candidate', note));
        });
      }
    });

    const noteBtn = markBtn('记号', d.mark === 'note', () => {
      askNote(`给 ${d.solarKey} 做个记号`, d.note, '记一句要留意什么', note => {
        updateDay(d.solarKey, x => applyMark(x, 'note', note));
      });
    });

    const exclBtn = markBtn('排除', d.mark === 'excluded', () => {
      askNote(`排除 ${d.solarKey}`, d.mark === 'excluded' ? d.note : suggestExcludeReason(d), '必须写清排除原因', note => {
        if (!note.trim()) { alert('排除日期必须写明原因'); return; }
        updateDay(d.solarKey, x => excludeDay(x, note));
      }, true);
    });

    actions.append(candBtn, noteBtn, exclBtn);
    card.appendChild(actions);
    return card;
  }

  function suggestExcludeReason(d: CompareDay): string {
    if (comparison?.avoidShengxiao.includes(d.chongShengxiao)) {
      return `冲${d.chongShengxiao}，家中有属${d.chongShengxiao}的长辈`;
    }
    const hitEvents = comparison?.events.filter(e => d.ji.some(j => e.includes(j) || j.includes(e)));
    if (hitEvents?.length) return `黄历忌${hitEvents.join('、')}`;
    return '';
  }

  function markGroup(name: string, days: CompareDay[], mark: DayMark): HTMLElement {
    const g = createElement('div', `mark-group ${mark}`);
    g.appendChild(createElement('div', 'mark-group-title', `${name}（${days.length}）`));
    const chips = createElement('div', 'mark-chips');
    days.forEach(d => {
      const chip = createElement('div', `mark-chip ${mark}`);
      chip.innerHTML = `<span class="mc-date">${d.solarKey}</span><span class="mc-note">${escapeHtml(d.note || MARK_NAMES[d.mark])}</span>`;
      chip.title = `${d.lunarYear}年${d.lunarMonthName}${d.lunarDayName} · ${GRADE_LABEL[d.grade]} ${d.score}分`;
      chip.addEventListener('click', () => {
        const card = resultArea.querySelector(`[data-solar-key="${d.solarKey}"]`) as HTMLElement | null;
        if (card) { card.scrollIntoView({ behavior: 'smooth', block: 'center' }); card.classList.add('flash'); }
      });
      chips.appendChild(chip);
    });
    g.appendChild(chips);
    return g;
  }

  app.append(header, formCard, resultArea);

  // 若上次已算出结果，进入页面即还原对照视图
  if (saved && intervalForms.length && selectedEvents.size > 0) {
    const avoid = avoidText.split(/[,，\s]+/).map(s => s.trim()).filter(Boolean);
    const specs: IntervalSpec[] = intervalForms.map(f => ({
      id: f.id, label: f.label.trim() || '未命名区间', start: f.start, end: f.end
    }));
    if (specs.every(s => !validateInterval(s))) {
      comparison = restoreMarks(
        buildComparison({ events: Array.from(selectedEvents), avoidShengxiao: avoid, intervals: specs }),
        marks
      );
      renderComparison();
    }
  }
}

// ---- 小工具 ----

function dateInput(value: string): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'date';
  input.value = value;
  return input;
}

function statNum(label: string, n: number, cls: string): HTMLElement {
  const el = createElement('div', `stat-num ${cls}`);
  el.innerHTML = `<b>${n}</b><span>${label}</span>`;
  return el;
}

function markBtn(text: string, active: boolean, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = `dc-mark-btn ${text}${active ? ' active' : ''}`;
  btn.textContent = (active ? '✓ ' : '') + text;
  btn.addEventListener('click', onClick);
  return btn;
}

// 标记原因弹层（基于内联 DOM，不依赖 prompt 以便手机端使用）
function askNote(title: string, initial: string, placeholder: string, onOk: (note: string) => void, required = false): void {
  const mask = document.createElement('div');
  mask.className = 'note-modal-mask';
  const box = createElement('div', 'note-modal');
  box.innerHTML = `<div class="note-modal-title">${title}</div>`;
  const ta = document.createElement('textarea');
  ta.className = 'note-modal-input';
  ta.placeholder = placeholder + (required ? '（必填）' : '');
  ta.value = initial;
  const btnRow = createElement('div', 'note-modal-actions');
  const cancel = createElement('button', 'note-btn cancel', '取消');
  const ok = createElement('button', 'note-btn ok', '确定');
  btnRow.append(cancel, ok);
  box.append(ta, btnRow);
  mask.appendChild(box);
  document.body.appendChild(mask);
  ta.focus();

  const close = () => document.body.removeChild(mask);
  cancel.addEventListener('click', close);
  mask.addEventListener('click', e => { if (e.target === mask) close(); });
  ok.addEventListener('click', () => {
    if (required && !ta.value.trim()) { ta.classList.add('invalid'); ta.focus(); return; }
    close();
    onOk(ta.value);
  });
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}
