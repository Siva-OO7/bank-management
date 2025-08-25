// src/pages/Home.jsx
import "./Home.css";
import heroImg from "../components/download.jpeg"; 
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="home-wrap">
      {/* HERO */}
      <section className="hero">
        {/* Left: image with angled ribbons */}
        <div className="hero-media">
          <img src={heroImg} alt="Customer using mobile banking" />
          {/* blue ribbons */}
          <svg className="ribbon ribbon-1" viewBox="0 0 600 120" preserveAspectRatio="none" aria-hidden>
            <polygon points="0,0 600,0 520,120 0,65" />
          </svg>
          <svg className="ribbon ribbon-2" viewBox="0 0 600 220" preserveAspectRatio="none" aria-hidden>
            <polygon points="220,0 600,0 420,220 300,190" />
          </svg>
          {/* orange wedge */}
          <svg className="wedge" viewBox="0 0 600 160" preserveAspectRatio="none" aria-hidden>
            <polygon points="0,120 360,40 520,160 0,160" />
          </svg>
        </div>

        {/* Right: content */}
        <div className="hero-content">
          <h1>
            Transaction <br />
            <span>anytime anywhere</span>
          </h1>
          <p>
            Manage payments, transfers and savings in one secure place. Fast settlements,
            real-time insights and support when you need it.
          </p>

          <div className="cta-row">
            <Link className="btn-primary" to="/login">Get started</Link>
            <Link className="btn-link" to="/register">Create account</Link>
          </div>

          <ul className="trust">
            <li>✓ 256-bit encryption</li>
            <li>✓ UPI & cards supported</li>
            <li>✓ 24×7 support</li>
          </ul>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features">
        <div className="feat">
          <div className="feat-icon">⚡</div>
          <h3>Instant transfers</h3>
          <p>Send and receive money in seconds with zero fuss.</p>
        </div>
        <div className="feat">
          <div className="feat-icon">📈</div>
          <h3>Smart insights</h3>
          <p>Track spends, create goals and stay on budget.</p>
        </div>
        <div className="feat">
          <div className="feat-icon">🛡️</div>
          <h3>Bank-grade security</h3>
          <p>Multi-factor auth and device protection built-in.</p>
        </div>
      </section>

      <footer className="home-foot">
        © {new Date().getFullYear()} Golden Ore Bank. All rights reserved.
      </footer>
    </div>
  );
}
