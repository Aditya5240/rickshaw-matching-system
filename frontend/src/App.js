// src/App.js
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "./context/AppContext";
import HomePage from "./pages/HomePage";
import PassengerPage from "./pages/PassengerPage";
import DriverPage from "./pages/DriverPage";
import AdminPage from "./pages/AdminPage";
import "./index.css";

// Guard: redirect to home if no user session
const ProtectedRoute = ({ children, role }) => {
  const { user } = useApp();
  if (!user) return <Navigate to="/" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route
      path="/passenger"
      element={
        <ProtectedRoute role="passenger">
          <PassengerPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/driver"
      element={
        <ProtectedRoute role="driver">
          <DriverPage />
        </ProtectedRoute>
      }
    />
    <Route path="/admin" element={<AdminPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const App = () => (
  <AppProvider>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </AppProvider>
);

export default App;
