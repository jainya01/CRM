import { useState } from "react";
import "../App.css";
import User from "../assets/Travel.webp";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

function AdminLogin() {
  const API_URL = import.meta.env.VITE_API_URL;

  const navigate = useNavigate();
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminError("");
    setAdminLoading(true);

    try {
      const response = await axios.post(`${API_URL}/adminlogin`, {
        email: adminEmail,
        password: adminPassword,
      });

      if (response.status === 200) {
        const admin = response.data?.admin ?? null;
        const token = response.data?.token ?? null;

        localStorage.setItem("isAuthenticated", "true");
        if (token) localStorage.setItem("adminToken", token);

        if (admin) {
          localStorage.setItem("adminUser", JSON.stringify(admin));
          const normalizedRole = String(admin.role || "admin").toLowerCase();
          localStorage.setItem("adminRole", normalizedRole);
          localStorage.setItem("role", normalizedRole);
        } else {
          localStorage.setItem("role", "admin");
        }

        navigate("/admin/dashboard");
        return;
      }
    } catch (err) {
      const msg =
        err.response?.data?.message || "Server error. Please try again";
      setAdminError(msg);
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <main className="admin-login-bg d-flex justify-content-center align-items-center">
      <div className="login-card-wrapper">
        <div className="card shadow-lg border-0 p-4">
          <div className="text-center mb-3">
            <Link to="/">
              <img
                src={User}
                alt="Admin Logo"
                className="crm-logo"
                width={200}
                height={113}
                loading="eager"
                fetchpriority="high"
              />
            </Link>
            <h4 className="text-secondary fw-semibold">Admin Login</h4>
          </div>

          <form onSubmit={handleAdminLogin}>
            <div className="mb-3">
              <label className="form-label fw-medium">Email</label>
              <input
                type="email"
                placeholder="Enter your email"
                className="form-control form-control-fields rounded-5"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
              />
            </div>

            <div className="mb-4 position-relative">
              <label className="form-label fw-medium">Password</label>
              <div className="position-relative">
                <input
                  type={showAdminPassword ? "text" : "password"}
                  placeholder="Password"
                  className="form-control form-control-fields rounded-5 pe-5"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                />
                <FontAwesomeIcon
                  icon={showAdminPassword ? faEyeSlash : faEye}
                  className="password-toggle-icon"
                  onClick={() => setShowAdminPassword((v) => !v)}
                />
              </div>

              {adminError && <p className="text-danger mt-2">{adminError}</p>}
            </div>

            <div className="d-grid gap-2">
              <button type="submit" className="btn btn-admin-login">
                Admin Login
              </button>

              <Link to="/" className="btn btn-admin-login">
                Back
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

export default AdminLogin;
