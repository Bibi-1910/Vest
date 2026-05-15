// ── ShakthiVest Alerts Module ──
window.Alerts = (() => {
  const SETTINGS_KEY = 'sv_alert_settings';
  const LOG_KEY      = 'sv_alert_log';
  const SENT_KEY     = 'sv_alert_sent';   // prevent duplicate sends
  let monitorInterval = null;

  // ── SETTINGS ──
  function getSettings() {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch { return {}; }
  }

  function saveSettings(s) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }

  function isConfigured() {
    const s = getSettings();
    return !!(s.phone && s.apiKey);
  }

  // ── LOG ──
  function getLog() {
    try { return JSON.parse(localStorage.getItem(LOG_KEY)) || []; } catch { return []; }
  }

  function addLog(entry) {
    const log = getLog();
    log.unshift({ ...entry, time: Date.now() });
    if (log.length > 50) log.pop();
    localStorage.setItem(LOG_KEY, JSON.stringify(log));
  }

  // ── SEND WHATSAPP via CallMeBot ──
  async function sendWhatsApp(message) {
    const s = getSettings();
    if (!s.phone || !s.apiKey) {
      Toast.show('WhatsApp not configured. Go to Alerts settings.', 'error');
      return false;
    }
    const phone   = s.phone.replace(/\D/g, '');
    const encoded = encodeURIComponent(message);
    const url     = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encoded}&apikey=${s.apiKey}`;
    try {
      await fetch(url, { mode: 'no-cors' });
      addLog({ type: 'sent', msg: message.slice(0, 80), status: 'OK' });
      Toast.show('✅ WhatsApp alert sent!', 'success');
      return true;
    } catch (err) {
      addLog({ type: 'error', msg: message.slice(0, 80), status: err.message });
      Toast.show('❌ WhatsApp send failed. Check your number & API key.', 'error');
      return false;
    }
  }

  async function testAlert() {
    const msg = `🔔 ShakthiVest Test Alert\n\nHey Shakthivel! Your investment dashboard is live and working. 🚀\n\nTime: ${new Date().toLocaleString('en-IN')}`;
    return await sendWhatsApp(msg);
  }

  // ── PRICE DROP MONITOR ──
  async function checkAlerts() {
    const settings    = getSettings();
    const threshold   = parseFloat(settings.globalDropAlert) || 5;
    const investments = Portfolio.getAll();
    const sentKeys    = JSON.parse(localStorage.getItem(SENT_KEY) || '{}');
    const now         = Date.now();

    // Refresh prices for symbol-tracked investments
    const updated = await Promise.all(investments.map(async inv => {
      if (inv.symbol) {
        const data = await Market.fetchStockPrice(inv.symbol);
        if (data) { Portfolio.update(inv.id, { currentPrice: data.price }); return { ...inv, currentPrice: data.price }; }
      }
      return inv;
    }));

    const alerts = [];

    for (const inv of updated) {
      const { pnl, pct } = Portfolio.calcPnL(inv);
      const invThreshold = inv.alertThreshold || threshold;
      const sentKey = inv.id + '_drop';

      // Check if drop exceeds threshold
      if (pct <= -invThreshold) {
        // Don't resend same alert within 2 hours
        if (!sentKeys[sentKey] || now - sentKeys[sentKey] > 2 * 60 * 60 * 1000) {
          alerts.push({
            name: inv.name,
            pct: pct.toFixed(2),
            pnl: Market.fmtINR(Math.abs(pnl)),
            threshold: invThreshold
          });
          sentKeys[sentKey] = now;
        }
      } else {
        // Reset if price recovered
        delete sentKeys[sentKey];
      }
    }

    localStorage.setItem(SENT_KEY, JSON.stringify(sentKeys));

    // Send combined alert
    if (alerts.length > 0) {
      const lines = alerts.map(a =>
        `⚠️ ${a.name}: DOWN ${a.pct}% (Loss: ${a.pnl})`
      ).join('\n');

      const msg = `🚨 ShakthiVest LOSS ALERT 🚨\n\nHey Shakthivel! The following investments need attention:\n\n${lines}\n\n📊 Check your dashboard immediately!\nTime: ${new Date().toLocaleString('en-IN')}`;
      await sendWhatsApp(msg);
    }

    // Check market crash (Nifty drop > marketCrashAlert %)
    try {
      const mktData = await Market.fetchAll();
      const niftyChg = mktData?.nifty?.changePct || 0;
      const crashThreshold = parseFloat(settings.marketCrashAlert) || 2;
      const crashKey = 'market_crash';

      if (niftyChg <= -crashThreshold) {
        if (!sentKeys[crashKey] || now - sentKeys[crashKey] > 4 * 60 * 60 * 1000) {
          const msg = `📉 MARKET CRASH ALERT 📉\n\nHey Shakthivel! NIFTY 50 is DOWN ${Math.abs(niftyChg).toFixed(2)}% today.\n\nConsider:\n• Don't panic sell\n• Review your SIPs\n• Good time to buy more 💪\n\nTime: ${new Date().toLocaleString('en-IN')}`;
          await sendWhatsApp(msg);
          sentKeys[crashKey] = now;
          localStorage.setItem(SENT_KEY, JSON.stringify(sentKeys));
        }
      }
    } catch {}
  }

  function startMonitoring() {
    if (monitorInterval) clearInterval(monitorInterval);
    const s = getSettings();
    const freq = parseInt(s.checkFrequency) || 15; // minutes
    checkAlerts(); // immediate first check
    monitorInterval = setInterval(checkAlerts, freq * 60 * 1000);
    addLog({ type: 'info', msg: `Monitoring started (every ${freq} min)`, status: 'OK' });
    updateStatusUI(true);
  }

  function stopMonitoring() {
    if (monitorInterval) { clearInterval(monitorInterval); monitorInterval = null; }
    updateStatusUI(false);
  }

  function isMonitoring() { return monitorInterval !== null; }

  function updateStatusUI(active) {
    const dot  = document.getElementById('monitor-status-dot');
    const text = document.getElementById('monitor-status-text');
    if (dot)  dot.className  = 'status-dot ' + (active ? 'active' : 'inactive');
    if (text) text.textContent = active ? 'Monitoring Active' : 'Monitoring Paused';
  }

  function renderLog(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const log = getLog();
    if (log.length === 0) {
      container.innerHTML = '<div style="color:var(--text3);font-size:13px;padding:12px 0;">No alerts sent yet.</div>';
      return;
    }
    container.innerHTML = log.map(entry => {
      const typeMap = { sent: ['tag-teal','📤'], error: ['tag-red','❌'], info: ['tag-blue','ℹ️'] };
      const [cls, ico] = typeMap[entry.type] || ['tag-gray','📌'];
      return `<div class="alert-log-item">
        <span class="alert-time">${new Date(entry.time).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span>
        <span class="tag ${cls} alert-type">${ico} ${entry.type}</span>
        <span class="alert-msg">${entry.msg}</span>
      </div>`;
    }).join('');
  }

  return { getSettings, saveSettings, isConfigured, sendWhatsApp, testAlert, checkAlerts, startMonitoring, stopMonitoring, isMonitoring, renderLog };
})();
