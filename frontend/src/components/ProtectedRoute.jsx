import { Navigate, Outlet, useLocation } from "react-router-dom";

const getStoredRole = () => {
  const keys = ["role", "adminRole", "agentRole", "staffRole", "userRole"];

  for (const k of keys) {
    const v = localStorage.getItem(k);
    if (v) return String(v).toLowerCase();
  }

  try {
    const staffUserRaw = localStorage.getItem("staffUser");
    if (staffUserRaw) {
      const staffUser = JSON.parse(staffUserRaw);
      if (staffUser?.role) return String(staffUser.role).toLowerCase();
    }
  } catch (_) {}

  try {
    const adminUserRaw = localStorage.getItem("adminUser");
    if (adminUserRaw) {
      const adminUser = JSON.parse(adminUserRaw);
      if (adminUser?.role) return String(adminUser.role).toLowerCase();
    }
  } catch (_) {}

  try {
    const agentUserRaw = localStorage.getItem("agentUser");
    if (agentUserRaw) {
      const agentUser = JSON.parse(agentUserRaw);
      if (agentUser?.role) return String(agentUser.role).toLowerCase();
    }
  } catch (_) {}

  if (localStorage.getItem("adminToken")) return "admin";
  if (localStorage.getItem("staffToken")) return "staff";
  if (localStorage.getItem("agentToken")) return "agent";

  return null;
};

const ProtectedRoute = () => {
  const location = useLocation();

  const adminToken = !!localStorage.getItem("adminToken");
  const staffToken = !!localStorage.getItem("staffToken");
  const agentToken = !!localStorage.getItem("agentToken");
  const isAuthFlag = localStorage.getItem("isAuthenticated") === "true";

  const isAuthenticated = isAuthFlag || adminToken || staffToken || agentToken;
  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  const role = getStoredRole();

  if (role === "admin" || role === "superadmin") {
    return <Outlet />;
  }

  if (role === "agent" || role === "staff") {
    const pathname = location.pathname;
    const allowedRoots = ["/admin/dashboard"];

    const allowed = allowedRoots.some(
      (root) => pathname === root || pathname.startsWith(root + "/")
    );

    if (allowed) return <Outlet />;

    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Navigate to="/" replace />;
};

export default ProtectedRoute;
