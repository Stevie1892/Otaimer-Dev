export function createAdjustmentsModal(timerName, adjustments) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.cssText = 'max-height:80vh;display:flex;flex-direction:column;';

  // Title
  const titleEl = document.createElement('div');
  titleEl.className = 'modal-title';
  titleEl.textContent = '调整记录';

  const subtitle = document.createElement('div');
  subtitle.className = 'adj-subtitle';
  subtitle.textContent = timerName;

  // Body (scrollable list)
  const body = document.createElement('div');
  body.className = 'modal-body';
  body.style.cssText = 'overflow-y:auto;flex:1;min-height:0;max-height:50vh;';

  if (adjustments.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'adj-empty';
    empty.textContent = '暂无调整记录';
    body.appendChild(empty);
  } else {
    adjustments.forEach(adj => {
      const row = document.createElement('div');
      row.className = 'adj-row';

      const isAdd = adj.type === 'add';
      const prefix = isAdd ? '+' : '-';
      const absMs = Math.abs(adj.amount);
      const totalSec = Math.floor(absMs / 1000);
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      const durationText = m > 0
        ? prefix + m + '分' + String(s).padStart(2, '0') + '秒'
        : prefix + s + '秒';

      const d = new Date(adj.ts);
      const timeStr = String(d.getHours()).padStart(2, '0') + ':' +
        String(d.getMinutes()).padStart(2, '0') + ':' +
        String(d.getSeconds()).padStart(2, '0');

      const timeEl = document.createElement('span');
      timeEl.className = 'adj-time';
      timeEl.textContent = timeStr;

      const amountEl = document.createElement('span');
      amountEl.className = 'adj-amount';
      amountEl.textContent = durationText;
      amountEl.style.color = isAdd ? '#2ecc71' : '#e74c3c';

      const typeEl = document.createElement('span');
      typeEl.className = 'adj-type';
      typeEl.textContent = isAdd ? '增加' : '减少';
      typeEl.style.color = isAdd ? '#2ecc71' : '#e74c3c';

      row.appendChild(timeEl);
      row.appendChild(amountEl);
      row.appendChild(typeEl);
      body.appendChild(row);
    });
  }

  // Summary
  const addCount = adjustments.filter(a => a.type === 'add').length;
  const subCount = adjustments.filter(a => a.type === 'subtract').length;
  const netMs = adjustments.reduce((sum, a) => {
    return sum + (a.type === 'add' ? a.amount : -a.amount);
  }, 0);

  let summary = null;
  if (adjustments.length > 0) {
    summary = document.createElement('div');
    summary.className = 'adj-summary';

    const netPrefix = netMs >= 0 ? '+' : '-';
    const absNet = Math.abs(netMs);
    const netTotalSec = Math.floor(absNet / 1000);
    const netM = Math.floor(netTotalSec / 60);
    const netS = netTotalSec % 60;
    const netText = netM > 0
      ? netPrefix + netM + '分' + String(netS).padStart(2, '0') + '秒'
      : netPrefix + netS + '秒';

    const netEl = document.createElement('div');
    netEl.className = 'adj-net';
    netEl.textContent = '总计：净时长 ' + netText;
    netEl.style.color = netMs >= 0 ? '#2ecc71' : '#e74c3c';
    summary.appendChild(netEl);

    const countEl = document.createElement('div');
    countEl.className = 'adj-counts';
    countEl.textContent = '增加 ' + addCount + '次 | 减少 ' + subCount + '次 | 共 ' + adjustments.length + '次';
    summary.appendChild(countEl);
  }

  // Close button
  const footer = document.createElement('div');
  footer.className = 'modal-footer';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal-btn modal-btn-confirm';
  closeBtn.textContent = '关闭';
  footer.appendChild(closeBtn);

  modal.appendChild(titleEl);
  modal.appendChild(subtitle);
  modal.appendChild(body);
  if (summary) modal.appendChild(summary);
  modal.appendChild(footer);

  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;inset:0;z-index:210;';
  container.appendChild(backdrop);
  container.appendChild(modal);

  function closeDialog() {
    container.remove();
  }

  backdrop.addEventListener('pointerup', closeDialog);
  closeBtn.addEventListener('pointerup', (e) => {
    e.stopPropagation();
    closeDialog();
  });

  document.body.appendChild(container);

  return { close: closeDialog };
}
