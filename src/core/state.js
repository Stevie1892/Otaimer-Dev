import { loadState, saveState } from './storage.js';
import {
  recordTimerReset, recordTimerCreated, recordTimerClosed,
  cleanLifecycleRecord, findLifecycleByName, reopenLifecycleRecord,
  updateLifecycleColor, hasBusinessResets, getActiveLifecycleForPhysical,
  handleTimerDeletion
} from './statsTracker.js';

function generateId() {
  return 't_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
}

function generateGroupId() {
  return 'g_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
}

function makeTimer(overrides = {}) {
  return {
    id: generateId(),
    name: '新计时器',
    color: '#45B7D1',
    defaultDuration: state.settings.defaultDuration,
    remaining: state.settings.defaultDuration,
    overtime: 0,
    status: 'idle',
    mode: 'countdown',
    order: 0,
    ...overrides
  };
}

function makeGroup(overrides = {}) {
  return {
    id: generateGroupId(),
    name: '新分组',
    timerIds: [],
    defaultDuration: 180000,
    ...overrides
  };
}

export const state = {
  settings: {
    defaultDuration: 180000,
    alertMode: 'both',
    currentGroupId: 'default',
    theme: 'dark',
    workStartTime: null
  },
  groups: [],
  timers: {}
};

let listeners = new Set();
let _dirty = false;
let _persistTimer = null;

export function init() {
  const stored = loadState();
  if (stored && stored.groups && stored.timers) {
    state.settings = { ...state.settings, ...stored.settings };
    state.groups = stored.groups;
    state.timers = stored.timers;

    for (const g of state.groups) {
      if (g.defaultDuration == null) g.defaultDuration = 180000;
    }

    for (const id in state.timers) {
      if (state.timers[id].status === 'running') {
        state.timers[id].status = 'paused';
      }
    }
  }
  if (state.groups.length === 0) {
    const defaultGroup = makeGroup({ id: 'default', name: '默认分组' });
    state.groups.push(defaultGroup);
  }
  const curGroup = state.groups.find(g => g.id === state.settings.currentGroupId);
  if (!curGroup) {
    state.settings.currentGroupId = state.groups[0].id;
  }
  // Sync current group's default to settings
  const activeGroup = state.groups.find(g => g.id === state.settings.currentGroupId);
  if (activeGroup && activeGroup.defaultDuration) {
    state.settings.defaultDuration = activeGroup.defaultDuration;
  }
}

export function onStateChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function notify() {
  listeners.forEach(fn => fn());
}

export function markDirty() {
  if (!_dirty) {
    _dirty = true;
    requestAnimationFrame(() => {
      _dirty = false;
      notify();
      if (!_persistTimer) {
        _persistTimer = setTimeout(() => {
          saveState(state);
          _persistTimer = null;
        }, 1500);
      }
    });
  }
}

export function forceUpdate() {
  notify();
  saveState(state);
}

export function getGroupTimers(groupId) {
  const group = state.groups.find(g => g.id === groupId);
  if (!group) return [];
  return group.timerIds
    .map(id => state.timers[id])
    .filter(Boolean)
    .sort((a, b) => a.order - b.order);
}

export function addTimer(options = {}) {
  const groupId = options.groupId || state.settings.currentGroupId;
  const group = state.groups.find(g => g.id === groupId);
  if (!group) return null;
  const timers = getGroupTimers(groupId);
  if (timers.length >= 10) return null;

  const timer = makeTimer({
    ...options,
    groupId,
    order: timers.length
  });
  state.timers[timer.id] = timer;
  group.timerIds.push(timer.id);
  recordTimerCreated(timer.id, timer.id, groupId, timer.name, timer.color);
  forceUpdate();
  return timer;
}

export function removeTimer(id) {
  const timer = state.timers[id];
  if (!timer) return;
  // Handle lifecycle cleanup before removing
  handleTimerDeletion(id);
  const group = state.groups.find(g => g.timerIds.includes(id));
  if (group) {
    group.timerIds = group.timerIds.filter(tid => tid !== id);
    group.timerIds.forEach((tid, i) => {
      if (state.timers[tid]) state.timers[tid].order = i;
    });
  }
  delete state.timers[id];
  forceUpdate();
}

export function updateTimer(id, updates) {
  const timer = state.timers[id];
  if (!timer) return;
  Object.assign(timer, updates);
  forceUpdate();
}

export function renameTimer(id, newName, newColor) {
  const timer = state.timers[id];
  if (!timer) return;

  const nameChanged = timer.name !== newName;
  const colorChanged = timer.color !== newColor;

  if (!nameChanged && !colorChanged) return;

  if (!nameChanged) {
    // Only color changed — update lifecycle color, no new timerId
    const activeLifecycle = getActiveLifecycleForPhysical(id);
    if (activeLifecycle) {
      updateLifecycleColor(activeLifecycle.timerId, newColor);
    }
    timer.color = newColor;
    forceUpdate();
    return;
  }

  // Name changed — check for rename-back-to-original
  const existingRecord = findLifecycleByName(id, newName);

  if (existingRecord) {
    // Rename back to a previous name — redirect to original timerId
    // Clean up current lifecycle if no business data
    const currentLifecycle = getActiveLifecycleForPhysical(id);
    if (currentLifecycle) {
      if (hasBusinessResets(currentLifecycle.timerId)) {
        recordTimerClosed(currentLifecycle.timerId, 'renamed');
      } else {
        cleanLifecycleRecord(currentLifecycle.timerId);
      }
    }
    // Reopen the historical record
    reopenLifecycleRecord(existingRecord.timerId);
    // Update color on the reopened record
    if (colorChanged) {
      updateLifecycleColor(existingRecord.timerId, newColor);
    }
  } else {
    // New name — generate new timerId
    const currentLifecycle = getActiveLifecycleForPhysical(id);
    if (currentLifecycle) {
      if (hasBusinessResets(currentLifecycle.timerId)) {
        recordTimerClosed(currentLifecycle.timerId, 'renamed');
      } else {
        cleanLifecycleRecord(currentLifecycle.timerId);
      }
    }
    const newTimerId = generateId();
    recordTimerCreated(newTimerId, id, state.settings.currentGroupId, newName, newColor);
  }

  timer.name = newName;
  timer.color = newColor;
  forceUpdate();
}

