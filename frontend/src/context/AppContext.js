// src/context/AppContext.js
// Global state: current user session, stops list

import React, { createContext, useContext, useState, useEffect } from "react";
import { fetchStops, fetchMyProfile } from "../services/api";

const AppContext = createContext(null);

/**
 * Provides global app state to all children.
 * Stores the active user session and the list of stops.
 */
export const AppProvider = ({ children }) => {
  const [user, setUserState] = useState(null); // { role, id, name, vehicleNumber?, totalSeats?, email? }
  const [authLoading, setAuthLoading] = useState(true);
  const [stops, setStops] = useState([]);
  const [stopsLoading, setStopsLoading] = useState(false);
  const [stopsError, setStopsError] = useState(null);

  // Expose setUser securely: when set, sync to localStorage (but not token, that's done by login)
  const setUser = (newUser) => {
    setUserState(newUser);
    if (newUser) {
      localStorage.setItem("user", JSON.stringify(newUser));
    } else {
      localStorage.removeItem("user");
    }
  };

  // Restoring user session on initial reload
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");
      
      if (token && storedUser) {
        try {
          setUserState(JSON.parse(storedUser));
          const profile = await fetchMyProfile();
          setUserState(profile);
          localStorage.setItem("user", JSON.stringify(profile));
        } catch (err) {
          console.error("Session restore failed", err);
          logout();
        }
      }
      setAuthLoading(false);
    };
    restoreSession();
  }, []);

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

  const loginSuccess = (authData) => {
    localStorage.setItem("token", authData.token);
    setUser(authData.user);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUserState(null);
  };

  if (authLoading) {
    return <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh'}}>Loading...</div>;
  }

  return (
    <AppContext.Provider value={{ user, setUser, loginSuccess, logout, stops, stopsLoading, stopsError, refreshStops }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};
