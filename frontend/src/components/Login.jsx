import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import User from "../assets/Travel.webp";
import "../App.css";

const Login = () => {
  const [showCard, setShowCard] = useState(false);

  useEffect(() => {
    setTimeout(() => setShowCard(true), 100);
  }, []);

  return (
    <div className="crm-welcome-bg">
      <div
        className={`crm-login-wrapper col-12 col-sm-12 col-md-6 col-lg-4 ${
          showCard ? "crm-fade-in" : "crm-hidden-card"
        }`}
      >
        <div className="crm-login-card rounded-3 col-lg-12 col-md-12 col-11">
          <img
            src={User}
            alt="User Logo"
            className="crm-logo"
            width={200}
            height={113}
            loading="eager"
            fetchpriority="high"
          />

          <h3 className="crm-title">Welcome to Travel CRM</h3>
          <p className="crm-subtitle">Choose your login to continue</p>

          <div className="d-grid gap-3 crm-group">
            <Link
              to="/adminlogin"
              className="crm-btn crm-btn-primary-default text-decoration-none"
            >
              Admin Login
            </Link>

            <Link
              to="/agentlogin"
              className="crm-btn crm-btn-outline-default text-decoration-none"
            >
              Agent Login
            </Link>

            <Link
              to="/stafflogin"
              className="crm-btn crm-btn-outline-default text-decoration-none"
            >
              Staff Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
