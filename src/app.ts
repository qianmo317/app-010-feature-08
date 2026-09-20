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

    /* 择日对比板 */
    .board-empty {
      background: var(--card-bg);
      border: 1px dashed var(--border);
      border-radius: 12px;
      padding: 24px;
      color: var(--text-light);
      font-size: 14px;
      text-align: center;
    }

    .board-summary {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .board-count {
      flex: 1;
      font-weight: bold;
      color: var(--primary);
    }

    .export-btn-inline {
      padding: 8px 16px;
      background: var(--secondary);
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    }

    .clear-board-btn {
      padding: 8px 16px;
      background: transparent;
      color: var(--accent);
      border: 1px solid var(--accent);
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    }

    .clear-board-btn:hover {
      background: var(--accent);
      color: white;
    }

    /* 已定吉日横幅 */
    .final-banner {
      background: linear-gradient(135deg, #fff5e6, #ffe9d0);
      border: 2px solid var(--accent);
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 16px;
      position: relative;
    }

    .final-title {
      font-size: 17px;
      font-weight: bold;
      color: var(--accent);
      margin-bottom: 6px;
    }

    .final-reason {
      font-size: 14px;
      color: var(--text);
      margin-bottom: 4px;
    }

    .final-time {
      font-size: 12px;
      color: var(--text-light);
    }

    .final-undo-btn {
      position: absolute;
      top: 12px;
      right: 12px;
      padding: 4px 12px;
      background: transparent;
      border: 1px solid var(--accent);
      color: var(--accent);
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }

    /* 区间对照 */
    .compare-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }

    .compare-col {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 14px;
      box-shadow: var(--shadow);
    }

    .compare-col-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }

    .compare-col-title {
      font-weight: bold;
      color: var(--primary);
      font-size: 15px;
    }

    .range-remove-btn {
      padding: 2px 10px;
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text-light);
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }

    .range-remove-btn:hover {
      border-color: var(--accent);
      color: var(--accent);
    }

    .compare-col-range {
      font-size: 13px;
      color: var(--text);
    }

    .compare-col-events {
      font-size: 12px;
      color: var(--text-light);
      margin-bottom: 8px;
    }

    .compare-stats {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 8px;
    }

    .compare-stats span {
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 12px;
    }

    .stat-best { background: #ffebee; color: var(--accent); font-weight: bold; }
    .stat-good { background: #e8f5e9; color: var(--secondary); }
    .stat-normal { background: #f5f5f5; color: var(--text-light); }
    .stat-bad { background: #efebe9; color: #6d4c41; }

    .compare-dup-note {
      font-size: 12px;
      color: #b26a00;
      background: #fff8e1;
      border-radius: 4px;
      padding: 4px 8px;
      margin-bottom: 8px;
    }

    /* 靠前日期行 */
    .top-date-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .top-date-row {
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 8px 10px;
      background: white;
    }

    .top-date-row.mark-candidate { border-left: 4px solid var(--secondary); }
    .top-date-row.mark-noted { border-left: 4px solid #b26a00; }
    .top-date-row.mark-excluded { border-left: 4px solid #999; opacity: 0.75; }
    .top-date-row.is-final { border-color: var(--accent); background: #fff8f5; }

    .top-date-main {
      display: flex;
      align-items: baseline;
      gap: 8px;
      cursor: pointer;
    }

    .top-date-main:hover .top-date-solar {
      color: var(--primary);
      text-decoration: underline;
    }

    .top-date-solar {
      font-weight: bold;
      font-size: 13px;
    }

    .top-date-lunar {
      font-size: 12px;
      color: var(--text-light);
    }

    .top-date-score {
      margin-left: auto;
      font-weight: bold;
      color: var(--primary);
      font-size: 13px;
    }

    .final-badge {
      padding: 1px 6px;
      background: var(--accent);
      color: white;
      border-radius: 4px;
      font-size: 11px;
    }

    .top-date-actions {
      display: flex;
      gap: 6px;
      margin-top: 6px;
    }

    .mark-btn {
      flex: 1;
      padding: 3px 0;
      font-size: 12px;
      border-radius: 4px;
      cursor: pointer;
      background: white;
    }

    .mark-btn-candidate { border: 1px solid var(--secondary); color: var(--secondary); }
    .mark-btn-candidate.active, .mark-btn-candidate:hover { background: var(--secondary); color: white; }
    .mark-btn-noted { border: 1px solid #b26a00; color: #b26a00; }
    .mark-btn-noted.active, .mark-btn-noted:hover { background: #b26a00; color: white; }
    .mark-btn-excluded { border: 1px solid #999; color: #666; }
    .mark-btn-excluded.active, .mark-btn-excluded:hover { background: #999; color: white; }

    .top-date-reason {
      margin-top: 6px;
      font-size: 12px;
      color: var(--text-light);
      background: #faf6ef;
      border-radius: 4px;
      padding: 4px 8px;
    }

    .top-toggle-btn {
      width: 100%;
      margin-top: 8px;
      padding: 6px;
      background: transparent;
      border: 1px dashed var(--border);
      color: var(--text-light);
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
    }

    .top-toggle-btn:hover {
      border-color: var(--primary);
      color: var(--primary);
    }

    /* 取舍记录 */
    .marks-panel {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px 20px;
    }

    .marks-title {
      color: var(--primary);
      font-size: 16px;
      margin-bottom: 12px;
      border-left: 4px solid var(--primary);
      padding-left: 12px;
    }

    .marks-group {
      margin-bottom: 12px;
    }

    .marks-group-title {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 6px;
    }

    .marks-candidate .marks-group-title { color: var(--secondary); }
    .marks-noted .marks-group-title { color: #b26a00; }
    .marks-excluded .marks-group-title { color: #666; }

    .marks-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 0;
      border-bottom: 1px dashed var(--border);
      font-size: 13px;
    }

    .marks-item:last-child {
      border-bottom: none;
    }

    .marks-item-text {
      flex: 1;
    }

    .decide-btn {
      padding: 3px 12px;
      background: var(--accent);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }

    .unmark-btn {
      padding: 3px 12px;
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text-light);
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }

    .unmark-btn:hover {
      border-color: var(--accent);
      color: var(--accent);
    }

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
      .yiji-row { flex-direction: column; }
      .hour-row { grid-template-columns: 60px 80px 60px 50px; font-size: 13px; }
      .ganzhi { gap: 8px; font-size: 14px; }
    }
  `;
  document.head.appendChild(style);
}
