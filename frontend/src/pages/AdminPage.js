// src/pages/AdminPage.js
// Admin: add and remove stops from the system

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { addStop, deleteStop } from "../services/api";

const AdminPage = () => {
  const { stops, refreshStops, stopsLoading } = useApp();
  const navigate = useNavigate();

  const [name, setName]               = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading]         = useState(false);
  const [deletingId, setDeletingId]   = useState(null);
  const [message, setMessage]         = useState(null); // { type, text }
  const [error, setError]             = useState("");

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleAddStop = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Stop name is required."); return; }

    setLoading(true);
    try {
      await addStop(name.trim(), description.trim());
      await refreshStops();
      setName("");
      setDescription("");
      showMessage("success", `Stop "${name}" added successfully.`);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add stop.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (stop) => {
    if (!window.confirm(`Remove stop "${stop.name}"?`)) return;
    setDeletingId(stop.id);
    try {
      await deleteStop(stop.id);
      await refreshStops();
      showMessage("success", `Stop "${stop.name}" removed.`);
    } catch (err) {
      setError("Failed to remove stop.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>⚙️ Admin — Stop Management</h1>
        <span style={{ cursor: "pointer" }} onClick={() => navigate("/")}>← Home</span>
      </div>

      <div className="container">
        {message && (
          <div className={`alert alert-${message.type}`}>{message.text}</div>
        )}
        {error && <div className="alert alert-error">{error}</div>}

        {/* ── Add Stop Form ─────────────────────────────────────────── */}
        <div className="card">
          <div className="card-title">Add New Stop</div>
          <form onSubmit={handleAddStop}>
            <div className="form-group">
              <label>Stop Name</label>
              <input
                type="text"
                placeholder="e.g. Station Road"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Description (optional)</label>
              <input
                type="text"
                placeholder="e.g. Near Railway Station"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? <><span className="spinner" /> Adding…</> : "+ Add Stop"}
            </button>
          </form>
        </div>

        {/* ── Stops List ────────────────────────────────────────────── */}
        <div className="card">
          <div className="card-title">All Stops ({stops.length})</div>

          {stopsLoading && <p className="text-muted">Loading…</p>}

          {!stopsLoading && stops.length === 0 && (
            <div className="empty-state">No stops added yet.</div>
          )}

          {stops.map((stop) => (
            <div key={stop.id} className="flex-between" style={{
              padding: "0.7rem 0",
              borderBottom: "1px solid var(--border)",
            }}>
              <div>
                <strong>{stop.name}</strong>
                {stop.description && (
                  <div className="text-muted">{stop.description}</div>
                )}
              </div>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => handleDelete(stop)}
                disabled={deletingId === stop.id}
              >
                {deletingId === stop.id ? "Removing…" : "Remove"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
