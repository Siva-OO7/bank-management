import { useEffect, useMemo, useState } from "react";
import api from "../api";
import "./AdminDashboard.css";

export default function AdminDashboard() {
  const [tab, setTab] = useState("overview"); // overview | customers | accounts | loans
  const [customers, setCustomers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loans, setLoans] = useState([]);
  const [search, setSearch] = useState("");
  const [loanStatus, setLoanStatus] = useState("all");
  const [acctType, setAcctType] = useState("all");
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);

  // pagination
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const pushToast = (type, text) => {
    const id = crypto.randomUUID();
    setToasts((t) => [...t, { id, type, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2500);
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      const [c, a, l] = await Promise.all([
        api.get("/admin/customers"),
        api.get("/admin/accounts"),
        api.get("/admin/loans"),
      ]);
      setCustomers(c.data.customers || []);
      setAccounts(a.data.accounts || []);
      setLoans(l.data.loans || []);
      pushToast("success", "Data refreshed");
    } catch (e) {
      console.error(e);
      pushToast("error", "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const approve = async (id) => {
    const prev = loans;
    setLoans((ls) => ls.map((x) => (x._id === id ? { ...x, status: "approved" } : x)));
    try {
      await api.post(`/admin/loans/${id}/approve`);
      pushToast("success", "Loan approved");
    } catch (e) {
      setLoans(prev);
      pushToast("error", "Approve failed");
    }
  };

  const reject = async (id) => {
    const prev = loans;
    setLoans((ls) => ls.map((x) => (x._id === id ? { ...x, status: "rejected" } : x)));
    try {
      await api.post(`/admin/loans/${id}/reject`);
      pushToast("success", "Loan rejected");
    } catch (e) {
      setLoans(prev);
      pushToast("error", "Reject failed");
    }
  };

  // ===== Derived Stats =====
  const totalBalance = useMemo(
    () => accounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0),
    [accounts]
  );

  const loanTotals = useMemo(() => {
    const t = { total: 0, approved: 0, pending: 0, rejected: 0, disbursedAmt: 0, emisPaid: 0, emisTotal: 0 };
    for (const l of loans) {
      t.total += 1;
      t.emisPaid += Number(l.emis_paid) || 0;
      t.emisTotal += Number(l.months) || 0;
      if (l.status === "approved") {
        t.approved += 1;
        t.disbursedAmt += Number(l.amount) || 0;
      } else if (l.status === "pending") {
        t.pending += 1;
      } else if (l.status === "rejected") {
        t.rejected += 1;
      }
    }
    return t;
  }, [loans]);

  const repaymentRate = useMemo(() => {
    if (!loanTotals.emisTotal) return 0;
    return Math.round((loanTotals.emisPaid / loanTotals.emisTotal) * 100);
  }, [loanTotals]);

  const balanceSeries = useMemo(() => accounts.map((a) => Number(a.balance) || 0), [accounts]);
  const loanAmountSeries = useMemo(() => loans.map((l) => Number(l.amount) || 0), [loans]);

  // ===== Filtering & Sorting =====
  const [sortBy, setSortBy] = useState({ key: "", dir: "asc" });

  const filteredCustomers = useMemo(() => {
    const kw = search.trim().toLowerCase();
    let arr = [...customers];
    if (kw) {
      arr = arr.filter(
        (u) =>
          (u.username && u.username.toLowerCase().includes(kw)) ||
          (u.email && u.email.toLowerCase().includes(kw)) ||
          (u._id && String(u._id).toLowerCase().includes(kw))
      );
    }
    return sortArray(arr, sortBy);
  }, [customers, search, sortBy]);

  const filteredAccounts = useMemo(() => {
    const kw = search.trim().toLowerCase();
    let arr = [...accounts].filter((a) => (acctType === "all" ? true : a.account_type === acctType));
    if (kw) {
      arr = arr.filter(
        (a) =>
          String(a.account_number).toLowerCase().includes(kw) ||
          String(a.user_id).toLowerCase().includes(kw) ||
          String(a.account_type).toLowerCase().includes(kw)
      );
    }
    return sortArray(arr, sortBy);
  }, [accounts, search, acctType, sortBy]);

  const filteredLoans = useMemo(() => {
    const kw = search.trim().toLowerCase();
    let arr = [...loans].filter((l) => (loanStatus === "all" ? true : l.status === loanStatus));
    if (kw) {
      arr = arr.filter(
        (l) =>
          String(l.user_id).toLowerCase().includes(kw) ||
          String(l._id).toLowerCase().includes(kw) ||
          String(l.status).toLowerCase().includes(kw)
      );
    }
    return sortArray(arr, sortBy);
  }, [loans, search, loanStatus, sortBy]);

  useEffect(() => { setPage(1); }, [search, loanStatus, acctType, tab, rowsPerPage]);

  const currentRows = useMemo(() => {
    const data =
      tab === "customers" ? filteredCustomers :
      tab === "accounts" ? filteredAccounts :
      tab === "loans" ? filteredLoans : [];
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return { data: data.slice(start, end), total: data.length };
  }, [tab, filteredCustomers, filteredAccounts, filteredLoans, page, rowsPerPage]);

  // ===== Helpers =====
  function sortArray(arr, { key, dir }) {
    if (!key) return arr;
    const m = dir === "desc" ? -1 : 1;
    return [...arr].sort((a, b) => {
      const av = a?.[key]; const bv = b?.[key];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * m;
      return String(av ?? "").localeCompare(String(bv ?? "")) * m;
    });
  }

  const setSort = (key) => {
    setSortBy((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  };

  const exportCSV = (rows, filename) => {
    const flat = rows.map(flatten);
    const headers = Object.keys(flat[0] || {});
    const body = flat.map((r) => headers.map((h) => escapeCSV(r[h])).join(",")).join("\n");
    const csv = headers.join(",") + "\n" + body;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  // ===== Render =====
  return (
    <div className="admin-wrap">
      <Header onRefresh={loadAll} loading={loading} />

      {/* KPI Cards */}
      <section className="kpi-grid">
        <KpiCard title="Customers" value={customers.length} icon={<UsersIcon />} />
        <KpiCard title="Accounts" value={accounts.length} icon={<BankIcon />} footer={`Total Balance: ${inr(totalBalance)}`}>
          <Sparkline data={balanceSeries} />
        </KpiCard>
        <KpiCard title="Loans" value={loanTotals.total} icon={<LoanIcon />} footer={`Approved: ${loanTotals.approved}  •  Pending: ${loanTotals.pending}  •  Rejected: ${loanTotals.rejected}`}>
          <Sparkline data={loanAmountSeries} />
        </KpiCard>
        <KpiCard title="Repayment Rate" value={`${repaymentRate}%`} icon={<CheckIcon />} />
      </section>

      {/* === LAYOUT: sidebar (tabs) + main (filters + content) === */}
      <div className="layout">
        {/* LEFT: sticky tab buttons */}
        <aside className="sidebar">
          <Tab label="Overview"  active={tab === "overview"}  onClick={() => setTab("overview")} />
          <Tab label="Customers" active={tab === "customers"} onClick={() => setTab("customers")} />
          <Tab label="Accounts"  active={tab === "accounts"}  onClick={() => setTab("accounts")} />
          <Tab label="Loans"     active={tab === "loans"}     onClick={() => setTab("loans")} />
        </aside>

        {/* RIGHT: filters + pages */}
        <main className="main-content">
          {/* Filters */}
          <section className="filters">
            <div className="search">
              <SearchIcon />
              <input
                placeholder="Search id / user / email / status"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {tab === "accounts" && (
              <select value={acctType} onChange={(e) => setAcctType(e.target.value)}>
                <option value="all">All account types</option>
                <option value="savings">Savings</option>
                <option value="current">Current</option>
                <option value="fixed">Fixed</option>
              </select>
            )}

            {tab === "loans" && (
              <select value={loanStatus} onChange={(e) => setLoanStatus(e.target.value)}>
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            )}

            {tab !== "overview" && (
              <>
                <button className="ghost" onClick={() => exportCSV(currentRows.data, `${tab}.csv`)}>
                  <DownloadIcon /> Export CSV
                </button>
                <div className="rows">
                  <label>Rows</label>
                  <select value={rowsPerPage} onChange={(e) => setRowsPerPage(Number(e.target.value))}>
                    {[5, 10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </>
            )}
          </section>

          {/* Pages */}
          {tab === "overview" && (
            <section className="grid-two">
              <div className="card">
                <div className="card-title">Recent Accounts</div>
                <Table
                  columns={[
                    { key: "account_number", label: "Account #" },
                    { key: "account_type", label: "Type" },
                    { key: "balance", label: "Balance", render: (v) => inr(v) },
                    { key: "user_id", label: "User ID", render: (v) => <span className="badge">{v}</span> },
                  ]}
                  rows={sortArray([...accounts].slice(-8).reverse(), { key: "balance", dir: "desc" })}
                  onSort={setSort}
                  sortBy={sortBy}
                  compact
                />
              </div>

              <div className="card">
                <div className="card-title">Recent Loans</div>
                <Table
                  columns={[
                    { key: "_id", label: "Loan ID" },
                    { key: "user_id", label: "User", render: (v) => <span className="badge">{v}</span> },
                    { key: "amount", label: "Amount", render: (v) => inr(v) },
                    { key: "months", label: "Months" },
                    { key: "annual_rate", label: "Rate %" },
                    { key: "status", label: "Status", render: (v) => <StatusPill status={v} /> },
                  ]}
                  rows={[...loans].slice(-8).reverse()}
                  onSort={setSort}
                  sortBy={sortBy}
                  compact
                />
              </div>
            </section>
          )}

          {tab === "customers" && (
            <div className="card">
              <div className="card-title">Customers ({filteredCustomers.length})</div>
              <Table
                columns={[
                  { key: "_id", label: "ID", render: (v) => <span className="badge">{v}</span> },
                  { key: "username", label: "Username" },
                  { key: "email", label: "Email" },
                ]}
                rows={currentRows.data}
                onSort={setSort}
                sortBy={sortBy}
              />
              <Pager total={currentRows.total} page={page} per={rowsPerPage} onPage={setPage} />
            </div>
          )}

          {tab === "accounts" && (
            <div className="card">
              <div className="card-title">Accounts ({filteredAccounts.length})</div>
              <Table
                columns={[
                  { key: "account_number", label: "Account #" },
                  { key: "account_type", label: "Type" },
                  { key: "balance", label: "Balance", render: (v) => inr(v) },
                  { key: "user_id", label: "User", render: (v) => <span className="badge">{v}</span> },
                ]}
                rows={currentRows.data}
                onSort={setSort}
                sortBy={sortBy}
              />
              <Pager total={currentRows.total} page={page} per={rowsPerPage} onPage={setPage} />
            </div>
          )}

          {tab === "loans" && (
            <div className="card">
              <div className="card-title">Loans ({filteredLoans.length})</div>
              <Table
                columns={[
                  { key: "_id", label: "Loan ID" },
                  { key: "user_id", label: "User", render: (v) => <span className="badge">{v}</span> },
                  { key: "amount", label: "Amount", render: (v) => inr(v) },
                  { key: "months", label: "Months" },
                  { key: "annual_rate", label: "Rate %" },
                  { key: "emi", label: "EMI", render: (v) => inr(v) },
                  { key: "status", label: "Status", render: (v) => <StatusPill status={v} /> },
                  {
                    key: "actions", label: "Actions", render: (_, row) => (
                      <div className="row-actions">
                        <button className="success" onClick={() => approve(row._id)} title="Approve">
                          <CheckIcon />
                        </button>
                        <button className="danger" onClick={() => reject(row._id)} title="Reject">
                          <XIcon />
                        </button>
                      </div>
                    )
                  },
                ]}
                rows={currentRows.data}
                onSort={setSort}
                sortBy={sortBy}
              />
              <Pager total={currentRows.total} page={page} per={rowsPerPage} onPage={setPage} />
            </div>
          )}
        </main>
      </div>

      {/* Toasts */}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>{t.text}</div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Small components ---------- */

function Header({ onRefresh, loading }) {
  return (
    <div className="card header">
      <div className="left">
        <h2>Admin Dashboard</h2>
        <span className="sub"> G-Bank Management • Control Center</span>
      </div>
      <div className="right">
        <button onClick={onRefresh} disabled={loading}>
          <RefreshIcon /> {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>
    </div>
  );
}

function KpiCard({ title, value, icon, footer, children }) {
  return (
    <div className="kpi card">
      <div className="kpi-top">
        <div className="kpi-icon">{icon}</div>
        <div className="kpi-meta">
          <div className="kpi-title">{title}</div>
          <div className="kpi-value">{value}</div>
        </div>
      </div>
      {children && <div className="kpi-spark">{children}</div>}
      {footer && <div className="kpi-footer">{footer}</div>}
    </div>
  );
}

function Tab({ label, active, onClick }) {
  return (
    <button className={`tab ${active ? "active" : ""}`} onClick={onClick}>
      {label}
    </button>
  );
}

function Table({ columns, rows, onSort, sortBy, compact }) {
  const template = `repeat(${columns.length}, minmax(0,1fr))`;

  return (
    <div className={`table ${compact ? "compact" : ""}`}>
      <div className="thead" style={{ display: "grid", gridTemplateColumns: template }}>
        {columns.map((c) => (
          <div
            key={c.key}
            className={`th ${c.key === "actions" ? "no-sort" : ""}`}
            onClick={() => c.key !== "actions" && onSort(c.key)}
          >
            <span className="th-label">{c.label}</span>
            {c.key !== "actions" && (
              <span className={`sort ${sortBy.key === c.key ? sortBy.dir : ""}`}>▾</span>
            )}
          </div>
        ))}
      </div>

      <div className="tbody">
        {rows.map((r) => (
          <div
            key={r._id || r.account_number || r.id || Math.random().toString(36).slice(2)}
            className="tr"
            style={{ display: "grid", gridTemplateColumns: template }}
          >
            {columns.map((c) => (
              <div key={c.key} className="td">
                {c.render ? c.render(r[c.key], r) : String(r[c.key] ?? "")}
              </div>
            ))}
          </div>
        ))}
        {rows.length === 0 && <div className="empty">No data</div>}
      </div>
    </div>
  );
}

function Pager({ total, page, per, onPage }) {
  const pages = Math.max(1, Math.ceil(total / per));
  return (
    <div className="pager">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)}>Prev</button>
      <span>Page {page} / {pages}</span>
      <button disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
    </div>
  );
}

function StatusPill({ status }) {
  return <span className={`pill ${status}`}>{status}</span>;
}

function Sparkline({ data = [], width = 180, height = 46, strokeWidth = 2 }) {
  if (!data.length) return <div className="sparkline-empty">No data</div>;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const norm = (v) => {
    if (max === min) return height / 2;
    return height - ((v - min) / (max - min)) * height;
  };
  const step = width / Math.max(1, data.length - 1);
  const points = data.map((v, i) => `${i * step},${norm(v)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="sparkline">
      <polyline fill="none" stroke="currentColor" strokeWidth={strokeWidth} points={points} />
    </svg>
  );
}

/* ---------- Icons (inline SVG, no deps) ---------- */
function RefreshIcon(){return(<svg width="18" height="18" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-2.64-6.36L21 3v6h-6l2.2-2.2A7 7 0 1 0 19 12" fill="currentColor"/></svg>);}
function UsersIcon(){return(<svg width="20" height="20" viewBox="0 0 24 24"><path d="M16 11c1.66 0 3-1.79 3-4s-1.34-4-3-4-3 1.79-3 4 1.34 4 3 4zm-8 0c1.66 0 3-1.79 3-4S9.66 3 8 3 5 4.79 5 7s1.34 4 3 4zm0 2c-2.67 0-8 1.34-8 4v2h10v-2c0-1.3.84-2.4 2.08-3.14C11.1 13.51 9.63 13 8 13zm8 0c-.74 0-1.45.08-2.12.22A5.01 5.01 0 0 1 18 18v2h6v-2c0-2.66-5.33-5-8-5z" fill="currentColor"/></svg>);}
function BankIcon(){return(<svg width="20" height="20" viewBox="0 0 24 24"><path d="M12 2 2 7v2h20V7L12 2zm-7 9v8H3v2h18v-2h-2v-8H5zm2 0h10v8H7v-8z" fill="currentColor"/></svg>);}
function LoanIcon(){return(<svg width="20" height="20" viewBox="0 0 24 24"><path d="M3 6h18v12H3zM6 3h12v3H6z" fill="currentColor"/></svg>);}
function CheckIcon(){return(<svg width="18" height="18" viewBox="0 0 24 24"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" fill="currentColor"/></svg>);}
function XIcon(){return(<svg width="18" height="18" viewBox="0 0 24 24"><path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z" fill="currentColor"/></svg>);}
function SearchIcon(){return(<svg width="16" height="16" viewBox="0 0 24 24"><path d="M9.5 3a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zm0 2a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM20 20l-4.35-4.35" stroke="currentColor" strokeWidth="2" fill="none"/></svg>);}
function DownloadIcon(){return(<svg width="16" height="16" viewBox="0 0 24 24"><path d="M12 3v10m0 0 4-4m-4 4-4-4M5 21h14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>);}

/* ---------- Utils ---------- */
function inr(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
}
function flatten(o, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(o ?? {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = Array.isArray(v) ? v.join("|") : v;
  }
  return out;
}
function escapeCSV(val) {
  const s = String(val ?? "");
  if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
