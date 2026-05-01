import { randomColor } from '../utils/colors.js';

export function createSplashScreen(onStart) {
  const el = document.createElement('div');
  el.className = 'splash-screen';

  const shapesContainer = document.createElement('div');
  shapesContainer.className = 'splash-shapes';

  const shapeDefs = [
    { shape: 'triangle', size: 60, x: '20%', y: '20%', color: '#FF6B6B' },
    { shape: 'square', size: 45, x: '65%', y: '15%', color: '#45B7D1' },
    { shape: 'circle', size: 50, x: '15%', y: '55%', color: '#A29BFE' },
    { shape: 'diamond', size: 40, x: '75%', y: '45%', color: '#FFEAA7' },
    { shape: 'triangle', size: 35, x: '55%', y: '60%', color: '#2ECC71' },
    { shape: 'square', size: 30, x: '35%', y: '30%', color: '#DDA0DD' },
    { shape: 'circle', size: 38, x: '80%', y: '70%', color: '#FDCB6E' },
    { shape: 'diamond', size: 44, x: '10%', y: '75%', color: '#48DBFB' }
  ];

  shapeDefs.forEach(def => {
    const shape = createShape(def);
    shapesContainer.appendChild(shape);
  });

  el.appendChild(shapesContainer);

  const bottom = document.createElement('div');
  bottom.className = 'splash-bottom';

  const label = document.createElement('div');
  label.className = 'splash-title';
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  label.textContent = '欢迎地偶痴，今天是' + y + '年' + m + '月' + d + '号';

  const btn = document.createElement('button');
  btn.className = 'splash-btn';
  btn.textContent = '开工！';
  btn.addEventListener('pointerup', (e) => {
    e.stopPropagation();
    onStart();
  });

  const version = document.createElement('div');
  version.className = 'splash-version';
  version.textContent = 'v1.1.1';

  bottom.appendChild(label);
  bottom.appendChild(btn);
  bottom.appendChild(version);
  el.appendChild(bottom);

  return el;
}

function createShape(def) {
  const shape = document.createElement('div');
  shape.className = 'splash-shape';
  shape.style.left = def.x;
  shape.style.top = def.y;

  const size = def.size;
  const color = def.color;

  if (def.shape === 'circle') {
    shape.style.width = size + 'px';
    shape.style.height = size + 'px';
    shape.style.borderRadius = '50%';
    shape.style.background = color;
    shape.style.opacity = '0.6';
  } else if (def.shape === 'square') {
    shape.style.width = size + 'px';
    shape.style.height = size + 'px';
    shape.style.background = color;
    shape.style.opacity = '0.5';
    shape.style.borderRadius = '6px';
  } else if (def.shape === 'triangle') {
    shape.style.width = '0';
    shape.style.height = '0';
    shape.style.borderLeft = (size / 2) + 'px solid transparent';
    shape.style.borderRight = (size / 2) + 'px solid transparent';
    shape.style.borderBottom = size + 'px solid ' + color;
    shape.style.background = 'none';
  } else if (def.shape === 'diamond') {
    shape.style.width = size + 'px';
    shape.style.height = size + 'px';
    shape.style.background = color;
    shape.style.transform = 'rotate(45deg)';
    shape.style.opacity = '0.5';
    shape.style.borderRadius = '4px';
  }

  return shape;
}
