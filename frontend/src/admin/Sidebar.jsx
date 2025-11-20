import React, { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import "../App.css";
import Travels from "../assets/Travel.png";
import axios from "axios";

const navLinks = [
  { path: "/admin/dashboard", label: "Dashboard", exact: true },
  { path: "/admin/stockmanagement", label: "Stock Management" },
  { path: "/admin/sales", label: "Sales" },
  { path: "/admin/OTB", label: "OTB" },
  { path: "/admin/urase", label: "URASE" },
  { path: "/admin/agent", label: "Add Agent" },
  { path: "/admin/staff", label: "Add Staff" },
  { path: "/admin/settings", label: "Settings" },
];

export default function Sidebar() {
  const API_URL = import.meta.env.VITE_API_URL;

  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);

  const [logo, setLogo] = useState(null);

  useEffect(() => {
    const mainLogo = async () => {
      try {
        const response = await axios.get(`${API_URL}/get-logo`);
        const data = response.data;
        if (data.success && data.logo && data.logo.logo) {
          const baseURL = API_URL.replace(/\/api$/, "");
          setLogo(`${baseURL}/uploads/${data.logo.logo}`);
        } else {
          setLogo(null);
        }
      } catch (error) {
        console.error("Error fetching logo:", error);
        setLogo(null);
      }
    };

    mainLogo();
  }, [API_URL]);

  return (
    <>
      <nav className="navbar navbar-light bg-light d-md-none mobile-navbar-toggle">
        <div className="container-fluid">
          <button
            className="btn btn-outline-secondary hamburger-btn"
            onClick={toggleSidebar}
          >
            ☰
          </button>

          <Link to="/admin/dashboard">
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
            <Link to="/admin/dashboard">
              <img
                src={logo || Travels}
                alt="logo"
                className="logo-image mb-0"
                loading="eager"
                style={{ width: "106px", height: "50px" }}
              />
            </Link>
            <button className="btn-closed" onClick={closeSidebar}>
              ❌
            </button>
          </div>

          <div className="list-group list-group-flush">
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                end={link.exact}
                className={({ isActive }) =>
                  "list-group-item list-group-item-action " +
                  (isActive ? "active" : "")
                }
                onClick={closeSidebar}
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        </div>
      </div>

      <aside
        className="d-none d-md-block admin-sidebar"
        aria-label="Admin sidebar"
      >
        <div className="p-0">
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
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                end={link.exact}
                className={({ isActive }) =>
                  "list-group-item list-group-item-action" +
                  (isActive ? "active" : "")
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        </div>
      </aside>

      <div className="content-wrapper"></div>
    </>
  );
}
