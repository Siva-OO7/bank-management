// src/pages/UserDetails.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CustomerDashboard.css"; // reuse your panel/btn styles

export default function UserDetails() {
  const nav = useNavigate();
  const userLocal = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  }, []);
  const accountNumber = userLocal?.account?.account_number;

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState({
    username: userLocal?.username || "",
    email: userLocal?.email || "",
    dob: "",
    phone: "",
    address: "",
    country: "India",
    language: "English",
    time_zone: "Asia/Kolkata",
    welcome: "Welcome to my page.",
  });

  // ---- load profile
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!accountNumber) { setLoading(false); return; }
      try {
        const r = await fetch(`${process.env.REACT_APP_API_URL}/users/by-account/${accountNumber}`);
        const data = await r.json();
        if (!alive) return;
        if (data.status === "success") {
          const u = data.user || {};
          setForm((f) => ({
            ...f,
            username: u.username ?? f.username,
            email: u.email ?? f.email,
            dob: u.dob ?? "",
            phone: u.phone ?? "",
            address: u.address ?? "",
            country: u.country ?? f.country,
            language: u.language ?? f.language,
            time_zone: u.time_zone ?? f.time_zone,
            welcome: u.welcome ?? f.welcome,
          }));
        } else {
          setMsg(data.detail || "Failed to load profile");
        }
      } catch {
        setMsg("Network error while loading profile");
      } finally {
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [accountNumber]);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // ---- save profile
  const save = async () => {
    setMsg("");
    try {
      const r = await fetch(`${process.env.REACT_APP_API_URL}/users/by-account/${accountNumber}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username,
          dob: form.dob,
          phone: form.phone,
          address: form.address,
          country: form.country,
          language: form.language,
          time_zone: form.time_zone,
          welcome: form.welcome,
        }),
      });
      const data = await r.json();
      if (data.status === "success") {
        localStorage.setItem("user", JSON.stringify({ ...userLocal, username: form.username }));
        setMsg("Saved changes.");
      } else {
        setMsg(data.detail || "Save failed");
      }
    } catch {
      setMsg("Network error while saving");
    }
  };

  // ---- change password
  const changePassword = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const old_password = fd.get("old_password");
    const new_password = fd.get("new_password");
    const confirm = fd.get("confirm");
    if (!old_password || !new_password) return setMsg("Enter both current and new password");
    if (new_password !== confirm) return setMsg("New passwords do not match");

    setMsg("");
    try {
      const r = await fetch(`${process.env.REACT_APP_API_URL}/users/by-account/${accountNumber}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ old_password, new_password }),
      });
      const data = await r.json();
      setMsg(data.status === "success" ? "Password updated." : (data.detail || "Password change failed"));
      if (data.status === "success") e.currentTarget.reset();
    } catch {
      setMsg("Network error while changing password");
    }
  };

  // ---- delete account
  const deleteAccount = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const current_password = fd.get("current_password");
    const confirmCheck = fd.get("confirm_delete") === "on";
    if (!confirmCheck) return setMsg("Please confirm you want to delete your account");
    if (!current_password) return setMsg("Enter your current password to delete");

    if (!window.confirm("Delete account permanently? This cannot be undone.")) return;

    try {
      const r = await fetch(`${process.env.REACT_APP_API_URL}/users/by-account/${accountNumber}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password }),
      });
      const data = await r.json();
      if (data.status === "success") {
        localStorage.removeItem("user");
        localStorage.removeItem("admin_ok");
        nav("/register", { replace: true });
      } else {
        setMsg(data.detail || "Delete failed");
      }
    } catch {
      setMsg("Network error while deleting");
    }
  };

  if (loading) return <div className="db-main"><div className="panel">Loading…</div></div>;

  return (
    <div className="db-main">
      <div className="panel">
        <div className="panel-head">
          <h3>Account Details</h3>
          <div className="panel-actions">
            <button className="btn ghost small" onClick={() => nav(-1)}>Back</button>
            <button className="btn small" onClick={save}>Save Changes</button>
          </div>
        </div>

        {msg && (
          <div className="small" style={{
            marginBottom: 10,
            background: /fail|error|network|delete/i.test(msg) ? "#fee2e2" : "#ecfdf5",
            color: /fail|error|network|delete/i.test(msg) ? "#991b1b" : "#065f46",
            border: "1px solid #e5e7eb",
            padding: "8px 10px",
            borderRadius: 10
          }}>
            {msg}
          </div>
        )}

        {/* profile form */}
        <div className="form-grid">
          <label className="field">
            <span className="label">Full Name</span>
            <input name="username" value={form.username} onChange={onChange} />
          </label>

          <label className="field">
            <span className="label">Email</span>
            <input value={form.email} disabled />
          </label>

          <label className="field">
            <span className="label">Date of Birth</span>
            <input type="date" name="dob" value={form.dob || ""} onChange={onChange} />
          </label>

          <label className="field">
            <span className="label">Phone</span>
            <input name="phone" value={form.phone} onChange={onChange} placeholder="+91…" />
          </label>

          <label className="field span-2">
            <span className="label">Address</span>
            <input name="address" value={form.address} onChange={onChange} placeholder="Street, City, PIN" />
          </label>

          <label className="field">
            <span className="label">Country</span>
            <select name="country" value={form.country} onChange={onChange}>
              <option>India</option><option>United States</option><option>United Kingdom</option><option>Indonesia</option>
            </select>
          </label>

          <label className="field">
            <span className="label">Language</span>
            <select name="language" value={form.language} onChange={onChange}>
              <option>English</option><option>Hindi</option><option>Tamil</option><option>Spanish</option>
            </select>
          </label>

          <label className="field">
            <span className="label">Time Zone</span>
            <select name="time_zone" value={form.time_zone} onChange={onChange}>
              <option>Asia/Kolkata</option><option>America/New_York</option><option>Europe/London</option><option>Asia/Jakarta</option>
            </select>
          </label>

          <label className="field span-2">
            <span className="label">Welcome Message</span>
            <textarea name="welcome" rows={3} value={form.welcome} onChange={onChange} />
          </label>
        </div>
      </div>

      {/* Security */}
      <div className="panel compact">
        <h3>Security</h3>
        <form className="form-inline" onSubmit={changePassword}>
          <input name="old_password" type="password" placeholder="Current password" />
          <input name="new_password" type="password" placeholder="New password" />
          <input name="confirm" type="password" placeholder="Confirm new password" />
          <button className="btn small">Change Password</button>
        </form>
      </div>

      {/* Danger zone */}
      <div className="panel compact">
        <h3>Danger Zone</h3>
        <form className="form-inline" onSubmit={deleteAccount}>
          <input name="current_password" type="password" placeholder="Current password" />
          <label className="small" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" name="confirm_delete" /> I understand this will permanently delete my account.
          </label>
          <button className="btn small" style={{ background: "#dc2626" }}>Delete Account</button>
        </form>
      </div>
    </div>
  );
}
