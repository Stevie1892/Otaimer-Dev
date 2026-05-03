import { createSplashScreen } from './SplashScreen.js';

export function createNoticeScreen(onConfirm) {
  const el = document.createElement('div');
  el.style.cssText = `
    position: fixed; inset: 0; z-index: 1000;
    background: var(--bg-primary); color: var(--text-primary);
    display: flex; flex-direction: column;
    font-size: 0.95rem; line-height: 1.8;
  `;

  const scroll = document.createElement('div');
  scroll.style.cssText = 'flex:1;overflow-y:auto;padding:24px 20px 16px;-webkit-overflow-scrolling:touch;';

  const title = document.createElement('h2');
  title.style.cssText = 'font-size:1.2rem;margin-bottom:16px;text-align:center;color:var(--accent);';
  title.textContent = '用户须知';

  const content = document.createElement('div');
  content.style.cssText = 'white-space:pre-line;color:var(--text-secondary);';
  content.textContent = `感谢您使用我编写的计时器应用程序，本应用程序由 DeepSeek V4 Pro 辅助编写。
请您在使用过程中了解并做到以下几点：

1，本应用完全免费。如果您是通过付费方式获得本应用，请积极采取相应措施维护自身权益。
2，本应用目前仍处于开发阶段，部分功能虽已经过严格测试，但仍不确保做到完美。如遇使用问题，请积极反馈。
3，欢迎对本应用提出优化和功能建议，但禁止对本应用进行任何形式的有偿传播。
4，本应用所获取的权限仅限于联网和震动权限，不会读取与保存权限外的任何个人数据，请放心使用。

如有问题或建议，请通过以下方式反馈：
  邮箱：lzyinter@outlook.com
  项目 GitHub：https://github.com/Stevie1892/Otaimer-Dev`;

  scroll.appendChild(title);
  scroll.appendChild(content);
  el.appendChild(scroll);

  const footer = document.createElement('div');
  footer.style.cssText = 'padding:16px 20px;padding-bottom:max(16px,env(safe-area-inset-bottom));border-top:1px solid rgba(255,255,255,0.06);';

  const btn = document.createElement('button');
  btn.style.cssText = `
    width:100%;height:50px;border-radius:25px;
    background:var(--accent);color:#fff;font-size:1rem;font-weight:600;
    transition: filter 0.2s;
  `;
  btn.textContent = '我知道了，开始使用';
  btn.addEventListener('pointerup', (e) => {
    e.stopPropagation();
    el.remove();
    onConfirm();
  });

  footer.appendChild(btn);
  el.appendChild(footer);

  return el;
}
