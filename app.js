(function () {
  'use strict';
  const dialog = document.getElementById('share-dialog');
  const field = document.getElementById('share-url');
  const description = document.getElementById('share-description');
  const hint = document.getElementById('manual-hint');
  const toast = document.getElementById('toast');
  let toastTimer;
  const url = new URL(location.href);
  url.hash = '';
  const shareUrl = url.href;
  const isPreview = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  field.value = shareUrl;

  function announce(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('visible');
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 3200);
  }
  function manualShare() {
    description.textContent = isPreview
      ? '当前是本机预览地址。发布后，复制这里的网址，就能让朋友直接打开游戏库。'
      : '复制下面的网址，发给朋友就能分享游戏的快乐。';
    hint.textContent = '也可以长按或选中网址，手动复制。';
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
      field.focus();
      field.select();
    } else {
      // The standard prompt remains usable in browsers without <dialog> support.
      window.prompt('复制游戏库网址，分享给朋友：', shareUrl);
    }
  }
  async function copyLink() {
    if (!navigator.clipboard || !window.isSecureContext) return false;
    try {
      await navigator.clipboard.writeText(shareUrl);
      announce('网址已复制，发给朋友一起开心。');
      return true;
    } catch (_) {
      return false;
    }
  }
  async function share() {
    if (isPreview) {
      manualShare();
      return;
    }
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({title:'游戏库 · 贺义制作', text:'来小贺茶馆打一局四川麻将，或到小贺渔场出海捕鱼。打开即玩，纯属娱乐。', url:shareUrl});
        return;
      } catch (error) {
        // Closing the operating system's share sheet is an intentional cancel.
        if (error && error.name === 'AbortError') return;
      }
    }
    if (!(await copyLink())) manualShare();
  }
  document.querySelectorAll('[data-share]').forEach(button => button.addEventListener('click', share));
  document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
  document.getElementById('copy-link').addEventListener('click', async () => {
    if (await copyLink()) {
      dialog.close();
    } else {
      field.focus();
      field.select();
      field.setSelectionRange(0, field.value.length);
      hint.textContent = '网址已选中。请长按选择“复制”，或按 Ctrl+C（Mac：⌘C）。';
      announce('请手动复制已选中的网址。');
    }
  });
  field.addEventListener('click', () => field.select());
})();
