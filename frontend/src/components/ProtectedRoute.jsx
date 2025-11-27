import { Navigate, Outlet, useLocation } from "react-router-dom";

const getStoredRole = () => {
  const keys = ["role", "adminRole", "agentRole", "userRole"];

  for (const k of keys) {
    const v = localStorage.getItem(k);
    if (v) return String(v).toLowerCase();
  }

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
  if (localStorage.getItem("agentToken")) return "agent";

  return null;
};

const ProtectedRoute = () => {
  const location = useLocation();

  const adminToken = !!localStorage.getItem("adminToken");
  const agentToken = !!localStorage.getItem("agentToken");
  const isAuthFlag = localStorage.getItem("isAuthenticated") === "true";

  const isAuthenticated = isAuthFlag || adminToken || agentToken;
  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  const role = getStoredRole();

  if (role === "admin" || role === "superadmin") {
    return <Outlet />;
  }

  if (role === "agent") {
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
