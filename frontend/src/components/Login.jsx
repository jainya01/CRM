import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import User from "../assets/Travel.png";
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
            loading="eager"
          />

          <h3 className="crm-title">Welcome to Travel CRM</h3>
          <p className="crm-subtitle">Choose your login to continue</p>

          <div className="d-grid gap-3">
            <Link to="/adminlogin" className="crm-btn-primary crm-btn text-decoration-none">
              Admin Login
            </Link>
            <Link to="/agentlogin" className="crm-btn-outline crm-btn text-decoration-none">
              Agent Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
