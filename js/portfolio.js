// ── ShakthiVest Portfolio Module ──
window.Portfolio = (() => {
  const KEY = 'sv_portfolio';

  const TYPE_META = {
    stock:      { label: 'Stock',         icon: '📈', color: '#4D8BFF' },
    mutualfund: { label: 'Mutual Fund',   icon: '📊', color: '#00D4AA' },
    gold:       { label: 'Gold',          icon: '🥇', color: '#F5C518' },
    fd:         { label: 'Fixed Deposit', icon: '🏦', color: '#A78BFA' },
    ppf:        { label: 'PPF / NPS',     icon: '🏛️', color: '#34D399' },
    crypto:     { label: 'Crypto',        icon: '₿',  color: '#FB923C' },
  };

  function uid() { return 'sv_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7); }

  function getAll() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
  }

  function save(list) { localStorage.setItem(KEY, JSON.stringify(list)); }

  function add(inv) {
    const list = getAll();
    const item = { ...inv, id: uid(), addedAt: Date.now(), currentPrice: inv.buyPrice };
    list.push(item);
    save(list);
    return item;
  }

  function update(id, changes) {
    const list = getAll().map(i => i.id === id ? { ...i, ...changes } : i);
    save(list);
  }

  function remove(id) { save(getAll().filter(i => i.id !== id)); }

  function getById(id) { return getAll().find(i => i.id === id); }

  function calcPnL(inv) {
    const cur  = inv.currentPrice || inv.buyPrice;
    const cost = inv.buyPrice * inv.units;
    const val  = cur * inv.units;
    const pnl  = val - cost;
    const pct  = cost > 0 ? (pnl / cost) * 100 : 0;
    return { cost, val, pnl, pct };
  }

  function getSummary() {
    const list = getAll();
    let totalCost = 0, totalVal = 0;
    list.forEach(inv => {
      const { cost, val } = calcPnL(inv);
      totalCost += cost;
      totalVal  += val;
    });
    const totalPnL = totalVal - totalCost;
    const totalPct = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;
    return { totalCost, totalVal, totalPnL, totalPct, count: list.length };
  }

  // Update current prices from market data
  async function refreshPrices() {
    const list = getAll();
    const updated = await Promise.all(list.map(async inv => {
      if (inv.symbol) {
        const data = await Market.fetchStockPrice(inv.symbol);
        if (data) return { ...inv, currentPrice: data.price, lastRefreshed: Date.now() };
      }
      return inv;
    }));
    save(updated);
    return updated;
  }

  // ── RENDER TABLE ──
  function renderTable(containerId, filter = 'all') {
    const container = document.getElementById(containerId);
    if (!container) return;
    let list = getAll();
    if (filter !== 'all') list = list.filter(i => i.type === filter);

    if (list.length === 0) {
      container.innerHTML = `<div class="empty-state">
        <div class="empty-icon">📭</div>
        <div class="empty-text">No investments yet. Add your first one!</div>
        <button class="btn btn-primary btn-sm" onclick="openAddModal()">+ Add Investment</button>
      </div>`;
      return;
    }

    const rows = list.map(inv => {
      const { cost, val, pnl, pct } = calcPnL(inv);
      const isGain = pnl >= 0;
      const meta = TYPE_META[inv.type] || TYPE_META.stock;
      const dateStr = new Date(inv.buyDate || inv.addedAt).toLocaleDateString('en-IN');
      return `<tr>
        <td>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:18px;">${meta.icon}</span>
            <div>
              <div style="font-weight:500;color:var(--text)">${inv.name}</div>
              <div style="font-size:11px;color:var(--text3)">${inv.symbol || meta.label}</div>
            </div>
          </div>
        </td>
        <td><span class="tag" style="background:${meta.color}18;color:${meta.color}">${meta.label}</span></td>
        <td class="mono">${inv.units} ${inv.unitLabel || 'units'}</td>
        <td class="mono">₹${inv.buyPrice.toLocaleString('en-IN', {maximumFractionDigits:2})}</td>
        <td class="mono">₹${(inv.currentPrice||inv.buyPrice).toLocaleString('en-IN', {maximumFractionDigits:2})}</td>
        <td class="mono">${Market.fmtINR(val)}</td>
        <td class="mono ${isGain ? 'gain-text' : 'loss-text'}">${isGain?'+':''}${Market.fmtINR(pnl)}<br>
          <span style="font-size:10px">${isGain?'+':''}${pct.toFixed(2)}%</span>
        </td>
        <td>
          <span class="tag ${inv.alertThreshold ? 'tag-teal' : 'tag-gray'}">
            ${inv.alertThreshold ? '🔔 ' + inv.alertThreshold + '%' : 'No alert'}
          </span>
        </td>
        <td style="font-size:12px;color:var(--text3)">${dateStr}</td>
        <td>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-secondary btn-sm btn-icon" onclick="openEditModal('${inv.id}')" title="Edit">✏️</button>
            <button class="btn btn-danger btn-sm btn-icon" onclick="Portfolio.deleteAndRefresh('${inv.id}')" title="Delete">🗑️</button>
          </div>
        </td>
      </tr>`;
    }).join('');

    container.innerHTML = `<div class="table-wrap">
      <table class="data-table">
        <thead><tr>
          <th>Investment</th><th>Type</th><th>Units</th>
          <th>Buy Price</th><th>Cur. Price</th><th>Value</th>
          <th>P&L</th><th>Alert</th><th>Date</th><th>Actions</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }

  function deleteAndRefresh(id) {
    if (confirm('Delete this investment?')) {
      remove(id);
      if (window.refreshPortfolioPage) window.refreshPortfolioPage();
    }
  }

  // ── ALLOCATION BREAKDOWN ──
  function renderAllocation(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const list = getAll();
    if (list.length === 0) { container.innerHTML = '<div style="color:var(--text3);font-size:13px;">No investments to show.</div>'; return; }
    const byType = {};
    let total = 0;
    list.forEach(inv => {
      const { val } = calcPnL(inv);
      byType[inv.type] = (byType[inv.type] || 0) + val;
      total += val;
    });
    const COLORS = { stock:'#4D8BFF', mutualfund:'#00D4AA', gold:'#F5C518', fd:'#A78BFA', ppf:'#34D399', crypto:'#FB923C' };
    container.innerHTML = Object.entries(byType).map(([type, val]) => {
      const meta = TYPE_META[type] || { label: type, icon: '💼' };
      const pct = total > 0 ? (val / total) * 100 : 0;
      const color = COLORS[type] || '#888';
      return `<div class="alloc-row">
        <span class="alloc-label">${meta.icon} ${meta.label}</span>
        <div class="alloc-bar-wrap"><div class="alloc-fill" style="width:${pct}%;background:${color}"></div></div>
        <span class="alloc-pct">${pct.toFixed(1)}%</span>
        <span class="alloc-amt">${Market.fmtINR(val)}</span>
      </div>`;
    }).join('');
  }

  return { getAll, add, update, remove, getById, calcPnL, getSummary, refreshPrices, renderTable, renderAllocation, deleteAndRefresh, TYPE_META };
})();
