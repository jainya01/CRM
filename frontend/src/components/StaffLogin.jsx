import { useState } from "react";
import "../App.css";
import User from "../assets/Travel.png";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

function StaffLogin() {
  const API_URL = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();

  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleStaffLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/stafflogin`, {
        staff_email: staffEmail,
        staff_password: staffPassword,
      });

      if (response.status === 200) {
        const staff = response.data?.staff ?? null;
        const token = response.data?.token ?? null;

        localStorage.setItem("isAuthenticated", "true");

        if (token) localStorage.setItem("staffToken", token);
        if (staff) {
          localStorage.setItem("staffUser", JSON.stringify(staff));
          localStorage.setItem(
            "staffRole",
            String(staff.role || "staff").toLowerCase()
          );
        }

        localStorage.setItem("role", "staff");

        navigate("/admin/dashboard");
        return;
      }
    } catch (err) {
      const msg =
        err.response?.data?.message || "Server error. Please try again";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-bg d-flex justify-content-center align-items-center">
      <div className="login-card-wrapper col-12 col-md-8 col-lg-5">
        <div className="card shadow-lg border-0 rounded-2 p-4">
          <div className="text-center mb-3">
            <Link to="/">
              <img
                src={User}
                alt="Staff Logo"
                className="mb-1 crm-logo"
                loading="eager"
                fetchPriority="high"
                width={200}
                height={100}
              />
            </Link>
            <h4 className="text-secondary fw-semibold">Staff Login</h4>
          </div>

          <form onSubmit={handleStaffLogin} className="login-form">
            <div className="mb-3">
              <label className="form-label fw-medium">Email or Username</label>
              <input
                type="text"
                placeholder="Enter your email or username"
                className="form-control form-control-fields rounded-5"
                value={staffEmail}
                onChange={(e) => setStaffEmail(e.target.value)}
                required
              />
            </div>

            <div className="mb-4 position-relative">
              <label className="form-label fw-medium">Password</label>
              <div className="position-relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  className="form-control form-control-fields rounded-5 pe-5"
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  required
                />
                <FontAwesomeIcon
                  icon={showPassword ? faEyeSlash : faEye}
                  className="password-toggle-icon"
                  onClick={() => setShowPassword((v) => !v)}
                />
              </div>
              {error && <p className="text-danger mt-2">{error}</p>}
            </div>





            <div className="d-grid gap-2">
              <button
                type="submit"
                className="btn btn-admin-login"
                disabled={loading}
              >
                {loading ? "Logging in..." : "Staff Login"}
              </button>
              <Link to="/" className="btn btn-admin-login">
                Back
              </Link>



            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default StaffLogin;
