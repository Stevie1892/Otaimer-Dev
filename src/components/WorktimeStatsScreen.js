import {
  getStatsData, clearAllStats, isStatsEmpty,
  getWorkMsForDate, getResetsForDate, formatDateStr,
  getWeekRange, getMonthRange, getDaysInRange,
  getCurrentSessionElapsed, isLegacyRecord
} from '../core/statsTracker.js';
import { createConfirmDialog } from './ConfirmDialog.js';

export function createWorktimeStatsScreen(onClose) {
  const el = document.createElement('div');
  el.className = 'stats-screen';

  let mode = 'day'; // 'day' | 'week' | 'month'
  let refDate = new Date();
  let updateInterval = null;

  // Header
  const header = document.createElement('div');
  header.className = 'stats-header';

  const backBtn = document.createElement('button');
  backBtn.className = 'stats-back';
  backBtn.textContent = '←';
  backBtn.addEventListener('pointerup', () => {
    cleanup();
    onClose();
  });

  const title = document.createElement('span');
  title.className = 'stats-title';
  title.textContent = '工时统计';

  header.appendChild(backBtn);
  header.appendChild(title);
  el.appendChild(header);

  // Tabs
  const tabs = document.createElement('div');
  tabs.className = 'stats-tabs';

  const tabDefs = [
    { key: 'day', label: '日' },
    { key: 'week', label: '周' },
    { key: 'month', label: '月' }
  ];

  const tabEls = {};
  tabDefs.forEach(def => {
    const btn = document.createElement('button');
    btn.className = 'stats-tab';
    btn.textContent = def.label;
    if (def.key === mode) btn.classList.add('active');
    btn.addEventListener('pointerup', () => {
      mode = def.key;
      refDate = new Date();
      updateTabActive();
      render();
    });
    tabEls[def.key] = btn;
    tabs.appendChild(btn);
  });

  function updateTabActive() {
    Object.entries(tabEls).forEach(([key, btn]) => {
      btn.classList.toggle('active', key === mode);
    });
  }
  el.appendChild(tabs);

  // Date navigator
  const dateNav = document.createElement('div');
  dateNav.className = 'stats-date-nav';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'nav-arrow';
  prevBtn.textContent = '◀';
  prevBtn.addEventListener('pointerup', () => navigate(-1));

  const dateText = document.createElement('span');
  dateText.className = 'nav-date';

  const nextBtn = document.createElement('button');
  nextBtn.className = 'nav-arrow';
  nextBtn.textContent = '▶';
  nextBtn.addEventListener('pointerup', () => navigate(1));

  dateNav.appendChild(prevBtn);
  dateNav.appendChild(dateText);
  dateNav.appendChild(nextBtn);
  el.appendChild(dateNav);

  // Content area
  const content = document.createElement('div');
  content.className = 'stats-content';
  el.appendChild(content);

  function navigate(dir) {
    const d = new Date(refDate);
    if (mode === 'day') {
      d.setDate(d.getDate() + dir);
    } else if (mode === 'week') {
      d.setDate(d.getDate() + dir * 7);
    } else {
      d.setMonth(d.getMonth() + dir);
    }
    refDate = d;
    render();
  }

  function getDateRange() {
    if (mode === 'day') {
      const dateStr = formatDateStr(refDate);
      return { label: formatDayLabel(refDate), days: [dateStr] };
    } else if (mode === 'week') {
      const range = getWeekRange(refDate);
      const days = getDaysInRange(range.start, range.end);
      const startM = range.start.getMonth() + 1;
      const startD = range.start.getDate();
      const endM = range.end.getMonth() + 1;
      const endD = range.end.getDate();
      const weekNum = getWeekNumber(refDate);
      return {
        label: `第${weekNum}周 (${startM}/${startD}~${endM}/${endD})`,
        days
      };
    } else {
      const range = getMonthRange(refDate);
      const days = getDaysInRange(range.start, range.end);
      return {
        label: `${refDate.getFullYear()}年${refDate.getMonth() + 1}月`,
        days
      };
    }
  }

  function formatDayLabel(date) {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const today = new Date();
    if (formatDateStr(date) === formatDateStr(today)) {
      return `今天 (${y}年${m}月${d}日)`;
    }
    return `${y}年${m}月${d}日`;
  }

  function getWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  }

  function formatDuration(ms) {
    if (ms <= 0) return '0时00分';
    const totalMin = Math.floor(ms / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return h + '时' + String(m).padStart(2, '0') + '分';
  }

  function formatDurationShort(ms) {
    if (ms <= 0) return '0h00m';
    const totalMin = Math.floor(ms / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return h + 'h' + String(m).padStart(2, '0') + 'm';
  }

  function formatOvertime(ms) {
    if (ms <= 0) return '0秒';
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    if (m > 0) return '+' + m + '分' + String(s).padStart(2, '0') + '秒';
    return '+' + s + '秒';
  }

  function render() {
    const { label, days } = getDateRange();
    dateText.textContent = label;

    // Calculate stats for the period
    let totalWorkMs = 0;
    const dailyData = [];
    let maxDailyMs = 1;

    days.forEach(dateStr => {
      let ms = getWorkMsForDate(dateStr);
      // For today, add current session elapsed
      if (dateStr === formatDateStr(new Date())) {
        ms += getCurrentSessionElapsed();
      }
      totalWorkMs += ms;
      if (ms > maxDailyMs) maxDailyMs = ms;
      dailyData.push({ date: dateStr, ms });
    });

    // Timer resets for the period (filter legacy)
    let totalResets = 0;
    let totalOvertimeMs = 0;
    days.forEach(dateStr => {
      const resets = getResetsForDate(dateStr);
      resets.forEach(r => {
        if (!isLegacyRecord(r)) {
          totalResets++;
          totalOvertimeMs += r.overtime;
        }
      });
    });
    const avgOvertime = totalResets > 0 ? totalOvertimeMs / totalResets : 0;

    // Determine main label
    let mainLabel = '今日工时';
    if (mode === 'week') mainLabel = '本周工时';
    else if (mode === 'month') mainLabel = '本月工时';

    content.innerHTML = '';

    if (isStatsEmpty() && totalWorkMs === 0) {
      const empty = document.createElement('div');
      empty.className = 'stats-empty';
      empty.innerHTML = '<div class="stats-empty-icon">📊</div><div class="stats-empty-text">暂无统计数据<br>开工后即可记录工时</div>';
      content.appendChild(empty);
      return;
    }

    // Main stat
    const mainSection = document.createElement('div');
    mainSection.className = 'stats-main';
    const mainLabelEl = document.createElement('div');
    mainLabelEl.className = 'stats-main-label';
    mainLabelEl.textContent = mainLabel;
    const mainValueEl = document.createElement('div');
    mainValueEl.className = 'stats-main-value';
    const dur = formatDuration(totalWorkMs);
    const parts = dur.split('时');
    mainValueEl.innerHTML = parts[0] + '<span class="stats-main-unit">时</span>' + parts[1].replace('分', '<span class="stats-main-unit">分</span>');
    mainSection.appendChild(mainLabelEl);
    mainSection.appendChild(mainValueEl);
    content.appendChild(mainSection);

    // Metric cards
    const cards = document.createElement('div');
    cards.className = 'stats-cards';

    const overtimeCard = createCard('平均超时', formatOvertime(avgOvertime), 'overtime');
    const countCard = createCard('累计计时', totalResets + ' 次', 'count');
    cards.appendChild(overtimeCard);
    cards.appendChild(countCard);
    content.appendChild(cards);

    // Bar chart
    const chartSection = document.createElement('div');
    chartSection.className = 'stats-chart-section';
    const chartTitle = document.createElement('div');
    chartTitle.className = 'stats-chart-title';
    chartTitle.textContent = '每日工时明细';
    chartSection.appendChild(chartTitle);

    const chart = document.createElement('div');
    chart.className = 'stats-chart';

    // Show last 7 days for day mode, or all days for week/month
    let chartDays = dailyData;
    if (mode === 'day') {
      chartDays = dailyData.slice(-7);
    }

    // Reverse to show most recent at top
    [...chartDays].reverse().forEach(({ date, ms }) => {
      const row = document.createElement('div');
      row.className = 'stats-chart-row';

      const labelEl = document.createElement('span');
      labelEl.className = 'stats-chart-label';
      const d = new Date(date + 'T00:00:00');
      labelEl.textContent = (d.getMonth() + 1) + '/' + d.getDate();

      const barBg = document.createElement('div');
      barBg.className = 'stats-chart-bar-bg';
      const bar = document.createElement('div');
      bar.className = 'stats-chart-bar';
      const pct = maxDailyMs > 0 ? (ms / maxDailyMs * 100) : 0;
      bar.style.width = Math.max(pct, ms > 0 ? 2 : 0) + '%';
      barBg.appendChild(bar);

      const valueEl = document.createElement('span');
      valueEl.className = 'stats-chart-value';
      valueEl.textContent = formatDurationShort(ms);

      row.appendChild(labelEl);
      row.appendChild(barBg);
      row.appendChild(valueEl);
      chart.appendChild(row);
    });

    chartSection.appendChild(chart);
    content.appendChild(chartSection);

    // Clear button
    const clearBtn = document.createElement('button');
    clearBtn.className = 'stats-clear';
    clearBtn.textContent = '🗑  清除所有统计数据';
    clearBtn.addEventListener('pointerup', () => {
      document.body.appendChild(createConfirmDialog({
        title: '确认清除',
        message: '将清除所有统计数据（含数据统计），此操作不可撤销！',
        confirmLabel: '确认清除',
        danger: true,
        onConfirm: () => {
          clearAllStats();
          render();
        }
      }));
    });
    content.appendChild(clearBtn);
  }

  function createCard(label, value, valueClass) {
    const card = document.createElement('div');
    card.className = 'stats-card';
    const labelEl = document.createElement('div');
    labelEl.className = 'stats-card-label';
    labelEl.textContent = label;
    const valueEl = document.createElement('div');
    valueEl.className = 'stats-card-value ' + valueClass;
    valueEl.textContent = value;
    card.appendChild(labelEl);
    card.appendChild(valueEl);
    return card;
  }

  function cleanup() {
    if (updateInterval) {
      clearInterval(updateInterval);
      updateInterval = null;
    }
  }

  // Initial render
  render();

  // Update every 60 seconds for live work time
  updateInterval = setInterval(() => {
    if (mode === 'day') render();
  }, 60000);

  return { el, destroy: cleanup };
}
