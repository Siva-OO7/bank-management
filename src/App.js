// src/App.js
import { Routes, Route, Link, useLocation, useNavigate, Navigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import Register from "./pages/Register";
import Login from "./pages/Login";
import Home from "./pages/Home";
import CustomerDashboard from "./pages/CustomerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import UserDetails from "./pages/UserDetails"; // ⬅️ NEW
import "./App.css";

/** Protects routes that need the user to be logged in */
function ProtectedRoute({ children }) {
  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
  }, []);
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

/** Admin route guard with password prompt (once per session) */
function AdminRoute({ children }) {
  const nav = useNavigate();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let alive = true;

    const already = localStorage.getItem("admin_ok") === "true";
    if (already) {
      if (alive) setAllowed(true);
      return;
    }
    // show prompt once when entering /admin
    const pwd = window.prompt("Enter admin password:");
    if (pwd === "admin007") {
      localStorage.setItem("admin_ok", "true");
      if (alive) setAllowed(true);
    } else {
      alert("Wrong admin password.");
      nav("/", { replace: true });
    }

    return () => { alive = false; };
  }, [nav]);

  if (!allowed) return null; // render nothing while gating
  return children;
}

export default function App() {
  const location = useLocation();
  const nav = useNavigate();

  // read user on route changes
  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
  }, [location.key]);

  const hideHeaderOn = ["/login", "/register"];
  const showHeader = !!user && !hideHeaderOn.includes(location.pathname);

  const goAdmin = (e) => {
    e.preventDefault();
    if (localStorage.getItem("admin_ok") === "true") {
      nav("/admin");
      return;
    }
    const pwd = window.prompt("Enter admin password:");
    if (pwd === "admin007") {
      localStorage.setItem("admin_ok", "true");
      nav("/admin");
    } else {
      alert("Wrong admin password.");
    }
  };

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("admin_ok");
    nav("/login");
  };

  return (
    <>
      {showHeader && (
        <header className="app-header">
          <div className="header-left">
            <h1>🏦 G-BANK </h1>
            <nav>
              <Link to="/">Home</Link>
              <Link to="/dashboard">Customer</Link>
              <Link to="/admin" onClick={goAdmin}>Admin</Link>
            </nav>
          </div>
          <div className="header-right">
            <span className="signed-in">
              {user?.username ? `Signed in as ${user.username}` : ""}
            </span>
            {/* ⬇️ New Profile button in header */}
            <Link to="/me" className="btn ghost" style={{ marginRight: 8 }}>
              Profile
            </Link>
            <button onClick={logout} className="logout-btn">Logout</button>
          </div>
        </header>
      )}

      <div className="container">
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Home */}
          <Route path="/" element={<Home />} />

          {/* Customer */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <CustomerDashboard />
              </ProtectedRoute>
            }
          />

          {/* Admin */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />

          {/* NEW: Profile page (protected) */}
          <Route
            path="/me"
            element={
              <ProtectedRoute>
                <UserDetails />
              </ProtectedRoute>
            }
          />

          {/* Fallback LAST */}
          <Route path="*" element={<Navigate to={user ? "/" : "/login"} replace />} />
        </Routes>
      </div>
    </>
  );
}
