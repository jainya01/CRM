import { useState } from "react";
import "../App.css";
import User from "../assets/Travel.png";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

function AgentLogin() {
  const API_URL = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();

  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminError("");
    setAdminLoading(true);

    try {
      const response = await axios.post(`${API_URL}/agentlogin`, {
        agent_email: adminUsername,
        agent_password: adminPassword,
      });

      if (response.status === 200) {
        const agent = response.data?.agent ?? null;
        const token = response.data?.token ?? null;

        localStorage.setItem("isAuthenticated", "true");

        if (token) localStorage.setItem("agentToken", token);
        if (agent) {
          localStorage.setItem("agentUser", JSON.stringify(agent));
          localStorage.setItem(
            "agentRole",
            String(agent.role || "agent").toLowerCase()
          );
        }

        localStorage.setItem("role", "agent");

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
    <div className="admin-login-bg d-flex justify-content-center align-items-center">
      <div className="login-card-wrapper col-12 col-md-8 col-lg-5">
        <div className="card shadow-lg border-0 rounded-2 p-4">
          <div className="text-center mb-3">
            <Link to="/">
              <img
                src={User}
                alt="Agent Logo"
                className="crm-logo"
                width={200}
                height={113}
                loading="eager"
                fetchpriority="high"
              />
            </Link>
            <h4 className="text-secondary fw-semibold">Agent Login</h4>
          </div>

          <form onSubmit={handleAdminLogin} className="login-form">
            <div className="mb-3">
              <label className="form-label fw-medium">Email or Username</label>
              <input
                type="text"
                placeholder="Enter your email or username"
                className="form-control form-control-fields rounded-5"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
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
                Agent Login
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

export default AgentLogin;
