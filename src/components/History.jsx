import { useEffect, useMemo, useState } from "react";
import api from "../api";

function ts(row) {
  const v = row?.timestamp;
  if (typeof v === "number") return v < 1e12 ? v * 1000 : v; // seconds → ms
  const d = Date.parse(v);
  return Number.isNaN(d) ? 0 : d;
}

export default function History({ userId }) {
  const [items, setItems] = useState([]);

  const load = async () => {
    if (!userId) return setItems([]);
    try {
      const r = await api.get(`/transactions/history/${userId}`);
      const list = r.data.transactions || [];
      setItems(list);
    } catch {
      setItems([]);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [userId]);

  // ✅ Always show newest first
  const itemsSorted = useMemo(
    () => [...items].sort((a, b) => ts(b) - ts(a)),
    [items]
  );

  const fmt = (n) => Number(n).toLocaleString("en-IN");

  return (
    <div className="card">
      <h3>Transactions</h3>
      {itemsSorted.length === 0 && <div className="small">No transactions yet.</div>}
      {itemsSorted.map((t, i) => (
        <div key={i} className="small">
          <b>{t.type}</b> — ₹{fmt(t.amount)} — bal ₹{fmt(t.balance_after)} — {new Date(ts(t)).toLocaleString()}
          {t.to && <> — to: <span className="badge">{t.to}</span></>}
          {t.from && <> — from: <span className="badge">{t.from}</span></>}
        </div>
      ))}
    </div>
  );
}
