import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import "../App.css";
import Travels from "../assets/Travel.webp";
import axios from "axios";

const NAV_LINKS = [
  { path: "/admin/dashboard", label: "Dashboard", exact: true },
  { path: "/admin/stockmanagement", label: "Stock Management" },
  { path: "/admin/sales", label: "Sales" },
  { path: "/admin/editsales", label: "Edit Sales" },
  { path: "/admin/salesdone", label: "Sales Done" },
  { path: "/admin/OTB", label: "OTB" },
  { path: "/admin/urase", label: "URASE" },
  { path: "/admin/agent", label: "Add Agent" },
  { path: "/admin/staff", label: "Add Staff" },
  { path: "/admin/settings", label: "Settings" },
];

const resolveRole = () => {
  const keys = ["role", "adminRole", "agentRole", "staffRole"];
  for (const k of keys) {
    const v = localStorage.getItem(k);
    if (v) return String(v).toLowerCase();
  }

  try {
    const staffUserRaw = localStorage.getItem("staffUser");
    if (staffUserRaw) {
      const parsed = JSON.parse(staffUserRaw);
      if (parsed?.role) return String(parsed.role).toLowerCase();
    }
  } catch (_) {}

  try {
    const adminUserRaw = localStorage.getItem("adminUser");
    if (adminUserRaw) {
      const parsed = JSON.parse(adminUserRaw);
      if (parsed?.role) return String(parsed.role).toLowerCase();
    }
  } catch (_) {}

  try {
    const agentUserRaw = localStorage.getItem("agentUser");
    if (agentUserRaw) {
      const parsed = JSON.parse(agentUserRaw);
      if (parsed?.role) return String(parsed.role).toLowerCase();
    }
  } catch (_) {}

  if (localStorage.getItem("adminToken")) return "admin";
  if (localStorage.getItem("agentToken")) return "agent";
  if (localStorage.getItem("staffToken")) return "staff";

  return null;
};

