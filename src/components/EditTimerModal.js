import { PRESET_COLORS } from '../utils/colors.js';
import { formatTime } from '../core/timeFormat.js';

export function createEditTimerModal(timer, onSave, onCancel) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  const modal = document.createElement('div');
  modal.className = 'modal';

  const titleEl = document.createElement('div');
  titleEl.className = 'modal-title';
  titleEl.textContent = '编辑计时器';

  const body = document.createElement('div');
  body.className = 'modal-body';

  let selectedColor = timer.color;
  let timerName = timer.name;

  // Preview
  const preview = document.createElement('div');
  preview.className = 'timer-preview';

  const previewCircle = document.createElement('div');
  previewCircle.className = 'preview-circle';
  previewCircle.style.setProperty('--preview-color', selectedColor);

  const previewTime = document.createElement('div');
  previewTime.className = 'preview-time';
  previewTime.textContent = formatTime(timer.remaining);

  const previewName = document.createElement('div');
  previewName.className = 'preview-name';
  previewName.textContent = timerName;

  previewCircle.appendChild(previewTime);
  previewCircle.appendChild(previewName);
  preview.appendChild(previewCircle);

  // Name input
  const formGroup = document.createElement('div');
  formGroup.className = 'form-group';

  const label = document.createElement('label');
  label.className = 'form-label';
  label.textContent = '计时器名称';

  const input = document.createElement('input');
  input.className = 'form-input';
  input.type = 'text';
  input.value = timerName;
  input.maxLength = 10;
  input.placeholder = '输入名称...';
  input.addEventListener('input', () => {
    timerName = input.value;
    previewName.textContent = timerName || '未命名';
  });

  formGroup.appendChild(label);
  formGroup.appendChild(input);

  // Color picker
  const colorLabel = document.createElement('label');
  colorLabel.className = 'form-label';
  colorLabel.textContent = '颜色';

  const colorGrid = document.createElement('div');
  colorGrid.className = 'color-grid';

  PRESET_COLORS.forEach(color => {
    const swatch = document.createElement('div');
    swatch.className = 'color-swatch';
    swatch.style.background = color;
    if (color === selectedColor) swatch.classList.add('selected');

    swatch.addEventListener('pointerup', (e) => {
      e.stopPropagation();
      colorGrid.querySelectorAll('.color-swatch, .color-custom').forEach(s => s.classList.remove('selected'));
      swatch.classList.add('selected');
      selectedColor = color;
      previewCircle.style.setProperty('--preview-color', color);
    });

    colorGrid.appendChild(swatch);
  });

  // Custom color picker slot
  const customSwatch = document.createElement('div');
  customSwatch.className = 'color-swatch color-custom';
  customSwatch.style.background = 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)';
  customSwatch.title = '自定义颜色';
  const customLabel = document.createElement('span');
  customLabel.style.cssText = 'font-size:0.8rem;color:#fff;text-shadow:0 0 3px #000;pointer-events:none;';
  customLabel.textContent = '🌈';
  customSwatch.appendChild(customLabel);

  // Reusable hidden color input
  let colorInput = null;
  function getColorInput() {
    if (!colorInput) {
      colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:50px;height:50px;opacity:0.01;';
      document.body.appendChild(colorInput);
    }
    return colorInput;
  }

  customSwatch.addEventListener('pointerup', (e) => {
    e.stopPropagation();
    onInputDone();
    const input = getColorInput();
    input.value = selectedColor;
    input.addEventListener('input', onInputChange);
    input.addEventListener('change', onInputDone);
    input.addEventListener('blur', onInputDone);
    setTimeout(() => { input.click(); }, 150);
  });

  function onInputChange() {
    selectedColor = colorInput.value;
    previewCircle.style.setProperty('--preview-color', selectedColor);
    colorGrid.querySelectorAll('.color-swatch, .color-custom').forEach(s => s.classList.remove('selected'));
    customSwatch.classList.add('selected');
  }
  function onInputDone() {
    colorInput.removeEventListener('input', onInputChange);
    colorInput.removeEventListener('change', onInputDone);
    colorInput.removeEventListener('blur', onInputDone);
  }

  // colorGrid.appendChild(customSwatch);

  body.appendChild(preview);
  body.appendChild(formGroup);
  body.appendChild(colorLabel);
  body.appendChild(colorGrid);

  // Footer
  const footer = document.createElement('div');
  footer.className = 'modal-footer';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'modal-btn modal-btn-cancel';
  cancelBtn.textContent = '取消';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'modal-btn modal-btn-confirm';
  saveBtn.textContent = '保存';

  footer.appendChild(cancelBtn);
  footer.appendChild(saveBtn);

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

  backdrop.addEventListener('pointerup', () => {
    close();
    onCancel?.();
  });
  cancelBtn.addEventListener('pointerup', (e) => {
    e.stopPropagation();
    close();
    onCancel?.();
  });
  saveBtn.addEventListener('pointerup', (e) => {
    e.stopPropagation();
    close();
    onSave({ name: timerName || '未命名', color: selectedColor });
  });

  return container;
}
