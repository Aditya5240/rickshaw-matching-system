// src/components/EditProfileModal.js
import React, { useState } from "react";
import { updateMyProfile } from "../services/api";
import { useApp } from "../context/AppContext";
import "./EditProfileModal.css";

const EditProfileModal = ({ isOpen, onClose }) => {
  const { user, setUser } = useApp();
  
  const [form, setForm] = useState({
    name: user?.name || "",
    password: "", // Leave blank to not change
    vehicleNumber: user?.vehicleNumber || "",
    totalSeats: user?.totalSeats || 3,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (user?.role === "driver" && !form.vehicleNumber.trim()) {
      setError("Vehicle number is required.");
      return;
    }

    setLoading(true);
    try {
      const payload = { name: form.name };
      if (form.password) payload.password = form.password;
      if (user?.role === "driver") {
        payload.vehicleNumber = form.vehicleNumber;
        payload.totalSeats = Number(form.totalSeats);
      }

      const updatedUser = await updateMyProfile(payload);
      setUser(updatedUser);
      setSuccess("Profile updated successfully!");
      setTimeout(() => {
        onClose();
        setSuccess("");
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content card">
        <div className="card-title">Edit Profile</div>
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>New Password (Optional)</label>
            <input
              type="password"
              placeholder="Leave blank to keep same"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          {user?.role === "driver" && (
            <>
              <div className="form-group">
                <label>Vehicle Number</label>
                <input
                  type="text"
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

          <div className="flex-between mt-2">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;
