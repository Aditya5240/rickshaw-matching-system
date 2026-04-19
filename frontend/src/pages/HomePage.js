// src/pages/HomePage.js
// Landing page: user selects role (Passenger / Driver / Admin) and enters name

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { registerDriver } from "../services/api";
import { v4 as uuidv4 } from "uuid";

// Simple inline uuid fallback if package not available
const genId = () => Math.random().toString(36).slice(2, 10);

const HomePage = () => {
  const { setUser } = useApp();
  const navigate = useNavigate();

  const [step, setStep] = useState("role");  // 'role' | 'form'
  const [selectedRole, setSelectedRole] = useState(null);
  const [form, setForm] = useState({ name: "", vehicleNumber: "", totalSeats: 3 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRoleSelect = (role) => {
    if (role === "admin") {
      setUser({ role: "admin", id: "admin", name: "Admin" });
      navigate("/admin");
      return;
    }
    setSelectedRole(role);
    setStep("form");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) { setError("Name is required"); return; }

    setLoading(true);
    try {
      if (selectedRole === "driver") {
        if (!form.vehicleNumber.trim()) { setError("Vehicle number is required"); setLoading(false); return; }
        const driver = await registerDriver({
          name: form.name,
          vehicleNumber: form.vehicleNumber,
          totalSeats: Number(form.totalSeats),
        });
        setUser({ role: "driver", id: driver.id, name: driver.name, vehicleNumber: driver.vehicleNumber, totalSeats: driver.totalSeats });
        navigate("/driver");
      } else {
        // Passenger: no backend registration needed
        setUser({ role: "passenger", id: genId(), name: form.name });
        navigate("/passenger");
      }
    } catch (err) {
      setError("Failed to connect. Please check server and try again.");
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
        {step === "role" && (
          <>
            <p className="text-muted mt-2 text-center" style={{ marginBottom: "0.5rem" }}>
              Select your role to continue
            </p>
            <div className="role-grid">
              <div className="role-card" onClick={() => handleRoleSelect("passenger")}>
                <span className="icon">🧍</span>
                <div className="label">Passenger</div>
                <div className="sub">Request a rickshaw ride</div>
              </div>
              <div className="role-card" onClick={() => handleRoleSelect("driver")}>
                <span className="icon">🛺</span>
                <div className="label">Driver</div>
                <div className="sub">Accept ride requests</div>
              </div>
            </div>
            <div
              className="role-card"
              style={{ textAlign: "center", cursor: "pointer" }}
              onClick={() => handleRoleSelect("admin")}
            >
              <span className="icon" style={{ fontSize: "1.5rem" }}>⚙️</span>
              <div className="label">Admin — Manage Stops</div>
            </div>
          </>
        )}

        {step === "form" && (
          <div className="card mt-2">
            <div className="card-title">
              {selectedRole === "passenger" ? "🧍 Passenger Details" : "🛺 Driver Details"}
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Your Name</label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              {selectedRole === "driver" && (
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
                {loading ? <span className="spinner" /> : "Continue →"}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-full mt-1"
                onClick={() => { setStep("role"); setError(""); }}
              >
                ← Back
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
