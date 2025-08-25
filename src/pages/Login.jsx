import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import heroImg from "../components/image2.jpeg";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  // Forgot Password modal state
  const [showForgot, setShowForgot] = useState(false);
  const [fpEmail, setFpEmail] = useState("");
  const [fpAcc, setFpAcc] = useState("");
  const [fpNewPass, setFpNewPass] = useState("");
  const [fpLoading, setFpLoading] = useState(false);
  const [fpMsg, setFpMsg] = useState(null);

  const nav = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.ok && data.status === "success") {
        localStorage.setItem("user", JSON.stringify(data.user));
        setMsg({ type: "success", text: "Login successful. Redirecting…" });
        setTimeout(() => nav("/dashboard"), 500);
      } else {
        setMsg({ type: "error", text: data.detail || data.message || "Login failed" });
      }
    } catch {
      setMsg({ type: "error", text: "Network error. Try again." });
    } finally {
      setLoading(false);
    }
  };

  // Open Forgot Password modal; prefill email if user already typed it
  const openForgot = () => {
    setFpEmail(email || "");
    setFpAcc("");
    setFpNewPass("");
    setFpMsg(null);
    setShowForgot(true);
  };

  const handleForgotPassword = async () => {
    setFpMsg(null);

    // basic validation
    if (!fpEmail || !fpAcc || !fpNewPass) {
      setFpMsg({ type: "error", text: "Please fill all fields." });
      return;
    }

    try {
      setFpLoading(true);
      const res = await fetch(`${process.env.REACT_APP_API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: fpEmail,
          account_number: fpAcc,
          new_password: fpNewPass,
        }),
      });
      const data = await res.json();

      if (res.ok && data.status === "success") {
        setFpMsg({ type: "success", text: "Password reset successful! Please login again." });
        // close modal after a moment and copy new pass into main field for convenience
        setTimeout(() => {
          setShowForgot(false);
          setPassword(fpNewPass);
          setMsg({ type: "success", text: "Password updated. Please sign in." });
        }, 600);
      } else {
        setFpMsg({ type: "error", text: data.detail || data.message || "Reset failed" });
      }
    } catch {
      setFpMsg({ type: "error", text: "Network error. Try again." });
    } finally {
      setFpLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      {/* Left side — image + feature points */}
      <div
        className="login-hero"
        style={{ backgroundImage: `url(${heroImg})` }}
      >
        <ul className="hero-points only">
          <li>✔ 24×7 transfers</li>
          <li>✔ Loan & EMI tracker</li>
          <li>✔ Real-time statements</li>
        </ul>
      </div>

      {/* Right side — form card */}
      <div className="login-card">
        <div className="card-inner">
          <h2>Sign in</h2>
          <p className="muted">Use your email and password to continue</p>

          <form onSubmit={handleLogin} className="form">
            <label>
              Email
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </label>

            <label>
              Password
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            <div className="form-row">
              <label className="checkbox">
                <input type="checkbox" /> Remember me
              </label>

              {/* Forgot password opens modal */}
              <button
                type="button"
                className="link small link-button"
                onClick={openForgot}
                title="Reset your password"
              >
                Forgot password?
              </button>
            </div>

            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          {msg && (
            <div className={`alert ${msg.type === "error" ? "alert-error" : "alert-success"}`}>
              {msg.text}
            </div>
          )}

          <p className="muted center small">
            New here? <a href="/register" className="link">Create an account</a>
          </p>
        </div>

        <p className="tiny muted center">© {new Date().getFullYear()} Golden Ore Bank. All rights reserved.</p>
      </div>

      {/* 🔥 Forgot Password Modal */}
      {showForgot && (
        <div className="modal-overlay" onClick={() => setShowForgot(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Reset Password</h3>
            <div className="form" style={{ marginTop: 8 }}>
              <label>
                Email
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={fpEmail}
                  onChange={(e) => setFpEmail(e.target.value)}
                />
              </label>
              <label>
                Account Number
                <input
                  type="text"
                  placeholder="8-digit account number"
                  value={fpAcc}
                  onChange={(e) => setFpAcc(e.target.value)}
                />
              </label>
              <label>
                New Password
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={fpNewPass}
                  onChange={(e) => setFpNewPass(e.target.value)}
                />
              </label>
            </div>

            {fpMsg && (
              <div className={`alert ${fpMsg.type === "error" ? "alert-error" : "alert-success"}`} style={{ marginTop: 8 }}>
                {fpMsg.text}
              </div>
            )}

            <div style={{ marginTop: 10, display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setShowForgot(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleForgotPassword} className="btn-primary" disabled={fpLoading}>
                {fpLoading ? "Submitting…" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
