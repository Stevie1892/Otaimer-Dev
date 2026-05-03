import {
  getResetsForDate, getResetsForDateRange, getPerTimerBreakdown,
  formatDateStr, getWeekRange, getMonthRange, getDaysInRange,
  isStatsEmpty, clearAllStats, isLegacyRecord, getActiveTimersForDate,
  getStatsData
} from '../core/statsTracker.js';
import { state } from '../core/state.js';
import { createConfirmDialog } from './ConfirmDialog.js';

export function createBusinessStatsScreen(onClose) {
  const el = document.createElement('div');
  el.className = 'stats-screen';

  let mode = 'day'; // 'day' | 'week' | 'month' | 'custom'
  let refDate = new Date();
  let customStartDate = null;
  let customEndDate = null;

  // Header
  const header = document.createElement('div');
  header.className = 'stats-header';

  const backBtn = document.createElement('button');
  backBtn.className = 'stats-back';
  backBtn.textContent = '←';
  backBtn.addEventListener('pointerup', () => {
    onClose();
  });

  const title = document.createElement('span');
  title.className = 'stats-title';
  title.textContent = '数据统计';

  header.appendChild(backBtn);
  header.appendChild(title);
  el.appendChild(header);

  // Tabs
  const tabs = document.createElement('div');
  tabs.className = 'stats-tabs';

  const tabDefs = [
    { key: 'day', label: '日' },
    { key: 'week', label: '周' },
    { key: 'month', label: '月' },
    { key: 'custom', label: '自定义' }
  ];

  const tabEls = {};
  tabDefs.forEach(def => {
    const btn = document.createElement('button');
    btn.className = 'stats-tab';
    btn.textContent = def.label;
    if (def.key === mode) btn.classList.add('active');
    btn.addEventListener('pointerup', () => {
      mode = def.key;
      if (def.key !== 'custom') {
        refDate = new Date();
      }
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

  // Date navigator (for day/week/month modes)
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
    } else if (mode === 'month') {
      d.setMonth(d.getMonth() + dir);
    }
    refDate = d;
    render();
  }

  function getDateRange() {
    if (mode === 'day') {
      const dateStr = formatDateStr(refDate);
      return { label: formatDayLabel(refDate), days: [dateStr], startDate: dateStr, endDate: dateStr };
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
        days,
        startDate: formatDateStr(range.start),
        endDate: formatDateStr(range.end)
      };
    } else if (mode === 'month') {
      const range = getMonthRange(refDate);
      const days = getDaysInRange(range.start, range.end);
      return {
        label: `${refDate.getFullYear()}年${refDate.getMonth() + 1}月`,
        days,
        startDate: formatDateStr(range.start),
        endDate: formatDateStr(range.end)
      };
    } else {
      // custom
      if (customStartDate && customEndDate) {
        const days = getDaysInRange(customStartDate, customEndDate);
        const startStr = formatDateStr(customStartDate);
        const endStr = formatDateStr(customEndDate);
        const dayCount = days.length;
        return {
          label: `${formatDateCN(customStartDate)} ~ ${formatDateCN(customEndDate)} (共${dayCount}天)`,
          days,
          startDate: startStr,
          endDate: endStr
        };
      }
      return { label: '', days: [], startDate: null, endDate: null };
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

  function formatDateCN(date) {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  }

  function getWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  }

  function formatOvertime(ms) {
    if (ms <= 0) return '0秒';
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    if (m > 0) return '+' + m + '分' + String(s).padStart(2, '0') + '秒';
    return '+' + s + '秒';
  }

  // Collect running timer IDs
  function getRunningTimerIds() {
    const running = new Set();
    for (const id in state.timers) {
      if (state.timers[id].status === 'running') {
        running.add(id);
      }
    }
    return running;
  }

  function render() {
    content.innerHTML = '';

    if (mode === 'custom') {
      dateNav.style.display = 'none';
      renderCustomDatePicker();
      if (!customStartDate || !customEndDate) return;
    } else {
      dateNav.style.display = '';
    }

    const { label, days, startDate, endDate } = getDateRange();
    if (mode !== 'custom') {
      dateText.textContent = label;
    }

    if (!startDate || !endDate) return;

    // Get resets for the date range
    let resets;
    if (mode === 'day') {
      resets = getResetsForDate(startDate);
    } else {
      resets = getResetsForDateRange(startDate, endDate);
    }

    // Filter out legacy records
    resets = resets.filter(r => !isLegacyRecord(r));

    // Get running timers for annotation
    const runningIds = getRunningTimerIds();

    // Get all timers that were alive during this period (from lifecycle records)
    const aliveTimerIds = new Set();
    for (const day of days) {
      const active = getActiveTimersForDate(day);
      for (const lc of active) {
        aliveTimerIds.add(lc.timerId);
      }
    }

    // Build per-timer breakdown
    const breakdown = getPerTimerBreakdown(resets);

    // Check if we have any data
    if (breakdown.size === 0 && aliveTimerIds.size === 0) {
      if (isStatsEmpty()) {
        const empty = document.createElement('div');
        empty.className = 'stats-empty';
        empty.innerHTML = '<div class="stats-empty-icon">📊</div><div class="stats-empty-text">暂无统计数据<br>开工后即可记录数据</div>';
        content.appendChild(empty);
      } else {
        const empty = document.createElement('div');
        empty.className = 'stats-empty';
        empty.innerHTML = '<div class="stats-empty-icon">📋</div><div class="stats-empty-text">该时间段无业务数据</div>';
        content.appendChild(empty);
      }
      renderClearButton();
      return;
    }

    // Summary label for custom mode
    if (mode === 'custom') {
      const summary = document.createElement('div');
      summary.className = 'stats-range-summary';
      summary.textContent = label;
      content.appendChild(summary);
    }

    // Render per-timer section
    renderPerTimerBreakdown(breakdown, aliveTimerIds, runningIds);

    // Clear button
    renderClearButton();
  }

  function renderCustomDatePicker() {
    const picker = document.createElement('div');
    picker.className = 'stats-range-picker';

    // Start date row
    const startRow = document.createElement('div');
    startRow.className = 'stats-range-row';
    const startLabel = document.createElement('span');
    startLabel.className = 'stats-range-label';
    startLabel.textContent = '开始日期';
    const startInput = document.createElement('input');
    startInput.className = 'stats-range-input';
    startInput.type = 'date';
    if (customStartDate) startInput.value = formatDateStr(customStartDate);
    startInput.addEventListener('change', () => {
      if (startInput.value) customStartDate = new Date(startInput.value + 'T00:00:00');
    });
    startRow.appendChild(startLabel);
    startRow.appendChild(startInput);

    // End date row
    const endRow = document.createElement('div');
    endRow.className = 'stats-range-row';
    const endLabel = document.createElement('span');
    endLabel.className = 'stats-range-label';
    endLabel.textContent = '结束日期';
    const endInput = document.createElement('input');
    endInput.className = 'stats-range-input';
    endInput.type = 'date';
    if (customEndDate) endInput.value = formatDateStr(customEndDate);
    endInput.addEventListener('change', () => {
      if (endInput.value) customEndDate = new Date(endInput.value + 'T23:59:59');
    });
    endRow.appendChild(endLabel);
    endRow.appendChild(endInput);

    // Submit button
    const submitBtn = document.createElement('button');
    submitBtn.className = 'stats-range-submit';
    submitBtn.textContent = '查看统计';
    submitBtn.addEventListener('pointerup', () => {
      if (customStartDate && customEndDate) {
        render();
      }
    });

    picker.appendChild(startRow);
    picker.appendChild(endRow);
    picker.appendChild(submitBtn);
    content.appendChild(picker);
  }

  function renderPerTimerBreakdown(breakdown, aliveTimerIds, runningIds) {
    const section = document.createElement('div');
    section.className = 'stats-timer-section';

    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'stats-timer-section-title';
    sectionTitle.textContent = '各计时器明细';
    section.appendChild(sectionTitle);

    // First: render timers with data
    for (const [timerId, data] of breakdown) {
      const card = renderTimerCard(data, runningIds.has(timerIdToPhysicalId(timerId)));
      section.appendChild(card);
    }

    // Then: render alive timers with no data (but not running ones already shown)
    for (const timerId of aliveTimerIds) {
      if (breakdown.has(timerId)) continue;
      // Find the lifecycle record to get name/color
      const lc = getActiveTimersForDate(formatDateStr(new Date())).find(r => r.timerId === timerId);
      if (!lc) continue;
      const data = {
        timerId,
        name: lc.name,
        color: lc.color,
        count: 0,
        totalOvertime: 0,
        avgOvertime: 0
      };
      const card = renderTimerCard(data, runningIds.has(timerIdToPhysicalId(timerId)));
      section.appendChild(card);
    }

    content.appendChild(section);
  }

  function timerIdToPhysicalId(timerId) {
    // Find the physical ID from lifecycle records
    const statsData = getStatsData();
    const lc = statsData.timerLifecycles.find(r => r.timerId === timerId);
    return lc ? lc.physicalId : null;
  }

  function renderTimerCard(data, isRunning) {
    const card = document.createElement('div');
    card.className = 'stats-timer-card';

    // Header: color dot + name
    const header = document.createElement('div');
    header.className = 'stats-timer-card-header';

    const dot = document.createElement('div');
    dot.className = 'stats-timer-color-dot';
    dot.style.background = data.color || '#636E72';

    const name = document.createElement('span');
    name.className = 'stats-timer-name';
    name.textContent = data.name || '未知';

    header.appendChild(dot);
    header.appendChild(name);

    if (isRunning) {
      const runningLabel = document.createElement('span');
      runningLabel.className = 'stats-timer-running';
      runningLabel.textContent = '(进行中)';
      header.appendChild(runningLabel);
    }

    card.appendChild(header);

    // Meta: count + average overtime
    const meta = document.createElement('div');
    meta.className = 'stats-timer-meta';

    const countItem = document.createElement('div');
    countItem.className = 'stats-timer-meta-item';
    const countLabel = document.createElement('span');
    countLabel.className = 'stats-timer-meta-label';
    countLabel.textContent = '超时次数:';
    const countValue = document.createElement('span');
    countValue.className = 'stats-timer-meta-value';
    countValue.textContent = data.count + '次';
    countItem.appendChild(countLabel);
    countItem.appendChild(countValue);

    const avgItem = document.createElement('div');
    avgItem.className = 'stats-timer-meta-item';
    const avgLabel = document.createElement('span');
    avgLabel.className = 'stats-timer-meta-label';
    avgLabel.textContent = '平均超时:';
    const avgValue = document.createElement('span');
    avgValue.className = 'stats-timer-meta-value';
    avgValue.textContent = formatOvertime(data.avgOvertime);
    avgItem.appendChild(avgLabel);
    avgItem.appendChild(avgValue);

    meta.appendChild(countItem);
    meta.appendChild(avgItem);
    card.appendChild(meta);

    return card;
  }

  function renderClearButton() {
    const clearBtn = document.createElement('button');
    clearBtn.className = 'stats-clear';
    clearBtn.textContent = '🗑  清除所有统计数据';
    clearBtn.addEventListener('pointerup', () => {
      document.body.appendChild(createConfirmDialog({
        title: '确认清除',
        message: '将清除所有统计数据（含工时统计），此操作不可撤销！',
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

  // Initial render
  render();

  return { el, destroy: () => {} };
}
