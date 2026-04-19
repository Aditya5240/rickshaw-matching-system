// src/context/AppContext.js
// Global state: current user identity (passenger or driver), stops list

import React, { createContext, useContext, useState, useEffect } from "react";
import { fetchStops } from "../services/api";

const AppContext = createContext(null);

/**
 * Provides global app state to all children.
 * Stores the active user session and the list of stops.
 */
export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);       // { role, id, name, vehicleNumber?, totalSeats? }
  const [stops, setStops] = useState([]);
  const [stopsLoading, setStopsLoading] = useState(false);
  const [stopsError, setStopsError] = useState(null);

  // Load stops once on mount
  useEffect(() => {
    const loadStops = async () => {
      setStopsLoading(true);
      try {
        const data = await fetchStops();
        setStops(data);
      } catch (err) {
        setStopsError("Failed to load stops. Please refresh.");
      } finally {
        setStopsLoading(false);
      }
    };
    loadStops();
  }, []);

  const refreshStops = async () => {
    try {
      const data = await fetchStops();
      setStops(data);
    } catch (err) {
      // silently fail on refresh
    }
  };

  const logout = () => setUser(null);

  return (
    <AppContext.Provider value={{ user, setUser, logout, stops, stopsLoading, stopsError, refreshStops }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};