export default function Sidebar() {
  const API_URL = import.meta.env.VITE_API_URL;

  const [isOpen, setIsOpen] = useState(false);
  const [logo, setLogo] = useState(null);
  const [otb, setOtb] = useState([]);
  const [blinkOTB, setBlinkOTB] = useState(false);
  const [blinkURASE, setBlinkURASE] = useState(false);
  const navigate = useNavigate();
  const role = resolveRole();
  const location = useLocation();

  const uploadsBase = API_URL
    ? API_URL.replace(/\/api\/?$/, "") + "/uploads"
    : "/uploads";

  useEffect(() => {
    const mainLogo = async () => {
      try {
        const response = await axios.get(`${API_URL}/get-logo`);

        let logoUrl = null;

        if (response.data?.logo?.logo) {
          logoUrl = `${uploadsBase}/${response.data.logo.logo}`;
        }

        if (logoUrl) {
          setLogo(`${logoUrl}?v=${Date.now()}`);
        } else {
          setLogo(null);
        }
      } catch (error) {
        console.error("Logo fetch error:", error);
        setLogo(null);
      }
    };

    mainLogo();
  }, [API_URL, uploadsBase]);

  useEffect(() => {
    const lastSeenOTB =
      parseInt(localStorage.getItem("lastSeenOTBCreatedAt")) || 0;
    const lastSeenURASE =
      parseInt(localStorage.getItem("lastSeenURASECreatedAt")) || 0;

    const fetchAllotbs = async () => {
      try {
        const response = await axios.get(`${API_URL}/allotbs`);
        const data = response.data?.data || [];
        setOtb(data);

        const uraseIds = data.map((item) => item.id);
        localStorage.setItem("uraseIds", uraseIds.join(","));

        const blockedIds = (localStorage.getItem("uraseBlockedIds") || "")
          .split(",")
          .filter(Boolean)
          .map(Number);

        const hasActiveUrase = uraseIds.some((id) => !blockedIds.includes(id));

        if (data.length > 0) {
          const latestCreated = new Date(data[0].created_at).getTime();

          if (
            latestCreated > lastSeenOTB &&
            location.pathname !== "/admin/OTB"
          ) {
            setBlinkOTB(true);
          }

          if (latestCreated > lastSeenURASE && hasActiveUrase) {
            setBlinkURASE(true);
          } else {
            setBlinkURASE(false);
          }
        } else {
          setBlinkURASE(false);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchAllotbs();
    const interval = setInterval(fetchAllotbs, 1000);
    return () => clearInterval(interval);
  }, [API_URL, location.pathname]);

  const toggleSidebar = () => setIsOpen((s) => !s);
  const closeSidebar = () => setIsOpen(false);

  const handleLogout = (e) => {
    if (e?.stopPropagation) e.stopPropagation();
    [
      "isAuthenticated",
      "adminToken",
      "staffToken",
      "agentToken",
      "adminUser",
      "staffUser",
      "agentUser",
      "role",
      "adminRole",
      "staffRole",
      "agentRole",
    ].forEach((k) => localStorage.removeItem(k));
    closeSidebar();
    navigate("/", { replace: true });
  };

  let visibleLinks = NAV_LINKS;

  if (role === "staff" || role === "agent") {
    visibleLinks = NAV_LINKS.filter((l) => l.path === "/admin/dashboard");
  }

  const handleOTBClick = () => {
    if (otb.length > 0) {
      const latestOTB = new Date(otb[0].created_at).getTime();
      localStorage.setItem("lastSeenOTBCreatedAt", latestOTB);
      setBlinkOTB(false);
    }
  };

  return (
    <>
      <nav className="navbar navbar-light bg-light d-md-none mobile-navbar-toggle">
        <div className="container-fluid">
          <button
            className="btn btn-outline-secondary hamburger-btn"
            onClick={toggleSidebar}
            aria-label="Open sidebar"
          >
            ☰
          </button>
          <Link to="/admin/dashboard" onClick={closeSidebar}>
            <img
              src={logo || Travels}
              alt="logo"
              className="logo-image mb-0"
              loading="eager"
              style={{ width: "108px", height: "50px" }}
            />
          </Link>
        </div>
      </nav>

      {isOpen && <div className="mobile-overlay" onClick={closeSidebar}></div>}

      <div className={`mobile-sidebar d-md-none ${isOpen ? "open" : ""}`}>
        <div className="p-0">
          <div className="d-flex justify-content-between align-items-center">
            <Link to="/admin/dashboard" onClick={closeSidebar}>
              <img
                src={logo || Travels}
                alt="logo"
                className="logo-image mb-0"
                loading="eager"
                style={{ width: "106px", height: "50px" }}
              />
            </Link>
            <button
              className="btn-closed"
              onClick={closeSidebar}
              aria-label="Close sidebar"
            >
              ❌
            </button>
          </div>

          <div className="list-group list-group-flush">
            {visibleLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                end={link.exact}
                className={({ isActive }) =>
                  [
                    "list-group-item rounded-0 list-group-item-action",
                    isActive ? "active" : "",
                  ].join(" ")
                }
                onClick={() => {
                  closeSidebar();
                  if (link.path === "/admin/OTB") handleOTBClick();
                }}
              >
                {link.label}
                {link.path === "/admin/OTB" && blinkOTB && (
                  <div className="blink-box ms-2"></div>
                )}
                {link.path === "/admin/urase" && blinkURASE && (
                  <div className="blink-box ms-2"></div>
                )}
              </NavLink>
            ))}
          </div>

          <div className="p-3">
            <button
              className="btn text-danger fw-bold text-start w-100"
              onClick={handleLogout}
              type="button"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <aside
        className="d-none d-md-block admin-sidebar"
        aria-label="Admin sidebar"
      >
        <div className="p-0 d-flex flex-column" style={{ minHeight: "100%" }}>
          <Link to="/admin/dashboard">
            <img
              src={logo || Travels}
              alt="logo"
              className="logo-image mb-2 mt-2 ms-2"
              loading="eager"
              style={{ width: "206px", height: "70px" }}
            />
          </Link>

          <div className="list-group rounded-0">
            {visibleLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                end={link.exact}
                className={({ isActive }) =>
                  [
                    "list-group-item rounded-0 list-group-item-action",
                    isActive ? "active" : "",
                  ].join(" ")
                }
                onClick={() => {
                  if (link.path === "/admin/OTB") handleOTBClick();
                }}
              >
                {link.label}
                {link.path === "/admin/OTB" && blinkOTB && (
                  <div className="blink-box ms-2 mb-0 p-0"></div>
                )}
                {link.path === "/admin/urase" && blinkURASE && (
                  <div className="blink-box ms-2 mb-0 p-0"></div>
                )}
              </NavLink>
            ))}
          </div>

          <div className="p-3">
            <button
              className="btn text-danger fw-bold w-100 text-start"
              onClick={handleLogout}
              type="button"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      <div className="content-wrapper"></div>
    </>
  );
}
