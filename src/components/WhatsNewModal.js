export function createWhatsNewModal(version, changes) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.cssText = 'max-height:80vh;display:flex;flex-direction:column;';

  const titleEl = document.createElement('div');
  titleEl.className = 'modal-title';
  titleEl.textContent = '版本更新 ' + version;

  const body = document.createElement('div');
  body.className = 'modal-body';
  body.style.cssText = 'overflow-y:auto;flex:1;min-height:0;max-height:55vh;line-height:1.8;font-size:0.9rem;';

  changes.forEach(section => {
    const sectionTitle = document.createElement('div');
    sectionTitle.style.cssText = 'font-weight:600;color:var(--accent);margin-top:12px;margin-bottom:4px;font-size:0.85rem;';
    sectionTitle.textContent = section.title;
    body.appendChild(sectionTitle);

    section.items.forEach(item => {
      const row = document.createElement('div');
      row.style.cssText = 'padding:2px 0;color:var(--text-secondary);';
      row.textContent = '· ' + item;
      body.appendChild(row);
    });
  });

  const footer = document.createElement('div');
  footer.className = 'modal-footer';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal-btn modal-btn-confirm';
  closeBtn.textContent = '知道了';
  footer.appendChild(closeBtn);

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

  backdrop.addEventListener('pointerup', closeDialog);
  closeBtn.addEventListener('pointerup', (e) => {
    e.stopPropagation();
    closeDialog();
  });

  document.body.appendChild(container);

  return { close: closeDialog };
}
