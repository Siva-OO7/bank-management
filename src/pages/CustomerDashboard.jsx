// CustomerDashboard.jsx
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "./CustomerDashboard.css";



/* --- Tiny inline icon for transaction pills --- */
function TxnIcon({ type }) {
  const k = String(type || "").toLowerCase();
  const common = { width: 12, height: 12, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2 };
  const style = { marginRight: 6, verticalAlign: "-2px" };

  if (k.includes("deposit")) {
    return (
      <svg {...common} style={style}>
        <path d="M12 5v14" />
        <path d="M5 12l7 7 7-7" />
      </svg>
    );
  }
  if (k.includes("withdraw")) {
    return (
      <svg {...common} style={style}>
        <path d="M12 19V5" />
        <path d="M19 12l-7-7-7 7" />
      </svg>
    );
  }
  if (k.includes("transfer")) {
    return (
      <svg {...common} style={style}>
        <path d="M17 3l4 4-4 4" />
        <path d="M21 7H7a4 4 0 0 0-4 4v2" />
        <path d="M7 21l-4-4 4-4" />
        <path d="M3 17h14a4 4 0 0 0 4-4v-2" />
      </svg>
    );
  }
  return (
    <svg {...common} style={style}>
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/* --- Small UI helpers --- */
function Stat({ title, value, sub }) {
  return (
    <div className="stat">
      <span className="muted tiny">{title}</span>
      <div className="stat-value">{value}</div>
      <span className="muted small">{sub}</span>
    </div>
  );
}
function maskAccount(n) {
  if (!n) return "•••• •••• •••• ••••";
  const s = String(n);
  return `${s.slice(0, 4)} •••• •••• ${s.slice(-4)}`;
}
function pillClass(type = "") {
  const k = type.toLowerCase();
  if (k.includes("deposit")) return "green";
  if (k.includes("withdraw")) return "gray";
  if (k.includes("transfer")) return "blue";
  return "gray";
}
/* show +/- with localized amount using the same fmt */
function fmtSigned(n, fmt) {
  const s = Number(n) < 0 ? "-" : "+";
  return `${s} ${fmt(Math.abs(n))}`;
}

/* EMI math */
function calcEMI(p, annualRate, months) {
  const P = Number(p);
  const n = Number(months);
  const r = Number(annualRate) / 12 / 100;
  if (!P || !n) return { emi: 0, totalInterest: 0, totalPayment: 0 };
  if (r === 0) {
    const emi = P / n;
    return { emi, totalPayment: emi * n, totalInterest: emi * n - P };
  }
  const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const totalPayment = emi * n;
  const totalInterest = totalPayment - P;
  return { emi, totalPayment, totalInterest };
}

/* ---- Signed amount + timestamp helpers ---- */
function isOutflow(t, account) {
  const k = String(t.type || "").toLowerCase();
  if (k.includes("withdraw")) return true;
  if (k.includes("deposit")) return false;

  // transfer: negative if this account is the sender
  const acc = String(account?.account_number || "");
  if (k.includes("transfer")) {
    if (t.from && String(t.from) === acc) return true;
    if (t.to && String(t.to) === acc) return false;
  }
  return Number(t.amount) < 0; // fallback if type not present
}
function signedAmount(t, account) {
  const a = Math.abs(Number(t.amount || 0));
  return isOutflow(t, account) ? -a : a;
}
function ts(t) {
  const v = t?.timestamp;
  if (typeof v === "number") return v < 1e12 ? v * 1000 : v; // seconds→ms
  const d = Date.parse(v);
  return Number.isNaN(d) ? 0 : d;
}

export default function CustomerDashboard() {
  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [transferAmt, setTransferAmt] = useState(300);

  // deposit/withdraw modal
  const [modal, setModal] = useState({ open: false, type: null, amount: "" });

  // email modal
  const [emailModal, setEmailModal] = useState({ open: false, to: "", note: "" });

  // EMI calculator
  const [loan, setLoan] = useState({ amount: 50000, rate: 10, months: 12 });
  const [emiOut, setEmiOut] = useState(null);

  const nav = useNavigate();
  const user = JSON.parse(localStorage.getItem("user")) || {};

  useEffect(() => {
    if (user?.user_id) {
      if (user.account) setAccount(user.account); // quick paint
      fetchAccount();   // fresh
      fetchHistory();
    }
    const onKey = (e) => {
      if (e.key === "Escape") {
        setModal({ open: false, type: null, amount: "" });
        setEmailModal((m) => ({ ...m, open: false }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // helpers
  const showToast = (text, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };
  const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

  const logout = () => {
    localStorage.removeItem("user");
    nav("/login");
  };

  // API
  const fetchAccount = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/accounts/${user.user_id}`);
      const data = await res.json();
      if (data.status === "success") {
        setAccount(data.account);
        localStorage.setItem("user", JSON.stringify({ ...user, account: data.account }));
      }
    } catch {}
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/transactions/history/${user.user_id}`);
      const data = await res.json();
      if (data.status === "success") setTransactions(data.transactions || []);
    } catch {}
  };

  const applyNewBalance = (newBalance) => {
    const nextAcc = { ...(account || {}), balance: newBalance };
    setAccount(nextAcc);
    localStorage.setItem("user", JSON.stringify({ ...user, account: nextAcc }));
  };

  // ---- Deposit / Withdraw modal ----
  const openAmountModal = (type) => {
    if (!account?.account_number) return showToast("No account found", "error");
    setModal({ open: true, type, amount: "" });
  };
  const closeModal = () => setModal({ open: false, type: null, amount: "" });

  const confirmModal = async () => {
    const amt = Number(modal.amount);
    if (!amt || amt <= 0) return showToast("Enter a valid amount", "error");

    const endpoint =
      modal.type === "deposit"
        ? "http://127.0.0.1:8000/transactions/deposit"
        : "http://127.0.0.1:8000/transactions/withdraw";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_number: account.account_number, amount: amt }),
      });
      const data = await res.json();
      if (data.status === "success") {
        applyNewBalance(data.new_balance);
        fetchHistory();
        showToast(
          `${modal.type === "deposit" ? "Deposited" : "Withdrawn"} ${fmt(amt)}. New balance: ${fmt(
            data.new_balance
          )}`
        );
        closeModal();
      } else {
        showToast(data.detail || "Operation failed", "error");
      }
    } catch {
      showToast("Network error", "error");
    }
  };

  // Transfer (inline amount)
  const transferMoney = async () => {
    if (!account?.account_number) return showToast("No sender account found", "error");
    const toAcc = prompt("Enter receiver Account Number:");
    if (!toAcc) return;

    const amount = Number(transferAmt) || 300;
    try {
      const res = await fetch("http://127.0.0.1:8000/transactions/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_account: account.account_number,
          to_account: toAcc,
          amount,
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        applyNewBalance(data.from_account_new_balance);
        fetchHistory();
        showToast(`Transferred ${fmt(amount)}. New balance: ${fmt(data.from_account_new_balance)}`);
      } else showToast(data.detail || "Transfer failed", "error");
    } catch {
      showToast("Network error", "error");
    }
  };

  // ======= Sorted + signed transactions (single source of truth for UI/PDF) =======
  const txnsSorted = useMemo(() => {
    return (transactions || [])
      .map((t) => ({
        ...t,
        _signed: signedAmount(t, account),
        _ts: ts(t),
      }))
      .sort((a, b) => b._ts - a._ts);
  }, [transactions, account]);

  // ======= PDF EXPORT =======
  const buildPdf = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pad = 36;

    // Header
    doc.setFontSize(18).setTextColor(15, 23, 42);
    doc.text("Transaction Statement", pad, 48);
    doc.setFontSize(11).setTextColor(100);
    const now = new Date();
    const meta = [
      `User: ${user?.username || "-"}`,
      `Email: ${user?.email || "-"}`,
      `Account: ${account?.account_number || "-"}`,
      `Generated: ${now.toLocaleString()}`,
    ].join("   |   ");
    doc.text(meta, pad, 66);

    // Table
    const rows = (txnsSorted || []).map((t, i) => [
      i + 1,
      t.type,
      new Date(t._ts).toLocaleString(),
      (t._signed < 0 ? "-" : "+") + Number(Math.abs(t._signed)).toLocaleString("en-IN"),
      Number(t.balance_after).toLocaleString("en-IN"),
    ]);

    autoTable(doc, {
      startY: 90,
      head: [["#", "Type", "When", "Amount (₹)", "Balance After (₹)"]],
      body: rows,
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [37, 99, 235], halign: "left" },
      didDrawPage: () => {
        const p = `Page ${doc.getNumberOfPages()}`;
        doc.setFontSize(10).setTextColor(120);
        doc.text(p, doc.internal.pageSize.getWidth() - pad, doc.internal.pageSize.getHeight() - 16, { align: "right" });
      },
    });

    // Summary
    const totalIn = txnsSorted.filter((t) => t._signed > 0).reduce((s, t) => s + t._signed, 0);
    const totalOut = txnsSorted.filter((t) => t._signed < 0).reduce((s, t) => s + Math.abs(t._signed), 0);

    const y = doc.lastAutoTable.finalY + 20;
    doc.setFontSize(12).setTextColor(15, 23, 42);
    doc.text(`Total Money In: ₹${totalIn.toLocaleString("en-IN")}`, pad, y);
    doc.text(`Total Money Out: ₹${totalOut.toLocaleString("en-IN")}`, pad, y + 18);
    doc.text(`Closing Balance: ${fmt(account?.balance)}`, pad, y + 36);

    return doc;
  };

  const downloadPdf = () => {
    const doc = buildPdf();
    const fname = `statement_${account?.account_number || "account"}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fname);
    showToast("PDF downloaded");
  };

  // ======= EMAIL REPORT =======
  const openEmailModal = () => setEmailModal({ open: true, to: user?.email || "", note: "" });
  const closeEmailModal = () => setEmailModal({ open: false, to: "", note: "" });

  const sendPdfToEmail = async () => {
    if (!emailModal.to || !/^\S+@\S+\.\S+$/.test(emailModal.to)) {
      return showToast("Enter a valid email", "error");
    }
    const doc = buildPdf();
    const pdfBlob = doc.output("blob");
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result || "").toString().split(",")[1];
      try {
        const res = await fetch("http://127.0.0.1:8000/transactions/send-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user?.user_id,
            to_email: emailModal.to,
            note: emailModal.note,
            filename: `statement_${account?.account_number || "account"}.pdf`,
            pdf_base64: base64,
          }),
        });
        const data = await res.json();
        if (data.status === "success") {
          showToast("Report emailed successfully");
          closeEmailModal();
        } else {
          showToast(data.detail || "Email failed", "error");
        }
      } catch {
        showToast("Network error while emailing", "error");
      }
    };
    reader.readAsDataURL(pdfBlob);
  };

  // EMI calc
  const runEmi = () => setEmiOut(calcEMI(loan.amount, loan.rate, loan.months));

  const disabled = !account?.account_number;

  return (
    
    <div className="db-wrap">
      
      {/* Topbar */}
      <header className="db-topbar">
        <div className="brand">
          <div className="dot" />
          <span>G-BANK</span>
        </div>

        <div className="top-actions">
          <div className="search">
            <input placeholder="Search payments, UPI, bills…" />
            {/* search icon svg */}
            <svg
              aria-hidden
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="2"
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </div>
          <button className="btn ghost" onClick={() => showToast("Support coming soon")}>
            Support
          </button>
          <div
  className="avatar"
  onClick={() => nav("/me")}
  title="Edit profile"
  style={{ cursor: "pointer" }}
>
  {(user?.username || "GU").slice(0, 2).toUpperCase()}
</div>


        </div>
      </header>

      {/* Main content */}
      <main className="db-main">
        {/* Stats */}
        <section className="stats">
          <Stat title="Available Balance" value={fmt(account?.balance)} sub={`A/C • ${account?.account_number || "—"}`} />
          <Stat
            title="Monthly Spends"
            value={fmt(txnsSorted.filter((t) => t._signed < 0).reduce((s, t) => s + Math.abs(t._signed), 0))}
            sub="vs last month"
          />
          <Stat title="Savings Vault" value={fmt(215000)} sub="Goal: ₹5,00,000" />
          <Stat
            title="Last Transaction"
            value={fmtSigned(txnsSorted[0]?._signed ?? 0, fmt)}
            sub={txnsSorted[0] ? `${txnsSorted[0].type} • ${new Date(txnsSorted[0]._ts).toLocaleDateString()}` : "No recent activity"}
          />
        </section>

        {/* Card + Quick actions */}
        <section className="center-row">
          <div className="card-preview">
            <div className="chip" />
            <div className="card-meta">
              <div>
                <span className="muted tiny">CARD HOLDER</span>
                <strong>{(user?.username || "G BANK USER").toUpperCase()}</strong>
              </div>
              <div className="align-end">
                <span className="muted tiny">VALID THRU</span>
                <strong>08/28</strong>
              </div>
            </div>
            <div className="card-number">{maskAccount(account?.account_number)}</div>
            <div className="card-brand">VISA</div>
          </div>

          <div className="quick">
            <h3>Quick Actions</h3>
            <div className="quick-grid">
              <button className="qa" onClick={() => openAmountModal("deposit")} disabled={disabled}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14" />
                  <path d="M5 12l7 7 7-7" />
                </svg>
                <span>Deposit</span>
              </button>

              <button className="qa" onClick={() => openAmountModal("withdraw")} disabled={disabled}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14" />
                  <path d="M12 5l7 7-7 7" />
                </svg>
                <span>Withdraw</span>
              </button>

              <button className="qa" onClick={transferMoney} disabled={disabled}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 3l4 4-4 4" />
                  <path d="M21 7H7a4 4 0 0 0-4 4v2" />
                  <path d="M7 21l-4-4 4-4" />
                  <path d="M3 17h14a4 4 0 0 0 4-4v-2" />
                </svg>
                <span>Transfer {fmt(transferAmt)}</span>
              </button>

              <div className="qa input">
                <label className="muted tiny">Amount</label>
                <input
                  type="number"
                  min="1"
                  value={transferAmt}
                  onChange={(e) => setTransferAmt(e.target.value)}
                />
              </div>

              <button className="qa" onClick={fetchAccount}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4v6h6" />
                  <path d="M20 20v-6h-6" />
                  <path d="M5 19a9 9 0 0 0 14-7V5" />
                </svg>
                <span>Refresh Balance</span>
              </button>

              <button className="qa danger" onClick={logout}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="5" y="11" width="14" height="10" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </section>

        {/* Recent + side widgets */}
        <section className="grid-2">
          <div className="panel">
            <div className="panel-head">
              <h3>Recent Transactions</h3>
              <div className="panel-actions">
                <button className="btn ghost small" onClick={fetchHistory}>Refresh</button>
                <button className="btn ghost small" onClick={downloadPdf}>Download PDF</button>
                <button className="btn small" onClick={() => setEmailModal({ open: true, to: user?.email || "", note: "" })}>Email Report</button>
              </div>
            </div>

            {txnsSorted.length === 0 ? (
              <div className="empty">No transactions yet.</div>
            ) : (
              <div className="table">
                <div className="thead">
                  <div>Type</div>
                  <div>When</div>
                  <div className="right">Amount</div>
                  <div>Balance After</div>
                </div>
                {txnsSorted.map((t, idx) => (
                  <div className="trow" key={idx}>
                    <div>
                      <span className={`pill ${pillClass(t.type)}`}>
                        <TxnIcon type={t.type} />
                        {t.type}
                      </span>
                    </div>
                    <div className="muted">{new Date(t._ts).toLocaleString()}</div>

                    {/* Amount with explicit sign + color */}
                    <div className={`right ${t._signed < 0 ? "neg" : "pos"}`}>
                      {fmtSigned(t._signed, fmt)}
                    </div>

                    <div>{fmt(t.balance_after)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="stack">
            <div className="panel compact">
              <h3>Savings Goal</h3>
              <div className="progress"><div className="bar" style={{ width: "43%" }} /></div>
              <div className="spread">
                <span className="muted tiny">₹ 2.15L saved</span>
                <span className="muted tiny">Goal ₹ 5L</span>
              </div>
            </div>

            <div className="panel compact">
              <h3>Upcoming Bills</h3>
              <ul className="list">
                <li><span>Jio Fiber</span><span className="muted">28 Aug</span><span>₹ 799</span></li>
                <li><span>Credit Card</span><span className="muted">05 Sep</span><span>₹ 18,300</span></li>
                <li><span>Rent</span><span className="muted">01 Sep</span><span>₹ 12,000</span></li>
              </ul>
              <button className="btn tiny">Pay Now</button>
            </div>

            {/* EMI / Loan Calculator */}
            <div className="panel compact">
              <h3>EMI / Loan Calculator</h3>

              <div className="calc">
                <label>
                  <span className="muted tiny">Amount (₹)</span>
                  <input
                    type="number"
                    min="1"
                    value={loan.amount}
                    onChange={(e) => setLoan({ ...loan, amount: e.target.value })}
                  />
                </label>

                <label>
                  <span className="muted tiny">Rate % p.a.</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={loan.rate}
                    onChange={(e) => setLoan({ ...loan, rate: e.target.value })}
                  />
                </label>

                <label>
                  <span className="muted tiny">Tenure (months)</span>
                  <input
                    type="number"
                    min="1"
                    value={loan.months}
                    onChange={(e) => setLoan({ ...loan, months: e.target.value })}
                  />
                </label>

                <button className="btn tiny" onClick={runEmi}>Calculate</button>
              </div>

              {emiOut && (
                <div className="calc-out">
                  <div>
                    <span className="muted tiny">Monthly EMI</span>
                    <div className="stat-value">{fmt(emiOut.emi)}</div>
                  </div>
                  <div>
                    <span className="muted tiny">Total Interest</span>
                    <div className="stat-value">{fmt(emiOut.totalInterest)}</div>
                  </div>
                  <div>
                    <span className="muted tiny">Total Payment</span>
                    <div className="stat-value">{fmt(emiOut.totalPayment)}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Toasts */}
      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type === "error" ? "error" : "ok"}`}>{t.text}</div>
        ))}
      </div>

      {/* Amount Modal */}
      {modal.open && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{modal.type === "deposit" ? "Deposit" : "Withdraw"} Money</h3>
            <label className="muted tiny">Enter amount (₹)</label>
            <input
              className="modal-input"
              type="number"
              min="1"
              autoFocus
              value={modal.amount}
              onChange={(e) => setModal({ ...modal, amount: e.target.value })}
            />
            <div className="modal-actions">
              <button className="btn ghost" onClick={closeModal}>Cancel</button>
              <button className="btn" onClick={confirmModal}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {emailModal.open && (
        <div className="modal-backdrop" onClick={closeEmailModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Email Statement</h3>
            <label className="muted tiny">Recipient email</label>
            <input
              className="modal-input"
              type="email"
              value={emailModal.to}
              onChange={(e) => setEmailModal({ ...emailModal, to: e.target.value })}
            />
            <label className="muted tiny">Note (optional)</label>
            <textarea
              className="modal-textarea"
              rows="3"
              value={emailModal.note}
              onChange={(e) => setEmailModal({ ...emailModal, note: e.target.value })}
            />
            <div className="modal-actions">
              <button className="btn ghost" onClick={closeEmailModal}>Cancel</button>
              <button className="btn" onClick={sendPdfToEmail}>Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
