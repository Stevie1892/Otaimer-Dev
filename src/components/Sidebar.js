import {
  state, updateSettings, resetAllTimers,
  switchGroup, addGroup, removeGroup, addTimer, renameGroup,
  totalTimersInGroup
} from '../core/state.js';
import { randomColor } from '../utils/colors.js';
import { setupLongPress } from '../utils/domHelper.js';
import { createConfirmDialog } from './ConfirmDialog.js';

export function createSidebar(onSortRequest, onCloseSidebar, pushBackLayer, consumeLayer) {
  const mask = document.createElement('div');
  mask.className = 'sidebar-mask';
  mask.addEventListener('pointerup', close);

  const sidebar = document.createElement('div');
  sidebar.className = 'sidebar';

  const header = document.createElement('div');
  header.className = 'sidebar-header';

  const title = document.createElement('h3');
  title.textContent = '菜单';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'sidebar-close';
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('pointerup', close);

  header.appendChild(title);
  header.appendChild(closeBtn);
  sidebar.appendChild(header);

  // Settings section
  const settingsSection = document.createElement('div');
  settingsSection.className = 'sidebar-section';

  const settingsTitle = document.createElement('div');
  settingsTitle.className = 'sidebar-section-title';
  settingsTitle.textContent = '设置';
  settingsSection.appendChild(settingsTitle);

  // Duration — clickable row
  const durationRow = document.createElement('button');
  durationRow.className = 'sidebar-item';
  durationRow.style.cssText = 'justify-content:space-between;';

  const durationLeft = document.createElement('span');
  durationLeft.style.cssText = 'display:flex;align-items:center;gap:12px;';
  durationLeft.innerHTML = '<span class="sidebar-item-icon">⏱</span>';

  const durationLabel = document.createElement('span');
  durationLabel.style.cssText = 'color:var(--text-primary);font-size:0.95rem;';

  const durationValue = document.createElement('span');
  durationValue.style.cssText = 'color:var(--accent);font-weight:600;font-size:0.9rem;';

  function updateDurationDisplay() {
    const totalSec = state.settings.defaultDuration / 1000;
    const mins = Math.floor(totalSec / 60);
    const secs = Math.round(totalSec % 60);
    durationLabel.textContent = '默认倒计时时长';
    if (secs === 0) {
      durationValue.textContent = mins + ' 分钟';
    } else {
      durationValue.textContent = mins + ' 分 ' + secs + ' 秒';
    }
  }
  updateDurationDisplay();

  durationLeft.appendChild(durationLabel);
  durationRow.appendChild(durationLeft);
  durationRow.appendChild(durationValue);

  durationRow.addEventListener('pointerup', () => {
    showDurationModal();
  });
  settingsSection.appendChild(durationRow);

  // Alert mode
  const alertLabel = document.createElement('div');
  alertLabel.className = 'sidebar-setting-label';
  const alertText = document.createElement('span');
  alertText.textContent = '倒计时结束提醒';
  alertLabel.appendChild(alertText);

  const radioGroup = document.createElement('div');
  radioGroup.className = 'radio-group';

  const modes = [
    { value: 'sound', label: '响铃' },
    { value: 'vibrate', label: '震动' },
    { value: 'both', label: '两者' },
    { value: 'silent', label: '静音' }
  ];

  modes.forEach(mode => {
    const btn = document.createElement('button');
    btn.className = 'radio-btn';
    btn.textContent = mode.label;
    if (state.settings.alertMode === mode.value) btn.classList.add('active');
    btn.addEventListener('pointerup', () => {
      updateSettings({ alertMode: mode.value });
      radioGroup.querySelectorAll('.radio-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
    radioGroup.appendChild(btn);
  });

  alertLabel.appendChild(radioGroup);
  settingsSection.appendChild(alertLabel);

  // Theme switch
  const themeLabel = document.createElement('div');
  themeLabel.className = 'sidebar-setting-label';
  const themeText = document.createElement('span');
  themeText.textContent = '主题模式';
  themeLabel.appendChild(themeText);

  const themeGroup = document.createElement('div');
  themeGroup.className = 'radio-group';
  const themes = [
    { value: 'dark', label: '🌙 夜间' },
    { value: 'light', label: '☀ 白天' }
  ];
  themes.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'radio-btn';
    btn.textContent = t.label;
    if ((state.settings.theme || 'dark') === t.value) btn.classList.add('active');
    btn.addEventListener('pointerup', () => {
      updateSettings({ theme: t.value });
      document.body.className = 'theme-' + t.value;
      themeGroup.querySelectorAll('.radio-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
    themeGroup.appendChild(btn);
  });
  themeLabel.appendChild(themeGroup);
  settingsSection.appendChild(themeLabel);

  sidebar.appendChild(settingsSection);

  // Actions section
  const actionsSection = document.createElement('div');
  actionsSection.className = 'sidebar-section';

  const actionsTitle = document.createElement('div');
  actionsTitle.className = 'sidebar-section-title';
  actionsTitle.textContent = '操作';
  actionsSection.appendChild(actionsTitle);

  const resetItem = document.createElement('button');
  resetItem.className = 'sidebar-item';
  resetItem.innerHTML = '<span class="sidebar-item-icon">🔄</span> 一键重置全部计时器';
  resetItem.addEventListener('pointerup', () => {
    const timers = totalTimersInGroup(state.settings.currentGroupId);
    if (timers === 0) return;
    pushBackLayer?.(() => {});
    const dlg = createConfirmDialog({
      title: '确认重置',
      message: `将当前分组所有 ${timers} 个计时器重置为默认时长？`,
      confirmLabel: '确认重置',
      danger: false,
      onConfirm: () => {
        resetAllTimers();
        consumeLayer?.();
      },
      onCancel: () => {
        consumeLayer?.();
      }
    });
    document.body.appendChild(dlg);
  });
  actionsSection.appendChild(resetItem);

  const addItem = document.createElement('button');
  addItem.className = 'sidebar-item';
  addItem.innerHTML = '<span class="sidebar-item-icon">➕</span> 添加计时器';
  addItem.addEventListener('pointerup', () => {
    const result = addTimer({ color: randomColor() });
    if (!result) {
      pushBackLayer?.(() => {});
      const dlg = createConfirmDialog({
        title: '提示',
        message: '每个分组最多支持10个计时器',
        confirmLabel: '知道了',
        cancelLabel: '',
        onConfirm() { consumeLayer?.(); },
        onCancel() {}
      });
      document.body.appendChild(dlg);
    }
  });
  actionsSection.appendChild(addItem);

  const sortItem = document.createElement('button');
  sortItem.className = 'sidebar-item';
  sortItem.innerHTML = '<span class="sidebar-item-icon">✏️</span> 自定义计时器排序';
  sortItem.addEventListener('pointerup', () => {
    onCloseSidebar?.();
    close();
    onSortRequest?.();
  });
  actionsSection.appendChild(sortItem);

  sidebar.appendChild(actionsSection);

  // Groups section
  const groupsSection = document.createElement('div');
  groupsSection.className = 'sidebar-section';
  const groupsTitle = document.createElement('div');
  groupsTitle.className = 'sidebar-section-title';
  groupsTitle.textContent = '分组';
  groupsSection.appendChild(groupsTitle);

  const groupList = document.createElement('div');
  groupList.className = 'group-list';
  groupsSection.appendChild(groupList);

  const longPressMap = new Map();

  function renderGroups() {
    longPressMap.forEach(lp => lp.destroy());
    longPressMap.clear();
    groupList.innerHTML = '';

    state.groups.forEach(group => {
      const item = document.createElement('div');
      item.className = 'group-list-item';
      if (group.id === state.settings.currentGroupId) {
        item.classList.add('active');
      }

      const nameEl = document.createElement('span');
      nameEl.className = 'group-list-item-name';
      nameEl.textContent = group.name;

      const countEl = document.createElement('span');
      countEl.className = 'group-list-item-count';
      countEl.textContent = group.timerIds.length + '个';

      item.appendChild(nameEl);
      item.appendChild(countEl);

      item.addEventListener('pointerup', () => {
        switchGroup(group.id);
        renderGroups();
        updateDurationDisplay();
      });

      const lp = setupLongPress(item, () => {
        showRenameDialog(group);
      }, { duration: 500, moveThreshold: 8 });
      longPressMap.set(group.id, lp);

      if (group.id !== state.settings.currentGroupId && state.groups.length > 1) {
        const removeBtn = document.createElement('button');
        removeBtn.className = 'group-list-item-remove';
        removeBtn.textContent = '✕';
        removeBtn.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
          e.preventDefault();
        });
        removeBtn.addEventListener('pointerup', (e) => {
          e.stopPropagation();
          pushBackLayer?.(() => {});
          const dlg = createConfirmDialog({
            title: '确认删除',
            message: `确定要删除分组"${group.name}"吗？该分组下的所有计时器也将被删除！`,
            confirmLabel: '删除',
            danger: true,
            onConfirm: () => {
              removeGroup(group.id);
              consumeLayer?.();
              renderGroups();
            },
            onCancel: () => {
              consumeLayer?.();
            }
          });
          document.body.appendChild(dlg);
        });
        item.appendChild(removeBtn);
      }

      groupList.appendChild(item);
    });
  }

  function showDurationModal() {
    pushBackLayer?.(() => {});

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    const modal = document.createElement('div');
    modal.className = 'modal';

    const titleEl = document.createElement('div');
    titleEl.className = 'modal-title';
    titleEl.textContent = '默认倒计时时长';

    const body = document.createElement('div');
    body.className = 'modal-body';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'sidebar-slider';
    slider.style.width = '100%';
    slider.style.marginBottom = '16px';
    slider.min = '1';
    slider.max = '10';
    slider.step = '0.5';
    slider.value = String(state.settings.defaultDuration / 60000);

    const displayValue = document.createElement('div');
    displayValue.style.cssText = 'text-align:center;font-size:1.2rem;font-weight:600;color:var(--accent);margin-bottom:16px;';

    function updateDisplay() {
      const mins = parseFloat(slider.value);
      const totalSec = mins * 60;
      const fm = Math.floor(totalSec / 60);
      const fs = Math.round(totalSec % 60);
      if (fs === 0) {
        displayValue.textContent = fm + ' 分钟';
      } else {
        displayValue.textContent = fm + ' 分 ' + fs + ' 秒';
      }
    }
    updateDisplay();

    slider.addEventListener('input', () => {
      updateDisplay();
    });

    body.appendChild(slider);
    body.appendChild(displayValue);

    const footer = document.createElement('div');
    footer.className = 'modal-footer';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'modal-btn modal-btn-cancel';
    cancelBtn.textContent = '取消';

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'modal-btn modal-btn-confirm';
    confirmBtn.textContent = '确认';

    footer.appendChild(cancelBtn);
    footer.appendChild(confirmBtn);

    modal.appendChild(titleEl);
    modal.appendChild(body);
    modal.appendChild(footer);

    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;inset:0;z-index:210;';
    container.appendChild(backdrop);
    container.appendChild(modal);

    function closeDialog() {
      container.remove();
    }

    backdrop.addEventListener('pointerup', () => {
      consumeLayer?.();
      closeDialog();
    });
    cancelBtn.addEventListener('pointerup', (e) => {
      e.stopPropagation();
      consumeLayer?.();
      closeDialog();
    });
    confirmBtn.addEventListener('pointerup', (e) => {
      e.stopPropagation();
      const mins = parseFloat(slider.value);
      updateSettings({ defaultDuration: Math.round(mins * 60000) });
      updateDurationDisplay();
      consumeLayer?.();
      closeDialog();
    });

    document.body.appendChild(container);
  }

  function showRenameDialog(group) {
    pushBackLayer?.(() => {});

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    const modal = document.createElement('div');
    modal.className = 'modal';

    const titleEl = document.createElement('div');
    titleEl.className = 'modal-title';
    titleEl.textContent = '重命名分组';

    const body = document.createElement('div');
    body.className = 'modal-body';

    const input = document.createElement('input');
    input.className = 'form-input';
    input.type = 'text';
    input.value = group.name;
    input.maxLength = 12;
    input.placeholder = '输入分组名称...';

    body.appendChild(input);

    const footer = document.createElement('div');
    footer.className = 'modal-footer';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'modal-btn modal-btn-cancel';
    cancelBtn.textContent = '取消';

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'modal-btn modal-btn-confirm';
    confirmBtn.textContent = '确认';

    footer.appendChild(cancelBtn);
    footer.appendChild(confirmBtn);

    modal.appendChild(titleEl);
    modal.appendChild(body);
    modal.appendChild(footer);

    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;inset:0;z-index:210;';
    container.appendChild(backdrop);
    container.appendChild(modal);

    function closeDialog() {
      container.remove();
    }

    backdrop.addEventListener('pointerup', () => {
      consumeLayer?.();
      closeDialog();
    });
    cancelBtn.addEventListener('pointerup', (e) => {
      e.stopPropagation();
      consumeLayer?.();
      closeDialog();
    });
    confirmBtn.addEventListener('pointerup', (e) => {
      e.stopPropagation();
      const newName = input.value.trim();
      if (newName) {
        renameGroup(group.id, newName);
        renderGroups();
      }
      consumeLayer?.();
      closeDialog();
    });

    document.body.appendChild(container);
    setTimeout(() => input.focus(), 100);
  }

  const addGroupBtn = document.createElement('button');
  addGroupBtn.className = 'sidebar-item';
  addGroupBtn.innerHTML = '<span class="sidebar-item-icon">📁</span> 添加新分组';
  addGroupBtn.addEventListener('pointerup', () => {
    if (state.groups.length >= 5) {
      pushBackLayer?.(() => {});
      const dlg = createConfirmDialog({
        title: '提示',
        message: '最多支持 5 个分组',
        confirmLabel: '知道了',
        cancelLabel: '',
        onConfirm() { consumeLayer?.(); },
        onCancel() {}
      });
      document.body.appendChild(dlg);
      return;
    }
    const name = '分组 ' + (state.groups.length + 1);
    addGroup(name);
    renderGroups();
  });
  groupsSection.appendChild(addGroupBtn);

  renderGroups();
  sidebar.appendChild(groupsSection);

  document.body.appendChild(mask);
  document.body.appendChild(sidebar);

  function close() {
    mask.classList.remove('open');
    sidebar.classList.remove('open');
    onCloseSidebar?.();
  }

  function open() {
    mask.classList.add('open');
    sidebar.classList.add('open');
    updateDurationDisplay();
    renderGroups();
  }

  return { el: sidebar, open, close, renderGroups, updateDurationDisplay };
}