export function toggleTimer(id) {
  const timer = state.timers[id];
  if (!timer) return;
  if (timer.status === 'running') {
    timer.status = 'paused';
  } else {
    timer.status = 'running';
    if (timer.mode === 'countup' && timer.overtime === 0 && timer.remaining === 0) {
      timer.remaining = timer.defaultDuration;
    }
  }
  forceUpdate();
}

export function resetTimer(id) {
  const timer = state.timers[id];
  if (!timer) return;
  // Record timer completion for stats (countup mode with overtime)
  if (timer.mode === 'countup' && timer.overtime > 0) {
    const activeLifecycle = getActiveLifecycleForPhysical(id);
    if (activeLifecycle) {
      recordTimerReset(timer.overtime, {
        timerId: activeLifecycle.timerId,
        timerName: timer.name,
        timerColor: timer.color,
        groupId: state.settings.currentGroupId
      });
    }
  }
  timer.status = 'idle';
  timer.mode = 'countdown';
  timer.remaining = timer.defaultDuration;
  timer.overtime = 0;
  forceUpdate();
}

export function addTimerTime(id, ms) {
  const timer = state.timers[id];
  if (!timer || timer.mode !== 'countdown') return;
  timer.remaining += ms;
  forceUpdate();
}

export function subtractTimerTime(id, ms) {
  const timer = state.timers[id];
  if (!timer || timer.mode !== 'countdown') return;
  timer.remaining = Math.max(0, timer.remaining - ms);
  forceUpdate();
}

export function setTimerMode(id, mode, duration) {
  const timer = state.timers[id];
  if (!timer) return;
  timer.mode = mode;
  timer.status = 'running';
  if (mode === 'countdown') {
    timer.remaining = duration || timer.defaultDuration;
    timer.overtime = 0;
  } else {
    timer.overtime = 0;
    timer.remaining = 0;
  }
  forceUpdate();
}

export function startCountdown(id, duration) {
  const timer = state.timers[id];
  if (!timer) return;
  timer.mode = 'countdown';
  timer.status = 'running';
  timer.remaining = duration;
  timer.overtime = 0;
  forceUpdate();
}

export function resetAllTimers() {
  const groupId = state.settings.currentGroupId;
  const group = state.groups.find(g => g.id === groupId);
  if (!group) return;
  group.timerIds.forEach(id => {
    const timer = state.timers[id];
    if (timer) {
      // Record stats before resetting
      if (timer.mode === 'countup' && timer.overtime > 0) {
        const activeLifecycle = getActiveLifecycleForPhysical(id);
        if (activeLifecycle) {
          recordTimerReset(timer.overtime, {
            timerId: activeLifecycle.timerId,
            timerName: timer.name,
            timerColor: timer.color,
            groupId: state.settings.currentGroupId
          });
        }
      }
      timer.status = 'idle';
      timer.mode = 'countdown';
      timer.remaining = state.settings.defaultDuration;
      timer.defaultDuration = state.settings.defaultDuration;
      timer.overtime = 0;
    }
  });
  forceUpdate();
}

export function updateSettings(updates) {
  Object.assign(state.settings, updates);
  if (updates.defaultDuration != null) {
    const group = state.groups.find(g => g.id === state.settings.currentGroupId);
    if (group) group.defaultDuration = updates.defaultDuration;
  }
  forceUpdate();
}

export function addGroup(name) {
  if (state.groups.length >= 5) return null;
  const group = makeGroup({ name: name || '新分组' });
  state.groups.push(group);
  forceUpdate();
  return group;
}

export function renameGroup(id, newName) {
  const group = state.groups.find(g => g.id === id);
  if (!group || !newName) return;
  group.name = newName;
  forceUpdate();
}

export function removeGroup(id) {
  if (state.groups.length <= 1) return;
  const group = state.groups.find(g => g.id === id);
  if (!group) return;
  group.timerIds.forEach(tid => {
    handleTimerDeletion(tid);
    delete state.timers[tid];
  });
  state.groups = state.groups.filter(g => g.id !== id);
  if (state.settings.currentGroupId === id) {
    state.settings.currentGroupId = state.groups[0].id;
  }
  forceUpdate();
}

export function switchGroup(id) {
  const group = state.groups.find(g => g.id === id);
  if (group) {
    state.settings.currentGroupId = id;
    state.settings.defaultDuration = group.defaultDuration || 180000;
    forceUpdate();
  }
}

export function reorderTimers(timerIds) {
  const groupId = state.settings.currentGroupId;
  const group = state.groups.find(g => g.id === groupId);
  if (!group) return;
  group.timerIds = timerIds;
  timerIds.forEach((id, i) => {
    if (state.timers[id]) state.timers[id].order = i;
  });
  forceUpdate();
}

export function totalTimersInGroup(groupId) {
  const group = state.groups.find(g => g.id === groupId);
  return group ? group.timerIds.length : 0;
}
