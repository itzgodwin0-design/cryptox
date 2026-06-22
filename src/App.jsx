import { useState, useEffect, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const COINS = ["bitcoin", "ethereum", "solana", "binancecoin", "ripple", "cardano", "dogecoin", "polkadot"];
const COIN_SYMBOLS = {
  bitcoin: "BTC", ethereum: "ETH", solana: "SOL", binancecoin: "BNB",
  ripple: "XRP", cardano: "ADA", dogecoin: "DOGE", polkadot: "DOT"
};
const COIN_ICONS = {
  bitcoin: "₿", ethereum: "Ξ", solana: "◎", binancecoin: "B",
  ripple: "✕", cardano: "₳", dogecoin: "Ð", polkadot: "●"
};

const fmt = (n, d = 2) => n == null ? "—" : Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtUSD = (n) => n == null ? "—" : "$" + fmt(n);
const fmtPct = (n) => n == null ? "—" : (n >= 0 ? "+" : "") + fmt(n) + "%";

// ── Colour palette ──────────────────────────────────────────────
const C = {
  bg:      "#0a0e1a",
  panel:   "#111827",
  border:  "#1f2d45",
  accent:  "#3b82f6",
  green:   "#22c55e",
  red:     "#ef4444",
  gold:    "#f59e0b",
  text:    "#e2e8f0",
  muted:   "#64748b",
  chart:   "#3b82f6",
};

const styles = {
  app: {
    minHeight: "100vh", background: C.bg, color: C.text,
    fontFamily: "'Inter', 'Segoe UI', sans-serif", fontSize: 14,
  },
  nav: {
    background: C.panel, borderBottom: `1px solid ${C.border}`,
    padding: "0 24px", display: "flex", alignItems: "center",
    justifyContent: "space-between", height: 60, position: "sticky", top: 0, zIndex: 100,
  },
  logo: { fontSize: 20, fontWeight: 800, color: C.accent, letterSpacing: -0.5 },
  navTabs: { display: "flex", gap: 4 },
  tab: (active) => ({
    padding: "6px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 500,
    background: active ? C.accent : "transparent",
    color: active ? "#fff" : C.muted,
    border: "none", fontSize: 14, transition: "all .2s",
  }),
  badge: {
    background: "#16a34a22", color: C.green, border: `1px solid ${C.green}44`,
    borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600,
  },
  main: { padding: "24px", maxWidth: 1400, margin: "0 auto" },
  grid3: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 24 },
  grid2: { display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 24 },
  card: {
    background: C.panel, border: `1px solid ${C.border}`,
    borderRadius: 16, padding: 20,
  },
  cardTitle: { fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 },
  statVal: { fontSize: 28, fontWeight: 800, marginBottom: 4 },
  statSub: { fontSize: 12, color: C.muted },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "8px 12px", fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", borderBottom: `1px solid ${C.border}` },
  td: { padding: "12px 12px", borderBottom: `1px solid ${C.border}18`, verticalAlign: "middle" },
  btn: (color = C.accent) => ({
    background: color, color: "#fff", border: "none", borderRadius: 8,
    padding: "8px 18px", cursor: "pointer", fontWeight: 600, fontSize: 13,
    transition: "opacity .2s",
  }),
  input: {
    background: "#1e293b", border: `1px solid ${C.border}`, color: C.text,
    borderRadius: 8, padding: "8px 12px", fontSize: 14, width: "100%", outline: "none",
  },
  pct: (v) => ({ color: v >= 0 ? C.green : C.red, fontWeight: 700 }),
  pill: (v) => ({
    background: v >= 0 ? "#16a34a22" : "#dc262622",
    color: v >= 0 ? C.green : C.red,
    border: `1px solid ${v >= 0 ? C.green : C.red}44`,
    borderRadius: 20, padding: "2px 8px", fontSize: 12, fontWeight: 700,
  }),
  walletBox: {
    background: "#1e293b", border: `2px dashed ${C.border}`,
    borderRadius: 16, padding: 32, textAlign: "center",
  },
  coinIcon: (color = C.accent) => ({
    width: 36, height: 36, borderRadius: "50%",
    background: color + "22", border: `1px solid ${color}44`,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 16, fontWeight: 800, color, flexShrink: 0,
  }),
  row: { display: "flex", alignItems: "center", gap: 10 },
};

const ICON_COLORS = {
  bitcoin: "#f59e0b", ethereum: "#818cf8", solana: "#a78bfa",
  binancecoin: "#f59e0b", ripple: "#38bdf8", cardano: "#60a5fa",
  dogecoin: "#fbbf24", polkadot: "#e879f9",
};

