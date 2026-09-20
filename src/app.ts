import { router } from './router';
import { renderCalendar } from './pages/calendar';
import { renderDayDetail } from './pages/day-detail';
import { renderPick } from './pages/pick';
import { renderFarm } from './pages/farm';

export function initApp() {
  const app = document.getElementById('app');
  if (!app) return;

  // 全局样式注入
  injectStyles();

  // 路由处理
  router.onChange((route) => {
    switch (route.path) {
      case '/':
        renderCalendar(app);
        break;
      case '/day':
        if (route.params?.date) {
          renderDayDetail(app, route.params.date);
        } else {
          renderCalendar(app);
        }
        break;
      case '/pick':
        renderPick(app);
        break;
      case '/farm':
        renderFarm(app);
        break;
      default:
        renderCalendar(app);
    }
  });

  router.init();
}

function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* 基础样式 */
    :root {
      --bg: #f5f0e8;
      --card-bg: #faf8f3;
      --primary: #8b2500;
      --primary-light: #a84a20;
      --secondary: #2c5f2d;
      --accent: #c41e3a;
      --text: #333;
      --text-light: #666;
      --border: #e0d5c5;
      --shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
    }

    .page {
      max-width: 800px;
      margin: 0 auto;
      padding: 16px;
      min-height: 100vh;
    }

    /* 头部 */
    .page-header, .calendar-header, .detail-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 2px solid var(--primary);
    }

    .page-title {
      font-size: 24px;
      color: var(--primary);
      flex: 1;
    }

    .back-btn, .nav-btn {
      padding: 8px 16px;
      border: 1px solid var(--primary);
      background: transparent;
      color: var(--primary);
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }

    .back-btn:hover, .nav-btn:hover {
      background: var(--primary);
      color: white;
    }

    /* 日历页 */
    .month-nav {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .month-display {
      font-size: 18px;
      font-weight: bold;
      min-width: 120px;
      text-align: center;
    }

    .quick-nav {
      display: flex;
      gap: 8px;
      margin-left: auto;
    }

    .quick-link {
      padding: 6px 16px;
      background: var(--primary);
      color: white;
      text-decoration: none;
      border-radius: 4px;
      font-size: 14px;
    }

    .week-header {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 4px;
      margin-bottom: 8px;
    }

    .week-day {
      text-align: center;
      padding: 8px;
      font-weight: bold;
      color: var(--primary);
    }

    .calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 4px;
    }

    .day-cell {
      aspect-ratio: 1;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 4px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }

    .day-cell:hover {
      border-color: var(--primary);
      box-shadow: var(--shadow);
    }

    .day-cell.empty {
      background: transparent;
      border: none;
      cursor: default;
    }

    .day-cell.today {
      border-color: var(--accent);
      background: #fff0f0;
    }

    .day-cell.solar-term .lunar-day {
      color: var(--secondary);
      font-weight: bold;
    }

    .solar-day {
      font-size: 16px;
      font-weight: bold;
    }

    .lunar-day {
      font-size: 11px;
      color: var(--text-light);
      margin-top: 2px;
    }

    /* 卡片 */
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
      box-shadow: var(--shadow);
    }

    .card h3 {
      color: var(--primary);
      margin-bottom: 12px;
      font-size: 16px;
      border-left: 4px solid var(--primary);
      padding-left: 12px;
    }

    /* 农历卡片 */
    .lunar-main {
      text-align: center;
    }

    .lunar-date {
      font-size: 28px;
      color: var(--primary);
      font-weight: bold;
      margin-bottom: 8px;
    }

    .ganzhi {
      display: flex;
      justify-content: center;
      gap: 16px;
      margin-bottom: 8px;
      color: var(--text-light);
    }

    .shengxiao {
      color: var(--accent);
      font-size: 18px;
    }

    .solar-term-badge {
      display: inline-block;
      background: var(--secondary);
      color: white;
      padding: 4px 16px;
      border-radius: 16px;
      margin-top: 8px;
      font-size: 14px;
    }

    /* 宜忌卡片 */
    .yiji-row {
      display: flex;
      gap: 20px;
    }

    .yiji-col {
      flex: 1;
    }

    .yiji-label {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 8px;
    }

    .yiji-col.yi .yiji-label { color: var(--secondary); }
    .yiji-col.ji .yiji-label { color: var(--accent); }

    .yiji-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .yi-tag, .ji-tag {
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 13px;
    }

    .yi-tag {
      background: #e8f5e9;
      color: var(--secondary);
    }

    .ji-tag {
      background: #ffebee;
      color: var(--accent);
    }

    .yiji-meta {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--border);
      display: flex;
      gap: 16px;
      font-size: 13px;
      color: var(--text-light);
    }

    /* 时辰 */
    .hour-table {
      display: grid;
      gap: 4px;
    }

    .hour-row {
      display: grid;
      grid-template-columns: 80px 100px 80px 60px;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 4px;
      align-items: center;
    }

    .hour-row.吉 { background: #e8f5e9; }
    .hour-row.凶 { background: #ffebee; }
    .hour-row.平 { background: #f5f5f5; }

    .hour-luck {
      font-weight: bold;
      text-align: center;
    }

    .hour-row.吉 .hour-luck { color: var(--secondary); }
    .hour-row.凶 .hour-luck { color: var(--accent); }

    /* 农事 */
    .farm-hou {
      color: var(--text-light);
      font-size: 14px;
      margin-bottom: 12px;
      font-style: italic;
    }

    .farm-tasks {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .task-tag {
      padding: 6px 14px;
      background: #e3f2fd;
      color: #1565c0;
      border-radius: 16px;
      font-size: 13px;
    }

    /* 择日页 */
    .pick-form {
      background: var(--card-bg);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
    }

    .form-section {
      margin-bottom: 20px;
    }

    .form-section label {
      display: block;
      margin-bottom: 8px;
      font-weight: bold;
      color: var(--primary);
    }

    .events-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }

    .event-btn {
      padding: 10px;
      border: 2px solid var(--border);
      background: white;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .event-btn:hover {
      border-color: var(--primary);
    }

    .event-btn.selected {
      border-color: var(--primary);
      background: var(--primary);
      color: white;
    }

    .date-range {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .date-range input {
      padding: 8px 12px;
      border: 1px solid var(--border);
      border-radius: 4px;
      font-size: 14px;
    }

    .form-section input[type="text"] {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: 4px;
      font-size: 14px;
    }

    .submit-btn {
      width: 100%;
      padding: 14px;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
    }

    .submit-btn:hover {
      background: var(--primary-light);
    }

    /* 结果 */
    .result-stats {
      display: flex;
      gap: 16px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .result-stats span {
      padding: 6px 14px;
      background: var(--card-bg);
      border-radius: 16px;
      font-size: 13px;
    }

    .result-stats .elapsed {
      margin-left: auto;
      color: var(--text-light);
    }

    .result-section {
      margin-bottom: 24px;
    }

    .section-title {
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid var(--border);
    }

    .section-title.best { color: var(--accent); border-color: var(--accent); }
    .section-title.good { color: var(--secondary); border-color: var(--secondary); }

    .result-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 12px;
    }

    .result-card {
      background: var(--card-bg);
      border: 2px solid var(--border);
      border-radius: 8px;
      padding: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .result-card:hover {
      box-shadow: var(--shadow);
      border-color: var(--primary);
    }

    .result-card.score-4 { border-color: var(--accent); background: #fff0f0; }
    .result-card.score-3 { border-color: var(--secondary); background: #f0f8f0; }

    .result-date {
      font-weight: bold;
      font-size: 14px;
    }

    .result-ganzhi {
      color: var(--text-light);
      font-size: 12px;
    }

    .result-score {
      font-size: 20px;
      font-weight: bold;
      color: var(--primary);
    }

    .result-reason {
      font-size: 12px;
      color: var(--text-light);
      margin-top: 4px;
    }

    .result-yi {
      margin-top: 6px;
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .result-yi span {
      padding: 2px 6px;
      background: #e8f5e9;
      color: var(--secondary);
      border-radius: 4px;
      font-size: 11px;
    }

    .export-btn {
      width: 100%;
      padding: 12px;
      background: var(--secondary);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      margin-top: 20px;
    }

    /* ===== 多区间对照 ===== */
    .form-hint {
      font-size: 12px;
      color: var(--text-light);
      margin: -10px 0 10px;
    }

    .intervals-wrap {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .interval-row {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
      background: #fff;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px;
    }

    .interval-name {
      width: 110px;
      padding: 8px;
      border: 1px solid var(--border);
      border-radius: 4px;
      font-size: 14px;
      font-weight: bold;
      color: var(--primary);
    }

    .interval-dates {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 1;
    }

    .interval-dates input {
      padding: 8px;
      border: 1px solid var(--border);
      border-radius: 4px;
      font-size: 13px;
    }

    .interval-remove {
      width: 30px;
      height: 30px;
      border: 1px solid var(--accent);
      color: var(--accent);
      background: transparent;
      border-radius: 50%;
      cursor: pointer;
      font-size: 13px;
    }

    .interval-remove:disabled {
      border-color: var(--border);
      color: #ccc;
      cursor: not-allowed;
    }

    .interval-add {
      width: 100%;
      padding: 10px;
      border: 1px dashed var(--primary);
      color: var(--primary);
      background: transparent;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
    }

    .pick-actions {
      display: flex;
      gap: 10px;
    }

    .pick-actions .submit-btn { flex: 2; }
    .reset-btn {
      flex: 1;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text-light);
      border-radius: 8px;
      cursor: pointer;
      font-size: 15px;
    }
    .reset-btn:hover { border-color: var(--accent); color: var(--accent); }

    /* 定夺条 */
    .decision-bar {
      background: var(--card-bg);
      border: 2px solid var(--primary);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .decision-bar.decided {
      border-color: var(--accent);
      background: #fff6f6;
    }
    .decision-head {
      font-size: 16px;
      font-weight: bold;
      color: var(--primary);
      margin-bottom: 8px;
    }
    .decision-bar.decided .decision-head { color: var(--accent); }
    .decision-time { font-size: 12px; color: var(--text-light); font-weight: normal; }
    .decision-reason { font-size: 14px; color: var(--text); margin-bottom: 8px; }
    .decision-hint { font-size: 13px; color: var(--text-light); }
    .decision-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .decision-select, .decision-reason-input {
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: 6px;
      font-size: 14px;
      width: 100%;
    }
    .decide-btn {
      padding: 10px;
      background: var(--accent);
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 15px;
      font-weight: bold;
      cursor: pointer;
    }

    /* 区间统计并列 */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
      margin-bottom: 18px;
    }
    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-top: 4px solid var(--primary);
      border-radius: 10px;
      padding: 14px;
    }
    .stat-card.invalid { border-top-color: var(--accent); }
    .stat-title { font-weight: bold; color: var(--primary); font-size: 15px; }
    .stat-range { font-size: 12px; color: var(--text-light); margin: 4px 0 10px; }
    .stat-error { color: var(--accent); font-size: 13px; }
    .stat-nums { display: flex; gap: 6px; flex-wrap: wrap; }
    .stat-num {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 42px;
      padding: 4px 8px;
      border-radius: 6px;
      background: #fff;
    }
    .stat-num b { font-size: 18px; }
    .stat-num span { font-size: 11px; color: var(--text-light); }
    .stat-num.best b { color: var(--accent); }
    .stat-num.good b { color: var(--secondary); }
    .stat-num.normal b { color: #8a7a5a; }
    .stat-num.bad b { color: #999; }
    .stat-elapsed { font-size: 11px; color: #aaa; margin-top: 8px; }

    /* 取舍板 */
    .card-like {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 18px;
    }
    .card-like h3 {
      color: var(--primary);
      margin-bottom: 12px;
      font-size: 16px;
      border-left: 4px solid var(--primary);
      padding-left: 12px;
    }
    .mark-group { margin-bottom: 12px; }
    .mark-group:last-child { margin-bottom: 0; }
    .mark-group-title { font-size: 13px; font-weight: bold; margin-bottom: 6px; }
    .mark-group.candidate .mark-group-title { color: var(--secondary); }
    .mark-group.note .mark-group-title { color: #8a6d1d; }
    .mark-group.excluded .mark-group-title { color: #888; }
    .mark-chips { display: flex; flex-direction: column; gap: 6px; }
    .mark-chip {
      display: flex;
      gap: 10px;
      align-items: baseline;
      padding: 6px 10px;
      border-radius: 6px;
      background: #fff;
      border-left: 3px solid var(--border);
      cursor: pointer;
      font-size: 13px;
    }
    .mark-chip.candidate { border-left-color: var(--secondary); background: #f3f9f3; }
    .mark-chip.note { border-left-color: #c49a17; background: #fdf8ea; }
    .mark-chip.excluded { border-left-color: #aaa; background: #f6f6f6; }
    .mc-date { font-weight: bold; white-space: nowrap; }
    .mc-note { color: var(--text-light); word-break: break-all; }
    .mark-chip.excluded .mc-note { color: #777; }

    /* 区间前排日期 */
    .interval-top-section { margin-bottom: 22px; }
    .interval-top-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 16px;
      font-weight: bold;
      color: var(--primary);
      padding-bottom: 8px;
      margin-bottom: 12px;
      border-bottom: 2px solid var(--border);
    }
    .link-btn {
      border: none;
      background: none;
      color: var(--primary-light);
      cursor: pointer;
      font-size: 13px;
    }
    .link-btn:disabled { color: #bbb; cursor: default; }

    .day-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 10px;
    }
    .empty-tip {
      grid-column: 1 / -1;
      color: var(--text-light);
      font-size: 13px;
      padding: 16px;
      text-align: center;
    }

    .day-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-left-width: 4px;
      border-radius: 8px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .day-card.grade-best { border-left-color: var(--accent); }
    .day-card.grade-good { border-left-color: var(--secondary); }
    .day-card.grade-normal { border-left-color: #c4b48a; }
    .day-card.grade-bad { border-left-color: #ccc; }
    .day-card.mark-candidate { background: #f3f9f3; }
    .day-card.mark-note { background: #fdf8ea; }
    .day-card.mark-excluded { opacity: .7; background: #f4f4f4; }
    .day-card.flash { box-shadow: 0 0 0 3px var(--accent); transition: box-shadow .3s; }

    .dc-head {
      display: flex;
      align-items: baseline;
      gap: 8px;
      cursor: pointer;
    }
    .dc-date { font-weight: bold; font-size: 15px; }
    .dc-date:hover { color: var(--primary); text-decoration: underline; }
    .dc-weekday { font-size: 12px; color: var(--text-light); }
    .dc-grade { margin-left: auto; font-size: 13px; font-weight: bold; color: var(--primary); }
    .grade-best .dc-grade { color: var(--accent); }
    .grade-good .dc-grade { color: var(--secondary); }
    .dc-sub { font-size: 12px; color: var(--text-light); }
    .dc-chong { font-size: 12px; color: #b06a2a; }
    .dc-reason { font-size: 12px; color: var(--text-light); }
    .dc-alsoin { font-size: 11px; color: var(--primary-light); }
    .dc-note {
      font-size: 12px;
      padding: 4px 8px;
      background: #fff;
      border-radius: 4px;
      color: var(--primary);
    }
    .dc-note.is-excluded { color: #777; }

    .dc-actions { display: flex; gap: 6px; margin-top: 6px; }
    .dc-mark-btn {
      flex: 1;
      padding: 5px 0;
      font-size: 12px;
      border: 1px solid var(--border);
      background: #fff;
      border-radius: 4px;
      cursor: pointer;
    }
    .dc-mark-btn.备选.active { border-color: var(--secondary); background: var(--secondary); color: #fff; }
    .dc-mark-btn.记号.active { border-color: #c49a17; background: #c49a17; color: #fff; }
    .dc-mark-btn.排除.active { border-color: #888; background: #888; color: #fff; }

    .collapsed-tip {
      margin-top: 10px;
      font-size: 12px;
      color: var(--text-light);
    }
    .collapsed-tip summary { cursor: pointer; padding: 6px 0; }
    .collapsed-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      max-height: 220px;
      overflow-y: auto;
      background: #fff;
      border-radius: 6px;
      padding: 8px 10px;
    }
    .collapsed-item { font-size: 12px; color: var(--text-light); }

    /* 导出按钮 */
    .export-row {
      display: flex;
      gap: 10px;
      margin-top: 8px;
    }
    .export-row .export-btn {
      flex: 1;
      margin-top: 0;
      padding: 12px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      color: #fff;
      font-size: 15px;
    }
    .export-btn { background: var(--secondary); }
    .export-btn.secondary { background: var(--primary); }
    .export-btn:disabled { opacity: .6; cursor: wait; }

    /* 备注弹层 */
    .note-modal-mask {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }
    .note-modal {
      background: var(--card-bg);
      border-radius: 12px;
      padding: 20px;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 8px 30px rgba(0,0,0,.2);
    }
    .note-modal-title {
      font-size: 16px;
      font-weight: bold;
      color: var(--primary);
      margin-bottom: 12px;
    }
    .note-modal-input {
      width: 100%;
      min-height: 84px;
      padding: 10px;
      border: 1px solid var(--border);
      border-radius: 6px;
      font-size: 14px;
      resize: vertical;
      font-family: inherit;
    }
    .note-modal-input.invalid { border-color: var(--accent); }
    .note-modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 12px;
    }
    .note-btn {
      padding: 8px 22px;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: #fff;
      cursor: pointer;
      font-size: 14px;
    }
    .note-btn.ok { background: var(--primary); color: #fff; border-color: var(--primary); }

    /* 农事页 */
    .month-index {
      display: flex;
      gap: 6px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .month-btn {
      padding: 6px 14px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      cursor: pointer;
      font-size: 13px;
    }

    .month-btn:hover {
      border-color: var(--primary);
      background: var(--primary);
      color: white;
    }

    .term-list {
      display: grid;
      gap: 12px;
    }

    .term-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
    }

    .term-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .term-name {
      font-size: 18px;
      font-weight: bold;
      color: var(--primary);
    }

    .term-hou {
      font-size: 13px;
      color: var(--text-light);
    }

    .term-tasks {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    /* 二十八宿 */
    .xiu-name {
      font-size: 20px;
      color: var(--primary);
      text-align: center;
    }

    /* 彭祖百忌 */
    .pengzu-item {
      padding: 8px 0;
      border-bottom: 1px dashed var(--border);
      font-size: 14px;
    }

    .pengzu-item:last-child {
      border-bottom: none;
    }

    /* 响应式 */
    @media (max-width: 600px) {
      .page { padding: 8px; }
      .page-title { font-size: 20px; }
      .events-grid { grid-template-columns: repeat(3, 1fr); }
      .result-grid { grid-template-columns: repeat(2, 1fr); }
      .day-grid { grid-template-columns: repeat(2, 1fr); }
      .stats-row { grid-template-columns: 1fr; }
      .interval-row { flex-direction: column; align-items: stretch; }
      .interval-name { width: 100%; }
      .interval-dates { flex-wrap: wrap; }
      .interval-remove { align-self: flex-end; }
      .pick-actions { flex-direction: column; }
      .export-row { flex-direction: column; }
      .day-card { padding: 8px; }
      .dc-actions { flex-direction: column; }
      .yiji-row { flex-direction: column; }
      .hour-row { grid-template-columns: 60px 80px 60px 50px; font-size: 13px; }
      .ganzhi { gap: 8px; font-size: 14px; }
    }
  `;
  document.head.appendChild(style);
}
