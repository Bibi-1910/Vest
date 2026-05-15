// ── ShakthiVest Auth Module ──
window.Auth = (() => {
  const USERS = [
    { username: 'shakthivel', password: 'Shayamtce@26', displayName: 'Shakthivel', role: 'Investor · Age 21' }
  ];
  const SESSION_KEY = 'sv_session';

  function login(username, password) {
    const user = USERS.find(u => u.username === username && u.password === password);
    if (user) {
      const session = { username: user.username, displayName: user.displayName, role: user.role, loginTime: Date.now() };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return { ok: true, user: session };
    }
    return { ok: false, error: 'Invalid username or password.' };
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = 'index.html';
  }

  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
  }

  function checkAuth() {
    if (!getSession()) { window.location.href = 'index.html'; return false; }
    return true;
  }

  function injectUserUI() {
    const s = getSession();
    if (!s) return;
    document.querySelectorAll('.user-name').forEach(el => el.textContent = s.displayName);
    document.querySelectorAll('.user-role').forEach(el => el.textContent = s.role);
    document.querySelectorAll('.user-avatar').forEach(el => el.textContent = s.displayName[0].toUpperCase());
  }

  return { login, logout, getSession, checkAuth, injectUserUI };
})();
