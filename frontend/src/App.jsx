import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "react-toastify/dist/ReactToastify.css";
import User from "./User";
import Dashboard from "./admin/Dashboard";
import StockManagement from "./admin/StockManagement";
import Otb from "./admin/Otb";
import Urase from "./admin/Urase";
import Settings from "./admin/Settings";
import Agent from "./admin/Agent";
import Staff from "./admin/Staff";
import Sales from "./admin/Sales";

function App() {
  return (
    <BrowserRouter basename="/crm">
      <Routes>
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />

        <Route path="/admin" element={<User />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="stockmanagement" element={<StockManagement />} />
          <Route path="OTB" element={<Otb />} />
          <Route path="urase" element={<Urase />} />
          <Route path="settings" element={<Settings />} />
          <Route path="agent" element={<Agent />} />
          <Route path="staff" element={<Staff />} />
          <Route path="sales" element={<Sales />} />
        </Route>

        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
