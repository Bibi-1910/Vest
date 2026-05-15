# 💰 ShakthiVest — Personal Investment Dashboard

Your complete personal investment command centre, built for Shakthivel.

---

## 🚀 Quick Start

1. **Open `index.html`** in any modern browser (Chrome/Edge/Firefox)
2. **Login** with:
   - Username: `shakthivel`
   - Password: `Invest@21`
3. Go to **Dashboard** and start adding investments!

---

## 📁 File Structure

```
ShakthiVest/
├── index.html        ← Login page
├── dashboard.html    ← Main dashboard + AI suggester
├── portfolio.html    ← Full portfolio manager
├── alerts.html       ← WhatsApp alert setup
├── settings.html     ← API keys, profile, data
├── css/
│   └── style.css     ← All styles (dark theme)
└── js/
    ├── auth.js       ← Login / session
    ├── market.js     ← Live market data (NSE/Gold/FX)
    ├── portfolio.js  ← Investment CRUD
    ├── alerts.js     ← WhatsApp via CallMeBot
    ├── ai-suggest.js ← Claude AI suggestions
    └── toast.js      ← Notifications
```

---

## 🤖 Enable AI Suggestions (Claude)

1. Go to **Settings → Anthropic API Key**
2. Get a free key from: https://console.anthropic.com
3. Paste it and click **Save Key**
4. Now use **Dashboard → AI Investment Suggester** for personalised advice!

---

## 📲 Enable WhatsApp Alerts (Free via CallMeBot)

1. Save **+34 644 64 07 35** in your WhatsApp contacts as *CallMeBot*
2. Send exactly this message to that number:
   `I allow callmebot to send me messages`
3. You'll receive your **API key** in a reply (e.g. `1234567`)
4. Go to **Alerts** in ShakthiVest
5. Enter your phone: `91XXXXXXXXXX` (91 = India code, no +)
6. Enter your API key, then click **Save Settings**
7. Click **Send Test Alert** to confirm it works
8. Click **Start Monitoring** — done! 🎉

### What triggers a WhatsApp alert?
- Any investment drops more than your set % threshold
- Nifty 50 falls more than 2% in a single day
- Manual gold price updates
- Test alerts

---

## 📊 Features

| Feature | Description |
|---|---|
| 🏠 Dashboard | Market ticker, portfolio summary, AI suggest |
| 📊 Portfolio | Add/edit/delete investments with live P&L |
| 🔔 Alerts | WhatsApp drop alerts, market crash alerts |
| 🤖 AI Suggest | Claude gives personalised investment splits |
| 🥧 Allocation | Visual breakdown by asset type |
| 💾 Export/Import | Backup your portfolio as JSON |
| 📈 Live Prices | Auto-fetches NSE/Gold/FX every 5 minutes |

---

## 🔐 Security Notes

- All data is stored **locally in your browser** (localStorage)
- Your API key is stored locally — never sent to any external server
- This app makes requests to:
  - `api.allorigins.win` (CORS proxy for Yahoo Finance)
  - `query1.finance.yahoo.com` (market prices)
  - `api.anthropic.com` (AI suggestions — requires your key)
  - `api.callmebot.com` (WhatsApp alerts)

---

## 📱 Supported Investment Types

- 📈 **Stocks** — NSE/BSE listed (e.g. RELIANCE.NS)
- 📊 **Mutual Funds** — SIP tracking
- 🥇 **Gold** — ETF, SGB, Digital Gold
- 🏦 **Fixed Deposit** — FD/RD tracking
- 🏛️ **PPF / NPS** — Long-term retirement
- ₿ **Crypto** — BTC, ETH, etc.

---

## 💡 Tips for Shakthivel (Age 21)

1. **Start SIP immediately** — ₹500/month in Nifty index fund
2. **Keep 15% in Gold** — SGB is best for long-term
3. **Emergency fund first** — 6 months expenses in FD
4. **Use ELSS** for 80C tax benefit + market returns
5. **Don't panic sell** — enable market crash alerts to stay informed

---

*ShakthiVest v1.0 — Built with ❤️ for your financial freedom*
