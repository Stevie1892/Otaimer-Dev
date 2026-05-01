export function createConfirmDialog(options) {
  const { title, message, confirmLabel = '确认', cancelLabel = '取消', danger = false, onConfirm, onCancel } = options;

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  const modal = document.createElement('div');
  modal.className = 'modal';

  const titleEl = document.createElement('div');
  titleEl.className = 'modal-title';
  titleEl.textContent = title;

  const body = document.createElement('div');
  body.className = 'modal-body';
  body.textContent = message;

  const footer = document.createElement('div');
  footer.className = 'modal-footer';

  const confirmBtn = document.createElement('button');
  confirmBtn.className = danger ? 'modal-btn modal-btn-danger' : 'modal-btn modal-btn-confirm';
  confirmBtn.textContent = confirmLabel;

  if (cancelLabel) {
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'modal-btn modal-btn-cancel';
    cancelBtn.textContent = cancelLabel;
    footer.appendChild(cancelBtn);

    cancelBtn.addEventListener('pointerup', (e) => {
      e.stopPropagation();
      close();
      onCancel?.();
    });
  }

  footer.appendChild(confirmBtn);

  modal.appendChild(titleEl);
  modal.appendChild(body);
  modal.appendChild(footer);

  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;inset:0;z-index:210;';
  container.appendChild(backdrop);
  container.appendChild(modal);

  function close() {
    container.remove();
  }

  backdrop.addEventListener('pointerup', close);
  confirmBtn.addEventListener('pointerup', (e) => {
    e.stopPropagation();
    close();
    onConfirm?.();
  });

  return container;
}
