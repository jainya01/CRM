import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "react-toastify/dist/ReactToastify.css";
import Login from "./components/Login";
import AdminLogin from "./components/AdminLogin";
import AgentLogin from "./components/AgentLogin";
import ProtectedRoute from "./components/ProtectedRoute";
import User from "./User";
import Dashboard from "./admin/Dashboard";
import StockManagement from "./admin/StockManagement";
import Otb from "./admin/Otb";
import Urase from "./admin/Urase";
import Settings from "./admin/Settings";
import Agent from "./admin/Agent";
import Staff from "./admin/Staff";
import Sales from "./admin/Sales";
import StaffLogin from "./components/StaffLogin";

function App() {
  return (
    <BrowserRouter basename="/crm">
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/adminlogin" element={<AdminLogin />} />
        <Route path="/agentlogin" element={<AgentLogin />} />
        <Route path="/stafflogin" element={<StaffLogin />} />

        <Route element={<ProtectedRoute />}>
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
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
