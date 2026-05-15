// ── ShakthiVest Toast Utility ──
window.Toast = (() => {
  function ensureContainer() {
    let c = document.getElementById('toast-container');
    if (!c) { c = document.createElement('div'); c.id = 'toast-container'; c.className = 'toast-container'; document.body.appendChild(c); }
    return c;
  }

  function show(msg, type = 'info', duration = 3500) {
    const c = ensureContainer();
    const icons = { success: '✅', error: '❌', info: '💡' };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span>${icons[type] || '📌'}</span><span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(100%)'; t.style.transition = '0.3s'; setTimeout(() => t.remove(), 300); }, duration);
  }

  return { show };
})();
