// ── ShakthiVest AI Suggestion Module ──
window.AISuggest = (() => {
  const API_URL = 'https://api.anthropic.com/v1/messages';
  const MODEL   = 'claude-sonnet-4-20250514';

  function getApiKey() { return localStorage.getItem('sv_anthropic_key') || ''; }
  function setApiKey(k) { localStorage.setItem('sv_anthropic_key', k); }

  // ── INVESTMENT SUGGESTION ──
  async function getSuggestion({ amount, risk, horizon, age = 21 }) {
    const key = getApiKey();
    if (!key) {
      return { ok: false, error: 'Add your Anthropic API key in Settings to enable AI suggestions.' };
    }

    const mktData = await Market.fetchAll().catch(() => Market.FALLBACK);
    const niftyChg = mktData?.nifty?.changePct?.toFixed(2) || '0';
    const goldPrice = mktData?.gold?.price?.toFixed(2) || '7850';
    const portfolio = Portfolio.getAll();
    const summary   = Portfolio.getSummary();

    const systemPrompt = `You are ShakthiVest, a personalized investment advisor for young Indian investors. You provide specific, actionable advice tailored to Indian markets (NSE/BSE, RBI-backed instruments, SEBI-regulated products).

Rules:
- Give concrete percentage splits that add up to 100%
- Mention specific Indian instruments (Nifty50 index fund, HDFC Balanced Fund, Sovereign Gold Bond, etc.)
- Use ₹ symbol for amounts
- Format your response with clear sections
- Be encouraging for a 21-year-old just starting
- Keep advice concise and practical
- Always warn about risks appropriately`;

    const userPrompt = `I am ${age} years old and want to invest ₹${amount.toLocaleString('en-IN')}.

Current market context:
- NIFTY 50 today: ${niftyChg}% change
- Gold price: ₹${goldPrice}/gram
- My existing portfolio value: ₹${summary.totalVal.toFixed(0)} (${portfolio.length} investments)

Investment preferences:
- Risk appetite: ${risk} (${risk === 'low' ? 'safety first' : risk === 'medium' ? 'balanced growth' : 'aggressive growth'})
- Time horizon: ${horizon}
- I am based in India (Chennai)

Please give me:
1. A specific % allocation split for my ₹${amount.toLocaleString('en-IN')}
2. Exact instruments/funds to use for each bucket
3. Monthly SIP amounts if applicable
4. One key tip for my situation
5. One risk to watch out for

Format each allocation as: [CATEGORY] | [%] | [₹AMOUNT] | [SPECIFIC INSTRUMENT]`;

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: MODEL, max_tokens: 1000, system: systemPrompt, messages: [{ role: 'user', content: userPrompt }] })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { ok: false, error: err?.error?.message || `API error ${res.status}` };
      }

      const data = await res.json();
      const text = data?.content?.[0]?.text || '';
      return { ok: true, text };
    } catch (err) {
      return { ok: false, error: 'Network error: ' + err.message };
    }
  }

  // ── PORTFOLIO ANALYSIS ──
  async function analyzePortfolio() {
    const key = getApiKey();
    if (!key) return { ok: false, error: 'Add your Anthropic API key in Settings.' };

    const portfolio = Portfolio.getAll();
    if (portfolio.length === 0) return { ok: false, error: 'Add some investments first.' };

    const summary = Portfolio.getSummary();
    const items   = portfolio.map(inv => {
      const { pct } = Portfolio.calcPnL(inv);
      return `${inv.name} (${inv.type}): ${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
    }).join('\n');

    const userPrompt = `Analyze my current investment portfolio as a 21-year-old Indian investor:

Portfolio Summary:
- Total invested: ₹${summary.totalCost.toFixed(0)}
- Current value: ₹${summary.totalVal.toFixed(0)}
- Total P&L: ${summary.totalPnL >= 0 ? '+' : ''}₹${summary.totalPnL.toFixed(0)} (${summary.totalPct.toFixed(2)}%)

Individual investments:
${items}

Please provide:
1. Portfolio health assessment (1-10 score)
2. What's working well
3. What needs attention or rebalancing
4. One specific action I should take this month
5. Am I diversified enough for my age?

Keep it concise and honest.`;

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: MODEL, max_tokens: 800, messages: [{ role: 'user', content: userPrompt }] })
      });
      const data = await res.json();
      return { ok: true, text: data?.content?.[0]?.text || '' };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // ── RENDER SUGGESTION OUTPUT ──
  function renderText(containerId, text) {
    const el = document.getElementById(containerId);
    if (!el) return;
    // Parse allocation lines like [CATEGORY] | [%] | [₹AMOUNT] | [INSTRUMENT]
    const lines = text.split('\n');
    let html = '';
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) { html += '<br>'; return; }
      // Allocation line detection
      if (trimmed.includes('|') && trimmed.match(/\d+%/)) {
        const parts = trimmed.split('|').map(p => p.trim());
        if (parts.length >= 3) {
          const colorMap = { gold: '#F5C518', mutual: '#00D4AA', stock: '#4D8BFF', fd: '#A78BFA', ppf: '#34D399', crypto: '#FB923C', debt: '#94A3B8', equity: '#00D4AA', index: '#00D4AA' };
          const cat  = parts[0].replace(/[\[\]]/g, '');
          const pct  = parts[1];
          const amt  = parts[2];
          const inst = parts[3] || '';
          const key  = Object.keys(colorMap).find(k => cat.toLowerCase().includes(k)) || 'gold';
          const col  = colorMap[key] || '#4D8BFF';
          const pctNum = parseFloat(pct) || 0;
          html += `<div class="alloc-row" style="margin:6px 0">
            <span class="alloc-label" style="font-weight:500;color:var(--text)">${cat}</span>
            <div class="alloc-bar-wrap"><div class="alloc-fill" style="width:${pctNum}%;background:${col}"></div></div>
            <span class="alloc-pct">${pct}</span>
            <span class="alloc-amt" style="min-width:70px">${amt}</span>
          </div>
          ${inst ? `<div style="font-size:11px;color:var(--text3);margin-left:150px;margin-top:-4px;margin-bottom:6px;">→ ${inst}</div>` : ''}`;
          return;
        }
      }
      // Headers
      if (trimmed.match(/^\d+\./) || trimmed.startsWith('**') || trimmed.startsWith('##')) {
        html += `<div style="font-weight:600;color:var(--gold);margin-top:12px;margin-bottom:4px;font-size:13px;">${trimmed.replace(/\*\*/g,'').replace(/##/g,'').replace(/\d+\./,'').trim()}</div>`;
        return;
      }
      // Bullet points
      if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
        html += `<div style="color:var(--text2);font-size:13px;padding-left:12px;margin:3px 0;">• ${trimmed.slice(1).trim()}</div>`;
        return;
      }
      html += `<div style="color:var(--text2);font-size:13px;margin:3px 0;line-height:1.6">${trimmed}</div>`;
    });
    el.innerHTML = html;
  }

  return { getSuggestion, analyzePortfolio, renderText, getApiKey, setApiKey };
})();
