import html2canvas from 'html2canvas';
import { Comparison, Decision, CompareDay } from '../almanac/compare';
import { GRADE_LABEL } from '../almanac/pick-day';

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
const SCORE_COLOR: Record<string, string> = {
  best: '#c41e3a',
  good: '#2c5f2d',
  normal: '#8a7a5a',
  bad: '#999'
};

// 生成多区间对照长图
export async function exportComparisonImage(comp: Comparison, decision?: Decision): Promise<void> {
  const root = document.createElement('div');
  root.style.cssText = `
    position: fixed; left: -9999px; top: 0; width: 380px;
    background: #f7f3e9; padding: 24px;
    font-family: "Noto Serif SC", "Source Han Serif SC", "PingFang SC", serif;
    color: #333;
  `;

  const title = el('h2', '择日候选区间对照', 'font-size:22px;text-align:center;color:#8b2500;letter-spacing:4px;margin:0 0 8px;');
  const subtitle = el('div',
    `事项：${comp.events.join('、')}${comp.avoidShengxiao.length ? ' · 避讳：' + comp.avoidShengxiao.join('、') : ''}`,
    'font-size:12px;color:#777;text-align:center;margin-bottom:4px;');
  const genTime = el('div', new Date(comp.generatedAt).toLocaleString('zh-CN'),
    'font-size:11px;color:#aaa;text-align:center;margin-bottom:18px;');

  const seal = document.createElement('div');
  seal.style.cssText = `
    position:absolute;top:16px;right:16px;width:48px;height:48px;
    border:2px solid #c41e3a;border-radius:4px;display:flex;
    align-items:center;justify-content:center;color:#c41e3a;
    font-size:11px;font-weight:bold;transform:rotate(-12deg);opacity:.8;
  `;
  seal.textContent = '择日';

  root.append(seal, title, subtitle, genTime);

  // 各区间统计
  for (const it of comp.intervals) {
    const card = document.createElement('div');
    card.style.cssText = 'background:#fff;border-radius:8px;padding:12px 14px;margin-bottom:10px;border-left:4px solid #8b2500;';
    const head = el('div', `${it.label}　${it.start} ~ ${it.end}`, 'font-size:14px;font-weight:bold;margin-bottom:6px;');
    const body = document.createElement('div');
    body.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;font-size:12px;';
    if (!it.stats.valid) {
      body.textContent = `区间无效：${it.stats.error}`;
    } else {
      body.append(
        statPill(`大吉 ${it.stats.best}`, '#c41e3a'),
        statPill(`吉 ${it.stats.good}`, '#2c5f2d'),
        statPill(`平 ${it.stats.normal}`, '#8a7a5a'),
        statPill(`凶 ${it.stats.bad}`, '#999'),
        statPill(`共 ${it.stats.total} 天`, '#555')
      );
    }
    card.append(head, body);
    root.appendChild(card);
  }

  // 候选 / 记号 / 排除 汇总
  const candidates = comp.days.filter(d => d.mark === 'candidate');
  const notes = comp.days.filter(d => d.mark === 'note');
  const excluded = comp.days.filter(d => d.mark === 'excluded');

  if (candidates.length) root.appendChild(section('备选日期', candidates, '#2c5f2d'));
  if (notes.length) root.appendChild(section('记号日期', notes, '#8a6d1d'));
  if (excluded.length) root.appendChild(section('排除日期（含原因）', excluded, '#999'));

  // 定夺
  if (decision) {
    const box = document.createElement('div');
    box.style.cssText = 'background:#fff0f0;border:2px solid #c41e3a;border-radius:8px;padding:14px;margin:6px 0 14px;';
    box.innerHTML =
      `<div style="font-size:13px;color:#c41e3a;font-weight:bold;margin-bottom:6px;">★ 最终定夺</div>` +
      `<div style="font-size:18px;font-weight:bold;margin-bottom:4px;">${decision.year}-${pad(decision.month)}-${pad(decision.day)}</div>` +
      `<div style="font-size:13px;color:#555;">${escapeHtml(decision.reason)}</div>`;
    root.appendChild(box);
  }

  // 前排日期（所有区间大吉/吉，最多 20）
  const top = comp.days.filter(d => d.grade === 'best' || d.grade === 'good').slice(0, 20);
  if (top.length) {
    const list = el('div', '', 'display:flex;flex-direction:column;gap:8px;margin-top:4px;');
    top.forEach(d => list.appendChild(dayItem(d)));
    root.appendChild(sectionBlock('前排吉日', list));
  }

  root.appendChild(el('div', '老黄历择日 · 仅供参考', 'text-align:center;margin-top:18px;font-size:11px;color:#aaa;'));

  document.body.appendChild(root);
  try {
    const canvas = await html2canvas(root, {
      scale: 3, useCORS: true, backgroundColor: '#f7f3e9', logging: false
    });
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `择日对照_${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
  } finally {
    document.body.removeChild(root);
  }
}

function section(name: string, days: CompareDay[], color: string): HTMLElement {
  const list = el('div', '', 'display:flex;flex-direction:column;gap:8px;margin-top:4px;');
  days.forEach(d => list.appendChild(dayItem(d)));
  return sectionBlock(name, list, color);
}

function sectionBlock(name: string, content: HTMLElement, color = '#8b2500'): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.marginTop = '14px';
  const h = el('div', name, `font-size:15px;font-weight:bold;color:${color};border-bottom:2px solid ${color};padding-bottom:6px;margin-bottom:10px;`);
  wrap.append(h, content);
  return wrap;
}

function dayItem(d: CompareDay): HTMLElement {
  const item = document.createElement('div');
  const color = SCORE_COLOR[d.grade];
  const markText = d.mark === 'candidate' ? '〔备选〕' : d.mark === 'note' ? '〔记号〕' : d.mark === 'excluded' ? '〔排除〕' : '';
  item.style.cssText = `background:#fff;border-radius:8px;padding:10px 12px;border-left:4px solid ${color};`;
  item.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
      <span style="font-size:15px;font-weight:bold;">${d.solarKey} ${markText}</span>
      <span style="font-size:13px;color:${color};font-weight:bold;">${GRADE_LABEL[d.grade]} ${d.score}分</span>
    </div>
    <div style="font-size:12px;color:#777;">周${WEEK[d.weekDay]} · 农历${d.lunarYear}年${d.lunarMonthName}${d.lunarDayName} · ${d.ganZhi}日 · ${escapeHtml(d.intervalLabel)}${d.alsoIn.length ? ' · 亦见' + d.alsoIn.map(escapeHtml).join('、') : ''}</div>
    ${d.note ? `<div style="font-size:12px;color:#8b2500;margin-top:3px;">${d.mark === 'excluded' ? '排除原因：' : '备注：'}${escapeHtml(d.note)}</div>` : ''}
  `;
  return item;
}

function statPill(text: string, color: string): HTMLElement {
  return el('span', text, `padding:3px 10px;border-radius:12px;background:${color}1a;color:${color};`);
}

function el(tag: string, text: string, css: string): HTMLElement {
  const e = document.createElement(tag);
  e.style.cssText = css;
  e.textContent = text;
  return e;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}
