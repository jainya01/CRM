import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";

function Settings() {
  const API_URL = import.meta.env.VITE_API_URL;

  const [emails, setEmails] = useState([
    { email: "alhamadtravels@gmail.com" },
    { email: "info@alhamadtravels.com" },
    { email: "support@alhamadtravels.com" },
    { email: "booking@alhamadtravels.com" },
  ]);

  const [logo, setLogo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLogo = async () => {
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

    fetchLogo();
  }, [API_URL]);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleLogoUpload = async () => {
    if (!file) {
      toast.warning("Please select a logo first!", {
        position: "bottom-right",
        autoClose: 1000,
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/change-logo`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.success) {
        const baseURL = API_URL.replace(/\/api$/, "");
        setLogo(`${baseURL}/uploads/${response.data.file.filename}`);
        setPreview(null);
        setFile(null);

        toast.success("Logo updated successfully!", {
          position: "bottom-right",
          autoClose: 800,
        });
      }
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Failed to upload logo. Please try again.", {
        position: "bottom-right",
        autoClose: 800,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content-wrapper">
      <div className="d-flex flex-wrap justify-content-evenly mb-0 text-center gap-3 px-1 m-0 py-3 mt-0 header-color">
        <span className="py-1 settings-span">Settings</span>
      </div>

      <div className="container">
        <div className="row mt-4 gx-2 gy-2">
          <div className="col-lg-3 col-md-6 col-sm-6 col-12">
            <Link className="btn btn-light border w-100 text-start">
              Change Username
            </Link>
          </div>

          <div className="col-lg-3 col-md-6 col-sm-6 col-12">
            <Link className="btn btn-light border w-100 text-start">
              Change Password
            </Link>
          </div>

          <div className="col-lg-3 col-md-6 col-sm-6 col-12">
            <div
              className="border rounded p-3 d-flex flex-column align-items-center"
              style={{
                backgroundColor: "#f8f9fa",
                minHeight: "160px",
                justifyContent: "center",
              }}
            >
              <label
                htmlFor="logo-upload"
                className="btn btn-light border w-100 text-center"
                style={{ cursor: "pointer" }}
              >
                {loading ? "Uploading..." : "Select Logo"}
              </label>

              <input
                type="file"
                id="logo-upload"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />

              <div
                className="mt-3 border p-2 bg-white d-flex justify-content-center align-items-center"
                style={{
                  width: "100%",
                  height: "100px",
                  borderRadius: "8px",
                }}
              >
                <img
                  src={preview || logo}
                  alt="Current Logo"
                  onError={(e) => (e.target.src = Travels)}
                  loading="lazy"
                  onClick={() => document.getElementById("logo-upload").click()}
                  style={{
                    width: "auto",
                    height: "80px",
                    objectFit: "contain",
                    cursor: "pointer",
                  }}
                />
              </div>

              <div className="mt-2">
                <button
                  className="btn btn-success"
                  onClick={handleLogoUpload}
                  disabled={loading}
                >
                  {loading ? "Updating..." : "Change"}
                </button>
              </div>
            </div>
          </div>

          <div className="col-lg-3 col-md-6 col-sm-6 col-12 d-flex flex-column">
            <Link className="btn btn-light border w-100 text-start mb-2">
              Add Company Email
            </Link>

            <div className="email-list">
              {emails.map((data, key) => (
                <div
                  key={key}
                  className="email-row border px-2 py-2 mb-2 d-flex align-items-center"
                >
                  <span className="email-text">{data.email}</span>

                  <span className="email-divider" aria-hidden />

                  <button
                    type="button"
                    className="delete-btn btn btn-sm btn-light"
                  >
                    ❌
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ToastContainer />
    </div>
  );
}

export default Settings;
