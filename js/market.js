// ── ShakthiVest Market Module ──
window.Market = (() => {
  const PROXY = 'https://api.allorigins.win/raw?url=';
  const YF = 'https://query1.finance.yahoo.com/v8/finance/chart/';

  // Symbols: NSE index, BSE index, Gold (USD), Gold INR, USD/INR
  const SYMBOLS = {
    nifty:   { sym: '%5ENSEI',    label: 'NIFTY 50',  fmt: 'idx' },
    sensex:  { sym: '%5EBSESN',   label: 'SENSEX',    fmt: 'idx' },
    gold:    { sym: 'XAUINR%3DX', label: 'GOLD/g',    fmt: 'gold' },
    usdinr:  { sym: 'USDINR%3DX', label: 'USD/INR',   fmt: 'fx' },
  };

  let cache = {};
  let lastFetch = 0;

  // Fallback realistic values (used if API fails)
  const FALLBACK = {
    nifty:  { price: 24650.25, change: 112.40, changePct: 0.46 },
    sensex: { price: 81230.15, change: 380.20, changePct: 0.47 },
    gold:   { price: 7850.50,  change: 42.30,  changePct: 0.54 },  // per gram INR
    usdinr: { price: 83.52,    change: -0.12,  changePct: -0.14 },
  };

  async function fetchOne(key, symbolObj) {
    const url = `${YF}${symbolObj.sym}?range=2d&interval=1d`;
    try {
      const res = await fetch(PROXY + encodeURIComponent(url));
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const result = data?.chart?.result?.[0];
      if (!result) throw new Error('No result');
      const quotes = result.indicators?.quote?.[0];
      const closes = quotes?.close?.filter(v => v != null);
      if (!closes || closes.length < 2) throw new Error('No closes');
      const price = closes[closes.length - 1];
      const prev  = closes[closes.length - 2];
      const change = price - prev;
      const changePct = (change / prev) * 100;
      // Gold: convert from oz to gram (1 troy oz = 31.1035g), price is already in INR
      const displayPrice = (symbolObj.fmt === 'gold')
        ? price / 31.1035
        : price;
      return { price: displayPrice, change: (symbolObj.fmt === 'gold') ? change / 31.1035 : change, changePct };
    } catch (e) {
      console.warn(`Market fetch failed for ${key}:`, e.message);
      return null;
    }
  }

  async function fetchAll() {
    // Throttle: max once per 5 min
    if (Date.now() - lastFetch < 5 * 60 * 1000 && Object.keys(cache).length > 0) return cache;
    const results = await Promise.all(
      Object.entries(SYMBOLS).map(async ([key, obj]) => {
        const data = await fetchOne(key, obj);
        return [key, data || FALLBACK[key]];
      })
    );
    cache = Object.fromEntries(results);
    lastFetch = Date.now();
    return cache;
  }

  async function fetchStockPrice(symbol) {
    // symbol like "RELIANCE.NS", "HDFCBANK.NS", "GOLDBEES.NS"
    const encodedSym = encodeURIComponent(symbol);
    const url = `${YF}${encodedSym}?range=2d&interval=1d`;
    try {
      const res = await fetch(PROXY + encodeURIComponent(url));
      const data = await res.json();
      const result = data?.chart?.result?.[0];
      const closes = result?.indicators?.quote?.[0]?.close?.filter(v => v != null);
      if (!closes || closes.length < 1) return null;
      const price = closes[closes.length - 1];
      const prev  = closes.length > 1 ? closes[closes.length - 2] : price;
      return { price, change: price - prev, changePct: ((price - prev) / prev) * 100 };
    } catch {
      return null;
    }
  }

  function fmt(val, type) {
    if (type === 'idx')  return '₹' + val.toLocaleString('en-IN', { maximumFractionDigits: 2 });
    if (type === 'gold') return '₹' + val.toLocaleString('en-IN', { maximumFractionDigits: 2 }) + '/g';
    if (type === 'fx')   return '₹' + val.toFixed(2);
    return val.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }

  function fmtINR(val) {
    if (val >= 1e7) return '₹' + (val / 1e7).toFixed(2) + ' Cr';
    if (val >= 1e5) return '₹' + (val / 1e5).toFixed(2) + ' L';
    return '₹' + val.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }

  function updateMarketCards(data) {
    const keys = Object.keys(SYMBOLS);
    keys.forEach(key => {
      const d = data[key];
      const obj = SYMBOLS[key];
      if (!d) return;
      const el = document.getElementById('mkt-' + key);
      if (!el) return;
      el.querySelector('.mkt-val').textContent = fmt(d.price, obj.fmt);
      const chgEl = el.querySelector('.mkt-chg');
      const isUp = d.change >= 0;
      chgEl.textContent = `${isUp ? '+' : ''}${d.change.toFixed(2)} (${isUp ? '+' : ''}${d.changePct.toFixed(2)}%)`;
      chgEl.className = 'mkt-chg ' + (isUp ? 'up' : 'down');
      const dot = el.querySelector('.ticker-dot');
      if (dot) dot.className = 'ticker-dot ' + (isUp ? '' : 'down');
    });
  }

  function updateTickerStrip(data) {
    const strip = document.getElementById('ticker-strip');
    if (!strip) return;
    strip.innerHTML = Object.entries(SYMBOLS).map(([key, obj]) => {
      const d = data[key] || FALLBACK[key];
      const isUp = d.change >= 0;
      return `<div class="ticker-item">
        <span class="ticker-dot ${isUp ? '' : 'down'}"></span>
        <span class="ticker-name">${obj.label}</span>
        <span class="ticker-val">${fmt(d.price, obj.fmt)}</span>
        <span class="ticker-chg ${isUp ? 'up' : 'down'}">${isUp ? '+' : ''}${d.changePct.toFixed(2)}%</span>
      </div>`;
    }).join('');
  }

  async function init() {
    const data = await fetchAll();
    updateMarketCards(data);
    updateTickerStrip(data);
    return data;
  }

  // Auto-refresh every 5 minutes
  function startAutoRefresh() {
    setInterval(async () => {
      lastFetch = 0; // force refresh
      const data = await fetchAll();
      updateMarketCards(data);
      updateTickerStrip(data);
    }, 5 * 60 * 1000);
  }

  return { init, fetchAll, fetchStockPrice, fmtINR, startAutoRefresh, FALLBACK };
})();
