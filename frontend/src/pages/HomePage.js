// src/pages/HomePage.js
// Landing page: User Login / Registration flow

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { loginAuth, registerAuth } from "../services/api";

const HomePage = () => {
  const { user, loginSuccess, setUser } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (user.role === "driver") navigate("/driver");
      else if (user.role === "passenger") navigate("/passenger");
    }
  }, [user, navigate]);

  const [mode, setMode] = useState("login"); // 'login' | 'register'
  const [role, setRole] = useState("passenger"); // 'passenger' | 'driver'

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    vehicleNumber: "",
    totalSeats: 3,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAdminSelect = () => {
    setUser({ role: "admin", id: "admin", name: "Admin" });
    navigate("/admin");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.email || !form.password) {
      setError("Email and password are required.");
      return;
    }

    if (mode === "register") {
      if (!form.name.trim()) {
        setError("Name is required.");
        return;
      }
      if (role === "driver" && !form.vehicleNumber.trim()) {
        setError("Vehicle number is required.");
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const data = await loginAuth({ email: form.email, password: form.password });
        loginSuccess(data);
        if (data.user.role === "admin") navigate("/admin");
        else if (data.user.role === "driver") navigate("/driver");
        else navigate("/passenger");
      } else {
        const payload = {
          name: form.name,
          email: form.email,
          password: form.password,
          role: role,
        };
        if (role === "driver") {
          payload.vehicleNumber = form.vehicleNumber;
          payload.totalSeats = Number(form.totalSeats);
        }
        
        const data = await registerAuth(payload);
        loginSuccess(data);
        if (role === "driver") navigate("/driver");
        else navigate("/passenger");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>🛺 Rickshaw Matching System</h1>
      </div>

      <div className="container" style={{ maxWidth: 480 }}>
        <div className="card mt-2">
          <div className="card-title text-center">
            {mode === "login" ? "Welcome Back" : "Create an Account"}
          </div>

          {/* Toggle Login/Register */}
          <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "1rem" }}>
            <button
              className={`btn btn-sm ${mode === "login" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => { setMode("login"); setError(""); }}
            >
              Login
            </button>
            <button
              className={`btn btn-sm ${mode === "register" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => { setMode("register"); setError(""); }}
            >
              Register
            </button>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            {mode === "register" && (
              <>
                <div className="form-group">
                  <label>I am a...</label>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <input
                        type="radio"
                        name="role"
                        value="passenger"
                        checked={role === "passenger"}
                        onChange={(e) => setRole(e.target.value)}
                      />
                      🧍 Passenger
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <input
                        type="radio"
                        name="role"
                        value="driver"
                        checked={role === "driver"}
                        onChange={(e) => setRole(e.target.value)}
                      />
                      🛺 Driver
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>

            {mode === "register" && role === "driver" && (
              <>
                <div className="form-group">
                  <label>Vehicle Number</label>
                  <input
                    type="text"
                    placeholder="e.g. JH05-1234"
                    value={form.vehicleNumber}
                    onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Total Seats</label>
                  <select
                    value={form.totalSeats}
                    onChange={(e) => setForm({ ...form, totalSeats: e.target.value })}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <button className="btn btn-primary btn-full mt-2" type="submit" disabled={loading}>
              {loading ? <span className="spinner" /> : mode === "login" ? "Login →" : "Sign Up →"}
            </button>
          </form>

          <hr style={{ margin: "1.5rem 0", border: "0", borderTop: "1px solid var(--border)" }} />
          <div className="text-center">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleAdminSelect}
            >
              ⚙️ System Admin Login
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default HomePage;
