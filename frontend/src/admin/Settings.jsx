import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";

function Settings() {
  const API_URL = import.meta.env.VITE_API_URL;

  const [logo, setLogo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [emails, setEmails] = useState([]);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailForm, setEmailForm] = useState({ email: "", description: "" });
  const [emailErrors, setEmailErrors] = useState({});
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const fetchLogo = async () => {
      try {
        const response = await axios.get(`${API_URL}/get-logo`, {
          signal: controller.signal,
        });
        const data = response.data;

        if (data.success && data.logo && data.logo.logo) {
          const baseURL = API_URL.replace(/\/api$/, "");
          setLogo(`${baseURL}/uploads/${data.logo.logo}`);
        } else {
          setLogo(null);
        }
      } catch (error) {
        if (axios.isCancel(error)) {
          console.log("Request cancelled:", error.message);
        } else {
          console.error("Error fetching logo:", error);
          setLogo(null);
        }
      }
    };
    fetchLogo();
    return () => {
      controller.abort();
    };
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

  const handleEmailChange = (ev) => {
    const { name, value } = ev.target;
    setEmailForm((s) => ({ ...s, [name]: value }));
    setEmailErrors((s) => ({ ...s, [name]: undefined }));
  };

  const handleEmailSubmit = async (ev) => {
    ev.preventDefault();

    setEmailSubmitting(true);
    try {
      const payload = {
        email: (emailForm.email || "").trim(),
        description: (emailForm.description || "").trim(),
      };

      const response = await axios.post(`${API_URL}/postmail`, payload);

      const isSuccess =
        (response.data && response.data.success === true) ||
        response.status === 200;

      if (isSuccess) {
        const newRow = {
          id: response.data?.insertedId ?? Date.now(),
          email: payload.email,
          description: payload.description,
        };

        setEmails((prev) =>
          Array.isArray(prev) ? [newRow, ...prev] : [newRow]
        );

        setEmailForm({ email: "", description: "" });
        setShowEmailForm(false);

        toast.success("Company email added", {
          position: "bottom-right",
          autoClose: 800,
        });
      } else {
        console.error("API error adding email:", response.data);
        toast.error(response.data?.message || "Failed to add email", {
          position: "bottom-right",
          autoClose: 800,
        });
      }
    } catch (err) {
      console.error("Error adding email:", err);
      toast.error("Failed to add email", {
        position: "bottom-right",
        autoClose: 800,
      });
    } finally {
      setEmailSubmitting(false);
    }
  };

  const handleEmailDelete = async (idOrNull, index = null) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this company email?"
    );
    if (!confirmed) return;

    const idForApi = idOrNull ?? emails[index]?.id ?? null;

    const deletingKey = idForApi ?? index;
    setDeletingId(deletingKey);

    try {
      if (idForApi == null) {
        setEmails((prev) => prev.filter((_, i) => i !== index));
        return;
      }

      const response = await axios.delete(`${API_URL}/emaildelete/${idForApi}`);

      const success =
        (response && response.status === 200) ||
        (response.data &&
          (response.data.success === true ||
            response.data === "deleted" ||
            response.data === "Email deleted" ||
            (typeof response.data === "object" &&
              response.data.message &&
              /deleted/i.test(response.data.message))));

      if (success) {
        setEmails((prev) =>
          prev.filter((e) => String(e.id) !== String(idForApi))
        );
      } else {
        console.error("Delete API responded with:", response.data);
      }
    } catch (err) {
      console.error("Error deleting email:", err);
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    const allemails = async () => {
      try {
        const response = await axios.get(`${API_URL}/allemails`, {
          signal: controller.signal,
        });

        setEmails(response.data.data || []);
      } catch (error) {
        if (axios.isCancel(error)) {
          console.log("Request cancelled:", error.message);
        } else {
          console.error("Error fetching emails:", error);
        }
      }
    };

    allemails();

    return () => {
      controller.abort();
    };
  }, [API_URL]);

  const [showAdminEmail, setShowAdminEmail] = useState(false);
  const [adminEmailSubmitting, setAdminEmailSubmitting] = useState(false);

  const [adminEmail, setAdminEmail] = useState([]);
  const [adminForm, setAdminForm] = useState({ email: "", password: "" });
  const [deletingId1, setDeletingId1] = useState(null);

  const handleAdminEmailSubmit = async (ev) => {
    ev.preventDefault();

    setAdminEmailSubmitting(true);

    try {
      const payload = {
        email: adminForm.email.trim(),
        password: adminForm.password.trim(),
      };

      const response = await axios.post(`${API_URL}/postadminmail`, payload);

      if (response.data && response.data.success) {
        const newAdmin = {
          id: response.data.insertedId,
          email: payload.email,
          role: "admin",
        };

        setAdminEmail((prev) => [newAdmin, ...prev]);

        setAdminForm({ email: "", password: "" });
        setShowAdminEmail(false);

        toast.success("Admin added successfully", {
          position: "bottom-right",
          autoClose: 800,
        });
      } else {
        toast.error(response.data?.message || "Failed to add admin");
      }
    } catch (error) {
      console.error("Error adding admin:", error);
      toast.error("Failed to add admin");
    } finally {
      setAdminEmailSubmitting(false);
    }
  };

  const handleAdminChange = (ev) => {
    const { name, value } = ev.target;
    setAdminForm((s) => ({ ...s, [name]: value }));
  };

  useEffect(() => {
    const allData = async () => {
      try {
        const response = await axios.get(`${API_URL}/alladmindata`);
        setAdminEmail(response.data.data || []);
      } catch (error) {
        console.error("error", error);
      }
    };
    allData();
  }, []);

  return (
    <div className="content-wrapper">
      <div className="d-flex flex-wrap justify-content-evenly mb-0 text-center gap-3 px-1 m-0 py-3 mt-0 header-color">
        <span className="py-1 settings-span">Settings</span>
      </div>

      <div className="container">
        <div className="row mt-4 gx-2 gy-2">
          <div className="col-lg-3 col-md-6 col-sm-6 col-12 d-flex flex-column">
            <button
              type="button"
              className="btn btn-light border w-100 text-start mb-2 d-flex align-items-center justify-content-between"
              onClick={() => setShowAdminEmail((s) => !s)}
              aria-expanded={showAdminEmail}
              aria-controls="company-email-form"
            >
              <span>Add New Admin</span>
              <small className="text-muted">{showAdminEmail ? "−" : "+"}</small>
            </button>

            <div
              id="company-email-form"
              className={`mb-3 collapse ${showAdminEmail ? "show" : ""}`}
            >
              <div className="card shadow-sm rounded-1">
                <div className="card-body p-2">
                  <form onSubmit={handleAdminEmailSubmit}>
                    <div className="mb-2">
                      <label
                        htmlFor="email-input"
                        className="form-label small fw-bold mt-2 mb-2"
                      >
                        Admin Email
                      </label>
                      <input
                        type="text"
                        id="email-input"
                        name="email"
                        value={adminForm.email}
                        onChange={handleAdminChange}
                        className={`form-control form-control-sm ${
                          emailErrors.email ? "is-invalid" : ""
                        }`}
                        placeholder="name@company.com"
                        required
                      />
                    </div>

                    <div className="mb-2">
                      <label
                        htmlFor="desc-input"
                        className="form-label mb-1 small fw-bold mt-2 mb-2"
                      >
                        Password
                      </label>
                      <input
                        type="password"
                        className="form-control form-control-sm"
                        placeholder="Create Password"
                        name="password"
                        value={adminForm.password}
                        onChange={handleAdminChange}
                      />
                    </div>

                    <div className="d-flex gap-2 justify-content-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => {
                          setShowAdminEmail(false);
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-sm btn-success"
                        disabled={adminEmailSubmitting}
                      >
                        {adminEmailSubmitting ? "Adding…" : "Add"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            <div className="email-list">
              {Array.isArray(adminEmail) && adminEmail.length > 0 ? (
                adminEmail.map((data, key) => {
                  const itemId = data?.id ?? `tmp-${key}`;
                  const isRealId = data?.id !== undefined && data?.id !== null;

                  const isDeleting =
                    deletingId1 !== null &&
                    String(deletingId1) === String(itemId);

                  return (
                    <div
                      key={String(itemId)}
                      className="email-row border rounded px-2 py-2 mb-2 d-flex align-items-center justify-content-between"
                    >
                      <div className="flex-grow-1">
                        <div className="email-text small fw-semibold">
                          {data.email}
                        </div>
                      </div>

                      <div className="ms-2 d-flex align-items-center">
                        <button
                          type="button"
                          className="delete-btn btn btn-sm btn-light d-flex align-items-center fw-bold justify-content-center"
                          onClick={() => handleAdminDelete(data?.id, key)}
                          disabled={isDeleting}
                          aria-disabled={isDeleting}
                          title={
                            !isRealId
                              ? "This item is not stored on server — will be removed locally"
                              : "Delete admin"
                          }
                        >
                          {isDeleting ? (
                            <span
                              className="spinner-border spinner-border-sm"
                              role="status"
                              aria-hidden="true"
                            />
                          ) : (
                            "✖"
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-muted small">No admin found.</div>
              )}
            </div>
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
            <button
              type="button"
              className="btn btn-light border w-100 text-start mb-2 d-flex align-items-center justify-content-between"
              onClick={() => setShowEmailForm((s) => !s)}
              aria-expanded={showEmailForm}
              aria-controls="company-email-form"
            >
              <span>Add Company Email</span>
              <small className="text-muted">{showEmailForm ? "−" : "+"}</small>
            </button>

            <div
              id="company-email-form"
              className={`mb-3 collapse ${showEmailForm ? "show" : ""}`}
            >
              <div className="card shadow-sm">
                <div className="card-body p-3">
                  <form onSubmit={handleEmailSubmit}>
                    <div className="mb-2">
                      <label
                        htmlFor="email-input"
                        className="form-label small fw-bold mt-2 mb-2"
                      >
                        Email
                      </label>
                      <input
                        id="email-input"
                        name="email"
                        value={emailForm.email}
                        onChange={handleEmailChange}
                        className={`form-control form-control-sm ${
                          emailErrors.email ? "is-invalid" : ""
                        }`}
                        placeholder="name@company.com"
                        type="email"
                        required
                      />
                    </div>

                    <div className="mb-2">
                      <label
                        htmlFor="desc-input"
                        className="form-label mb-1 small fw-bold mt-2 mb-2"
                      >
                        Description (optional)
                      </label>
                      <textarea
                        id="desc-input"
                        name="description"
                        value={emailForm.description}
                        onChange={handleEmailChange}
                        className={`form-control form-control-sm ${
                          emailErrors.description ? "is-invalid" : ""
                        }`}
                        rows={2}
                        maxLength={250}
                        placeholder="Short note about this email"
                      />
                      <div className="form-text small text-end">
                        {emailForm.description.length}/250
                      </div>
                    </div>

                    <div className="d-flex gap-2 justify-content-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => {
                          setShowEmailForm(false);
                          setEmailErrors({});
                        }}
                        disabled={emailSubmitting}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-sm btn-success"
                        disabled={emailSubmitting}
                      >
                        {emailSubmitting ? "Adding…" : "Add Email"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            <div className="email-list">
              {emails.length === 0 && null}

              {Array.isArray(emails) && emails.length > 0 ? (
                emails.map((data, key) => {
                  const itemId = data?.id ?? key;
                  const isDeleting =
                    deletingId !== null &&
                    (deletingId === itemId || deletingId === key);

                  return (
                    <div
                      key={itemId}
                      className="email-row border rounded px-2 py-2 mb-2 d-flex align-items-center justify-content-between"
                    >
                      <div className="flex-grow-1">
                        <div className="email-text small fw-semibold">
                          {data.email}
                        </div>
                      </div>

                      <div className="ms-2 d-flex align-items-center">
                        <button
                          type="button"
                          className="delete-btn btn btn-sm btn-light d-flex align-items-center justify-content-center"
                          onClick={() => handleEmailDelete(itemId, key)}
                          disabled={isDeleting}
                          aria-disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <span
                              className="spinner-border spinner-border-sm"
                              role="status"
                              aria-hidden="true"
                            ></span>
                          ) : (
                            "❌"
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-muted small">No emails found.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ToastContainer />
    </div>
  );
}

export default Settings;
