import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../types";
import "./Auth.css";

export default function Register() {
  const { register, loading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("seeker");
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await register(name, email, password, role);
      navigate("/", { replace: true });
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Registration failed. Please try again.",
      );
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <span className="auth-eyebrow">Get started</span>
        <h1>Create an account</h1>
        <p className="auth-subtitle">Choose how you'll use Estate Grove.</p>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="auth-role-toggle">
          <div
            className={`auth-role-option ${role === "seeker" ? "active" : ""}`}
            onClick={() => setRole("seeker")}
          >
            <strong>Home seeker</strong>
            <span>Browse & enquire</span>
          </div>
          <div
            className={`auth-role-option ${role === "agent" ? "active" : ""}`}
            onClick={() => setRole("agent")}
          >
            <strong>Agent</strong>
            <span>List properties</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="name">Full name</label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <button
            className="btn btn-primary btn-block"
            type="submit"
            disabled={loading}
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
