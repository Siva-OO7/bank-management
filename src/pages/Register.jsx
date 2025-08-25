import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Register.css";
import rightImg from "./image3.jpeg"; // 👈 correct now, since it's in the same folder

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [message, setMessage]   = useState("");
  const [loading, setLoading]   = useState(false);
  const nav = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage("");

    if (password !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();

      if (res.ok && data.status === "success") {
        setMessage("Registration successful 🚀 Redirecting…");
        setTimeout(() => nav("/login"), 1000);
      } else {
        setMessage(data.detail || data.message || "Registration failed");
      }
    } catch {
      setMessage("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-wrap">
      <div className="register-card">
        {/* Left: Form */}
        <div className="register-left">
          <h2>Sign Up</h2>
          <form onSubmit={handleRegister} className="register-form">
            <input type="text" placeholder="Name" value={username} onChange={(e) => setUsername(e.target.value)} required />
            <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <input type="password" placeholder="Confirm Password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            <button type="submit" disabled={loading}>
              {loading ? "Creating…" : "Create Account"}
            </button>
          </form>

          {message && <p className="msg">{message}</p>}

          <p className="small">
            Already have an account? <Link to="/login">Login here</Link>
          </p>
        </div>

        {/* Right: Image */}
        <div className="register-right" style={{ backgroundImage: `url(${rightImg})` }} aria-label="Welcome image" />
      </div>
    </div>
  );
}
