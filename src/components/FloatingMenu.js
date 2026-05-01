export function createFloatingMenu(items, position) {
  const existing = document.querySelector('.floating-menu');
  if (existing) existing.remove();

  const menu = document.createElement('div');
  menu.className = 'floating-menu';

  items.forEach(item => {
    const menuItem = document.createElement('button');
    menuItem.className = 'floating-menu-item';
    if (item.danger) menuItem.classList.add('danger');

    if (item.icon) {
      const icon = document.createElement('span');
      icon.className = 'menu-icon';
      icon.textContent = item.icon;
      menuItem.appendChild(icon);
    }

    const label = document.createElement('span');
    label.textContent = item.label;
    if (item.bold) {
      label.style.fontWeight = '700';
      label.style.fontSize = '0.95rem';
    }
    menuItem.appendChild(label);

    menuItem.addEventListener('pointerup', (e) => {
      e.stopPropagation();
      e.preventDefault();
      removeMenu();
      item.onClick?.();
    });

    menu.appendChild(menuItem);
  });

  // 先隐藏定位防止瞬闪，定位完成再显示
  menu.style.opacity = '0';
  document.body.appendChild(menu);

  setTimeout(() => {
    const menuRect = menu.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    let x = position.x;
    let y = position.y;

    if (x + menuRect.width > viewportW - 10) {
      x = viewportW - menuRect.width - 10;
    }
    if (y + menuRect.height > viewportH - 10) {
      y = position.y - menuRect.height - 10;
    }
    if (x < 10) x = 10;
    if (y < 10) y = 10;

    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    // 定位完成，菜单与遮罩同步显示
    menu.style.opacity = '1';
    mask.style.opacity = '1';
  }, 0);

  const mask = document.createElement('div');
  mask.style.cssText = 'position:fixed;inset:0;z-index:149;';
  mask.style.opacity = '0';
  mask.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    removeMenu();
  });
  document.body.appendChild(mask);

  function removeMenu() {
    menu.remove();
    mask.remove();
  }

  return { remove: removeMenu };
}