// ── Sparkline (7-day from history) ──────────────────────────────
function Sparkline({ data, positive }) {
  if (!data || data.length < 2) return <span style={{ color: C.muted }}>—</span>;
  const pts = data.map((v, i) => ({ i, v }));
  const min = Math.min(...data), max = Math.max(...data);
  const norm = (v) => 30 - ((v - min) / (max - min + 0.001)) * 28;
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${(p.i / (pts.length - 1)) * 80},${norm(p.v)}`).join(" ");
  return (
    <svg width="80" height="30" viewBox="0 0 80 30">
      <path d={path} fill="none" stroke={positive ? C.green : C.red} strokeWidth="1.5" />
    </svg>
  );
}

// ── Top stat card ────────────────────────────────────────────────
function StatCard({ title, value, sub, color }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>{title}</div>
      <div style={{ ...styles.statVal, color: color || C.text }}>{value}</div>
      {sub && <div style={styles.statSub}>{sub}</div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [coins, setCoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCoin, setSelectedCoin] = useState("bitcoin");
  const [chartData, setChartData] = useState([]);
  const [chartDays, setChartDays] = useState(7);
  const [portfolio, setPortfolio] = useState([]);
  const [addCoin, setAddCoin] = useState("bitcoin");
  const [addAmt, setAddAmt] = useState("");
  const [addPrice, setAddPrice] = useState("");
  const [wallet, setWallet] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("market_cap_rank");
  const [lastUpdated, setLastUpdated] = useState(null);

  // ── Fetch market data ──────────────────────────────────────────
  const fetchCoins = useCallback(async () => {
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${COINS.join(",")}&order=market_cap_desc&sparkline=true&price_change_percentage=1h,24h,7d`
      );
      if (!res.ok) throw new Error("Rate limited — retrying shortly");
      const data = await res.json();
      setCoins(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCoins(); const t = setInterval(fetchCoins, 30000); return () => clearInterval(t); }, [fetchCoins]);

  // ── Fetch chart ────────────────────────────────────────────────
  useEffect(() => {
    async function fetchChart() {
      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/coins/${selectedCoin}/market_chart?vs_currency=usd&days=${chartDays}`
        );
        const data = await res.json();
        if (data.prices) {
          setChartData(data.prices.map(([ts, price]) => ({
            date: new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            price: +price.toFixed(2),
          })));
        }
      } catch {}
    }
    fetchChart();
  }, [selectedCoin, chartDays]);

  // ── Portfolio helpers ──────────────────────────────────────────
  const addToPortfolio = () => {
    if (!addAmt || isNaN(addAmt)) return;
    const coinData = coins.find(c => c.id === addCoin);
    const buyPrice = addPrice ? parseFloat(addPrice) : coinData?.current_price;
    setPortfolio(p => [...p, {
      id: addCoin, symbol: COIN_SYMBOLS[addCoin],
      amount: parseFloat(addAmt), buyPrice,
      addedAt: new Date().toLocaleDateString(),
    }]);
    setAddAmt(""); setAddPrice("");
  };
  const removeFromPortfolio = (i) => setPortfolio(p => p.filter((_, idx) => idx !== i));

  const portfolioRows = portfolio.map(h => {
    const live = coins.find(c => c.id === h.id);
    const currentPrice = live?.current_price ?? h.buyPrice;
    const value = h.amount * currentPrice;
    const cost = h.amount * h.buyPrice;
    const pnl = value - cost;
    const pnlPct = ((pnl / cost) * 100);
    return { ...h, currentPrice, value, cost, pnl, pnlPct, change24h: live?.price_change_percentage_24h };
  });
  const totalValue = portfolioRows.reduce((s, r) => s + r.value, 0);
  const totalPnl = portfolioRows.reduce((s, r) => s + r.pnl, 0);

  // ── Wallet connect (MetaMask) ──────────────────────────────────
  const connectWallet = async () => {
    if (!window.ethereum) { alert("MetaMask not found. Please install MetaMask extension."); return; }
    setWalletLoading(true);
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const balanceHex = await window.ethereum.request({ method: "eth_getBalance", params: [accounts[0], "latest"] });
      const balanceETH = parseInt(balanceHex, 16) / 1e18;
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      setWallet({ address: accounts[0], balance: balanceETH, chainId });
    } catch (e) { alert("Connection cancelled."); }
    setWalletLoading(false);
  };

  const disconnectWallet = () => setWallet(null);

  // ── Market summary ─────────────────────────────────────────────
  const totalMktCap = coins.reduce((s, c) => s + (c.market_cap || 0), 0);
  const totalVol = coins.reduce((s, c) => s + (c.total_volume || 0), 0);
  const gainers = coins.filter(c => c.price_change_percentage_24h > 0).length;

  const filteredCoins = coins
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.symbol.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "price") return b.current_price - a.current_price;
      if (sortBy === "change") return b.price_change_percentage_24h - a.price_change_percentage_24h;
      if (sortBy === "volume") return b.total_volume - a.total_volume;
      return (a.market_cap_rank || 99) - (b.market_cap_rank || 99);
    });

  const selCoin = coins.find(c => c.id === selectedCoin);

  // ══════════════════════════════════════════════════════════════
  return (
    <div style={styles.app}>
      {/* NAV */}
      <nav style={styles.nav}>
        <div style={styles.logo}>⬡ CryptoX</div>
        <div style={styles.navTabs}>
          {["dashboard", "markets", "chart", "portfolio", "wallet"].map(t => (
            <button key={t} style={styles.tab(tab === t)} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div style={styles.badge}>
          {lastUpdated ? `Live · ${lastUpdated.toLocaleTimeString()}` : "Connecting…"}
        </div>
      </nav>

      <div style={styles.main}>
        {error && (
          <div style={{ background: "#7f1d1d33", border: `1px solid ${C.red}44`, borderRadius: 10, padding: "10px 16px", marginBottom: 16, color: C.red }}>
            ⚠ {error} — <button onClick={fetchCoins} style={{ background: "none", border: "none", color: C.accent, cursor: "pointer", fontWeight: 700 }}>Retry</button>
          </div>
        )}

        {/* ── DASHBOARD ── */}
        {tab === "dashboard" && (
          <>
            <div style={styles.grid3}>
              <StatCard title="Total Market Cap" value={loading ? "Loading…" : "$" + (totalMktCap / 1e12).toFixed(2) + "T"} sub="Top 8 coins tracked" />
              <StatCard title="24h Volume" value={loading ? "…" : "$" + (totalVol / 1e9).toFixed(1) + "B"} sub="Across tracked coins" color={C.accent} />
              <StatCard title="Gainers / Losers" value={loading ? "…" : `${gainers} / ${coins.length - gainers}`} sub="Last 24 hours" color={C.gold} />
            </div>
            <div style={{ ...styles.card, marginBottom: 24 }}>
              <div style={styles.cardTitle}>Market Overview — Top Coins</div>
              {loading ? <div style={{ color: C.muted, padding: 20, textAlign: "center" }}>Fetching live data…</div> : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      {["#", "Coin", "Price", "1h", "24h", "7d", "Market Cap", "7d Chart"].map(h => (
                        <th key={h} style={styles.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {coins.map(c => (
                      <tr key={c.id} style={{ cursor: "pointer" }}
                        onClick={() => { setSelectedCoin(c.id); setTab("chart"); }}>
                        <td style={{ ...styles.td, color: C.muted }}>{c.market_cap_rank}</td>
                        <td style={styles.td}>
                          <div style={styles.row}>
                            <div style={styles.coinIcon(ICON_COLORS[c.id])}>{COIN_ICONS[c.id]}</div>
                            <div>
                              <div style={{ fontWeight: 700 }}>{c.name}</div>
                              <div style={{ color: C.muted, fontSize: 11 }}>{c.symbol?.toUpperCase()}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ ...styles.td, fontWeight: 700 }}>{fmtUSD(c.current_price)}</td>
                        <td style={styles.td}><span style={styles.pct(c.price_change_percentage_1h_in_currency)}>{fmtPct(c.price_change_percentage_1h_in_currency)}</span></td>
                        <td style={styles.td}><span style={styles.pill(c.price_change_percentage_24h)}>{fmtPct(c.price_change_percentage_24h)}</span></td>
                        <td style={styles.td}><span style={styles.pct(c.price_change_percentage_7d_in_currency)}>{fmtPct(c.price_change_percentage_7d_in_currency)}</span></td>
                        <td style={{ ...styles.td, color: C.muted }}>${(c.market_cap / 1e9).toFixed(1)}B</td>
                        <td style={styles.td}><Sparkline data={c.sparkline_in_7d?.price} positive={c.price_change_percentage_7d_in_currency >= 0} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ── MARKETS ── */}
        {tab === "markets" && (
          <div style={styles.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={styles.cardTitle}>All Markets</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input style={{ ...styles.input, width: 180 }} placeholder="Search coin…" value={search} onChange={e => setSearch(e.target.value)} />
                <select style={{ ...styles.input, width: 140 }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  <option value="market_cap_rank">Market Cap</option>
                  <option value="price">Price</option>
                  <option value="change">24h Change</option>
                  <option value="volume">Volume</option>
                </select>
              </div>
            </div>
            <table style={styles.table}>
              <thead>
                <tr>{["Rank", "Coin", "Price", "24h %", "7d %", "Market Cap", "Volume", "Action"].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filteredCoins.map(c => (
                  <tr key={c.id}>
                    <td style={{ ...styles.td, color: C.muted }}>{c.market_cap_rank}</td>
                    <td style={styles.td}>
                      <div style={styles.row}>
                        <div style={styles.coinIcon(ICON_COLORS[c.id])}>{COIN_ICONS[c.id]}</div>
                        <div>
                          <div style={{ fontWeight: 700 }}>{c.name}</div>
                          <div style={{ color: C.muted, fontSize: 11 }}>{c.symbol?.toUpperCase()}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ ...styles.td, fontWeight: 700 }}>{fmtUSD(c.current_price)}</td>
                    <td style={styles.td}><span style={styles.pill(c.price_change_percentage_24h)}>{fmtPct(c.price_change_percentage_24h)}</span></td>
                    <td style={styles.td}><span style={styles.pct(c.price_change_percentage_7d_in_currency)}>{fmtPct(c.price_change_percentage_7d_in_currency)}</span></td>
                    <td style={{ ...styles.td, color: C.muted }}>${(c.market_cap / 1e9).toFixed(1)}B</td>
                    <td style={{ ...styles.td, color: C.muted }}>${(c.total_volume / 1e9).toFixed(1)}B</td>
                    <td style={styles.td}>
                      <button style={styles.btn(C.accent)} onClick={() => { setSelectedCoin(c.id); setTab("chart"); }}>Chart</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── CHART ── */}
        {tab === "chart" && (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {coins.map(c => (
                <button key={c.id}
                  style={{ ...styles.btn(selectedCoin === c.id ? C.accent : "#1e293b"), border: `1px solid ${C.border}` }}
                  onClick={() => setSelectedCoin(c.id)}>
                  {COIN_ICONS[c.id]} {COIN_SYMBOLS[c.id]}
                </button>
              ))}
            </div>
            <div style={{ ...styles.grid2, gridTemplateColumns: "3fr 1fr" }}>
              <div style={styles.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>{selCoin?.name} <span style={{ color: C.muted, fontSize: 14 }}>({COIN_SYMBOLS[selectedCoin]})</span></div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: C.accent }}>{fmtUSD(selCoin?.current_price)}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[1, 7, 30, 90].map(d => (
                      <button key={d} style={{ ...styles.btn(chartDays === d ? C.accent : "#1e293b"), border: `1px solid ${C.border}`, padding: "4px 12px" }}
                        onClick={() => setChartDays(d)}>{d}D</button>
                    ))}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="date" stroke={C.muted} tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis stroke={C.muted} tick={{ fontSize: 11 }} tickFormatter={v => "$" + (v >= 1000 ? (v / 1000).toFixed(1) + "k" : v)} domain={["auto", "auto"]} />
                    <Tooltip formatter={v => ["$" + fmt(v), "Price"]} contentStyle={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8 }} />
                    <Line type="monotone" dataKey="price" stroke={C.chart} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  ["Current Price", fmtUSD(selCoin?.current_price)],
                  ["24h High", fmtUSD(selCoin?.high_24h), C.green],
                  ["24h Low", fmtUSD(selCoin?.low_24h), C.red],
                  ["Market Cap", "$" + ((selCoin?.market_cap || 0) / 1e9).toFixed(1) + "B"],
                  ["24h Volume", "$" + ((selCoin?.total_volume || 0) / 1e9).toFixed(1) + "B"],
                  ["Circulating Supply", fmt(selCoin?.circulating_supply, 0)],
                  ["All Time High", fmtUSD(selCoin?.ath)],
                ].map(([label, val, col]) => (
                  <div key={label} style={{ ...styles.card, padding: 14 }}>
                    <div style={styles.cardTitle}>{label}</div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: col || C.text }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── PORTFOLIO ── */}
        {tab === "portfolio" && (
          <>
            <div style={styles.grid3}>
              <StatCard title="Portfolio Value" value={fmtUSD(totalValue)} color={C.accent} />
              <StatCard title="Total P&L" value={fmtUSD(totalPnl)} color={totalPnl >= 0 ? C.green : C.red} sub={totalPnl >= 0 ? "Profit" : "Loss"} />
              <StatCard title="Holdings" value={portfolio.length} sub="Active positions" />
            </div>
            <div style={styles.card}>
              <div style={styles.cardTitle}>Add Holding</div>
              <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                <select style={{ ...styles.input, width: 160 }} value={addCoin} onChange={e => setAddCoin(e.target.value)}>
                  {COINS.map(c => <option key={c} value={c}>{COIN_SYMBOLS[c]} — {c}</option>)}
                </select>
                <input style={{ ...styles.input, width: 140 }} type="number" placeholder="Amount (e.g. 0.5)" value={addAmt} onChange={e => setAddAmt(e.target.value)} />
                <input style={{ ...styles.input, width: 160 }} type="number" placeholder="Buy price (optional)" value={addPrice} onChange={e => setAddPrice(e.target.value)} />
                <button style={styles.btn(C.green)} onClick={addToPortfolio}>+ Add</button>
              </div>
              {portfolioRows.length === 0 ? (
                <div style={{ color: C.muted, textAlign: "center", padding: 32 }}>No holdings yet — add your first position above.</div>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>{["Coin", "Amount", "Buy Price", "Current", "Value", "P&L", "24h", "Added", ""].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {portfolioRows.map((r, i) => (
                      <tr key={i}>
                        <td style={styles.td}><b>{r.symbol}</b></td>
                        <td style={styles.td}>{r.amount}</td>
                        <td style={styles.td}>{fmtUSD(r.buyPrice)}</td>
                        <td style={styles.td}>{fmtUSD(r.currentPrice)}</td>
                        <td style={{ ...styles.td, fontWeight: 700 }}>{fmtUSD(r.value)}</td>
                        <td style={styles.td}>
                          <span style={styles.pill(r.pnl)}>
                            {r.pnl >= 0 ? "+" : ""}{fmtUSD(r.pnl)} ({fmtPct(r.pnlPct)})
                          </span>
                        </td>
                        <td style={styles.td}><span style={styles.pct(r.change24h)}>{fmtPct(r.change24h)}</span></td>
                        <td style={{ ...styles.td, color: C.muted }}>{r.addedAt}</td>
                        <td style={styles.td}><button style={styles.btn(C.red)} onClick={() => removeFromPortfolio(i)}>✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ── WALLET ── */}
        {tab === "wallet" && (
          <div style={{ maxWidth: 600, margin: "0 auto" }}>
            <div style={styles.card}>
              <div style={styles.cardTitle}>Wallet Connect</div>
              {!wallet ? (
                <div style={styles.walletBox}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🦊</div>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Connect Your Wallet</div>
                  <div style={{ color: C.muted, marginBottom: 24 }}>Connect MetaMask to view your real ETH balance and address.</div>
                  <button style={{ ...styles.btn(C.accent), fontSize: 16, padding: "12px 32px" }} onClick={connectWallet} disabled={walletLoading}>
                    {walletLoading ? "Connecting…" : "Connect MetaMask"}
                  </button>
                  <div style={{ color: C.muted, fontSize: 12, marginTop: 16 }}>
                    No MetaMask? <a href="https://metamask.io" target="_blank" rel="noreferrer" style={{ color: C.accent }}>Install it here →</a>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ background: "#16a34a22", border: `1px solid ${C.green}44`, borderRadius: 12, padding: 16, marginBottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ fontSize: 24 }}>✅</div>
                    <div><div style={{ color: C.green, fontWeight: 700 }}>Wallet Connected</div><div style={{ color: C.muted, fontSize: 12 }}>MetaMask</div></div>
                  </div>
                  {[
                    ["Address", wallet.address],
                    ["ETH Balance", wallet.balance.toFixed(6) + " ETH"],
                    ["Est. Value", fmtUSD((wallet.balance * (coins.find(c => c.id === "ethereum")?.current_price || 0)))],
                    ["Network", wallet.chainId === "0x1" ? "Ethereum Mainnet" : wallet.chainId === "0x89" ? "Polygon" : `Chain ${wallet.chainId}`],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ color: C.muted }}>{k}</span>
                      <span style={{ fontWeight: 700, wordBreak: "break-all", maxWidth: "60%", textAlign: "right" }}>{v}</span>
                    </div>
                  ))}
                  <button style={{ ...styles.btn(C.red), marginTop: 16, width: "100%" }} onClick={disconnectWallet}>Disconnect</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
