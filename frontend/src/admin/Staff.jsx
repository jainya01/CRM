import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import "../App.css";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import { Link } from "react-router-dom";

function Staff() {
  const API_URL = import.meta.env.VITE_API_URL;

  const [agent, setAgent] = useState({
    staff_agent: "",
    staff_email: "",
    staff_password: "",
  });

  const [staffList, setStaffList] = useState([]);
  const [dropdownIndex, setDropdownIndex] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);

  const [editValues, setEditValues] = useState({
    staff_agent: "",
    staff_email: "",
    staff_password: "",
  });

  const [search, setSearch] = useState("");
  const editNameRef = useRef(null);

  const fetchStaff = useCallback(
    async ({ force = false, signal } = {}) => {
      if (editingIndex !== null && !force) return;

      try {
        const response = await axios.get(`${API_URL}/allstaffs`, { signal });

        const staffRaw = response.data?.data || [];

        const formattedData = staffRaw.map((s) => ({
          staff_agent: s.staff_agent ?? "",
          staff_email: s.staff_email ?? "",
          staff_password: s.staff_password ?? "",
          raw: {
            ...s,
            can_view_fares: Number(s.can_view_fares) === 1 ? 1 : 0,
          },
        }));

        setStaffList(formattedData);
        return formattedData;
      } catch (error) {
        if (axios.isCancel?.(error)) {
          console.log("FetchStaff cancelled");
        } else {
          console.error("❌ Error fetching staff:", error);
        }
        throw error;
      }
    },
    [API_URL, editingIndex]
  );

  useEffect(() => {
    const controller = new AbortController();

    fetchStaff({ force: true, signal: controller.signal }).catch(() => {});

    return () => {
      controller.abort();
    };
  }, [fetchStaff]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAgent((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post(`${API_URL}/staffpost`, agent, {
        headers: { "Content-Type": "application/json" },
      });

      if (response.data?.success) {
        toast.success(response.data.message || "Staff added successfully!");

        setAgent({
          staff_agent: "",
          staff_email: "",
          staff_password: "",
        });

        fetchStaff({ force: true });
      } else {
        toast.error(response.data?.message || "Something went wrong");
      }
    } catch (err) {
      console.error("Error in handleSubmit:", err);
      toast.error("Server connection failed.");
    }
  };

  const toggleDropdown = (index, e) => {
    if (e) e.stopPropagation();
    if (dropdownIndex === index) {
      setDropdownIndex(null);
      return;
    }
    setEditingIndex(null);
    setDropdownIndex(index);
  };

  const startEdit = (index, staff, e) => {
    if (e) e.stopPropagation();
    if (editingIndex === index) {
      setEditingIndex(null);
      return;
    }
    setEditingIndex(index);
    setDropdownIndex(null);
    setEditValues({
      staff_agent: staff.staff_agent ?? "",
      staff_email: staff.staff_email ?? "",
      staff_password: "",
    });

    setTimeout(() => {
      editNameRef.current?.focus();
      const el = editNameRef.current;
      if (el && typeof el.selectionStart === "number") {
        const len = el.value?.length ?? 0;
        el.setSelectionRange(len, len);
      }
    }, 0);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditValues((prev) => ({ ...prev, [name]: value }));
  };

  const cancelEdit = (e) => {
    if (e) e.stopPropagation();
    setEditingIndex(null);
  };

  const saveEdit = async (displayedIndex, e) => {
    if (e) e.stopPropagation();

    const displayedStaff = staffList.filter((s) => {
      const q = search.trim().toLowerCase();
      return (
        !q ||
        s.staff_agent?.toLowerCase().includes(q) ||
        s.staff_email?.toLowerCase().includes(q)
      );
    });

    const agentToUpdate = displayedStaff[displayedIndex];
    if (!agentToUpdate) {
      toast.error("Staff not found.");
      setEditingIndex(null);
      return;
    }

    const agentId = agentToUpdate.raw?.id;

    try {
      const payload = {
        staff_agent: editValues.staff_agent,
        staff_email: editValues.staff_email,
      };

      if (editValues.staff_password?.trim() !== "") {
        payload.staff_password = editValues.staff_password;
      }

      const response = await axios.put(
        `${API_URL}/editstaff/${agentId}`,
        payload
      );

      if (response.data?.success) {
        toast.success("Staff credentials updated successfully");

        setStaffList((prev) => {
          const copy = [...prev];
          const idx = copy.findIndex((s) => s.raw?.id === agentId);

          if (idx !== -1) {
            copy[idx] = {
              ...copy[idx],
              staff_agent: editValues.staff_agent,
              staff_email: editValues.staff_email,
              raw: {
                ...copy[idx].raw,
                staff_agent: editValues.staff_agent,
                staff_email: editValues.staff_email,
              },
            };
          }

          return copy;
        });

        setEditingIndex(null);
        setEditValues({
          staff_agent: "",
          staff_email: "",
          staff_password: "",
        });

        await fetchStaff({ force: true });
      } else {
        toast.error(response.data?.message || "Failed to update staff");
      }
    } catch (err) {
      console.error(err);
      toast.error("Server error while updating staff");
    }
  };

  const itemsPerPage = 42;
  const [currentPage, setCurrentPage] = useState(1);

  const filteredStaff = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!Array.isArray(staffList)) return [];
    if (!q) return staffList;
    return staffList.filter(
      (s) =>
        (s.staff_agent || "").toLowerCase().includes(q) ||
        (s.staff_email || "").toLowerCase().includes(q)
    );
  }, [staffList, search]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredStaff.length / itemsPerPage));
  }, [filteredStaff, itemsPerPage]);

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const paginatedStaff = useMemo(() => {
    if (!Array.isArray(filteredStaff) || filteredStaff.length === 0) return [];
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStaff.slice(start, start + itemsPerPage);
  }, [filteredStaff, currentPage, itemsPerPage]);

  const paginatedStartIndex = (currentPage - 1) * itemsPerPage;

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const updatePermission = async (agentId, value) => {
    if (!agentId) return;

    setStaffList((prev) =>
      prev.map((s) => {
        const id = s.raw?.id ?? s.raw?.agent_id ?? s.raw?.staff_id;

        return id === agentId
          ? {
              ...s,
              raw: {
                ...s.raw,
                can_view_fares: value,
              },
            }
          : s;
      })
    );

    try {
      await axios.put(`${API_URL}/staff/toggle/${agentId}`, {
        field: "can_view_fares",
        value,
      });

      toast.success("Permission updated!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update permission");

      setStaffList((prev) =>
        prev.map((s) => {
          const id = s.raw?.id ?? s.raw?.agent_id ?? s.raw?.staff_id;

          return id === agentId
            ? {
                ...s,
                raw: {
                  ...s.raw,
                  can_view_fares: value === 1 ? 0 : 1,
                },
              }
            : s;
        })
      );
    }
  };

  return (
    <div className="content-wrapper">
      <div className="d-flex flex-wrap justify-content-start mb-0 text-center header-color gap-5 px-1 m-0 py-3 mt-0">
        <form onSubmit={handleSubmit}>
          <div className="row g-2 ms-lg-3 ms-0 align-items-center">
            <div className="col-12 col-sm-6 col-lg-3">
              <input
                type="text"
                placeholder="Staff Name"
                className="form-control sector-link"
                name="staff_agent"
                value={agent.staff_agent}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <input
                type="email"
                placeholder="Staff Email"
                className="form-control sector-link"
                name="staff_email"
                value={agent.staff_email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <input
                type="password"
                placeholder="Staff Password"
                className="form-control sector-link"
                name="staff_password"
                value={agent.staff_password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-12 col-sm-6 col-lg-3 d-flex gap-2">
              <button
                className="btn btn-light flex-shrink-0 sector-link"
                type="submit"
              >
                Add
              </button>

              <input
                type="search"
                className="form-control sector-link"
                placeholder="Search Staff"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        </form>
      </div>

      <div className="row p-3">
        {filteredStaff.length === 0 ? (
          <div className="text-center fw-medium text-danger">
            No staff available.
          </div>
        ) : (
          paginatedStaff.map((staff, idx) => {
            const displayedIndex = paginatedStartIndex + idx;
            const keyId = staff.raw?.id ?? staff.staff_email ?? displayedIndex;

            return (
              <div className="col-12 col-md-12 col-lg-4 mb-3" key={keyId}>
                <div className="card border-0 shadow-sm">
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-bordered table-striped text-center table-sm table-fixed mb-0">
                        <thead className="table-light">
                          <tr>
                            <th className="item-color text-start px-2">
                              <span
                                className="text-truncate"
                                style={{
                                  maxWidth: 160,
                                  display: "inline-block",
                                }}
                              >
                                {staff.staff_agent}
                              </span>
                            </th>
                            <th className="text-danger text-start">
                              <span
                                className="text-truncate"
                                style={{
                                  maxWidth: 160,
                                  display: "inline-block",
                                }}
                              >
                                {staff.staff_email}
                              </span>
                            </th>
                            <th
                              className="mt-1 mb-1 d-flex align-items-center justify-content-center"
                              role="button"
                            >
                              <span
                                onClick={(e) =>
                                  toggleDropdown(displayedIndex, e)
                                }
                                style={{ cursor: "pointer", marginRight: 8 }}
                                title="Permissions"
                              >
                                📝
                              </span>
                              <span
                                onClick={(e) =>
                                  startEdit(displayedIndex, staff, e)
                                }
                                style={{ cursor: "pointer" }}
                                title="Edit"
                              >
                                ✏️
                              </span>
                            </th>
                          </tr>
                        </thead>

                        <tbody className="text-center">
                          {editingIndex === displayedIndex ? (
                            <tr>
                              <td colSpan={3} className="text-start px-3 py-2">
                                <div className="row g-2">
                                  <div className="col-12 mb-0">
                                    <input
                                      ref={editNameRef}
                                      type="text"
                                      name="staff_agent"
                                      value={editValues.staff_agent}
                                      onChange={handleEditChange}
                                      className="form-control form-control-sm"
                                      placeholder="Staff Name"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>

                                  <div className="col-12 mb-0">
                                    <input
                                      type="email"
                                      name="staff_email"
                                      value={editValues.staff_email}
                                      onChange={handleEditChange}
                                      className="form-control form-control-sm"
                                      placeholder="Staff Email"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>

                                  <div className="col-12 mb-0">
                                    <input
                                      type="password"
                                      name="staff_password"
                                      value={editValues.staff_password}
                                      onChange={handleEditChange}
                                      className="form-control form-control-sm"
                                      placeholder="New Password"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>

                                  <div className="col-12 d-flex gap-2">
                                    <button
                                      className="btn btn-sm btn-success"
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={(e) =>
                                        saveEdit(displayedIndex, e)
                                      }
                                    >
                                      Save
                                    </button>
                                    <button
                                      className="btn btn-sm btn-secondary"
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={cancelEdit}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ) : dropdownIndex === displayedIndex ? (
                            <>
                              <tr>
                                <td
                                  colSpan={2}
                                  className="text-danger text-start ps-3"
                                >
                                  <Link
                                    className="text-danger text-decoration-none"
                                    to="/admin/agent"
                                  >
                                    Can View Fares
                                  </Link>
                                </td>

                                <td>
                                  <div className="checkbox-wrapper d-flex justify-content-center w-100">
                                    <input
                                      type="checkbox"
                                      checked={
                                        Number(staff.raw?.can_view_fares) === 1
                                      }
                                      onChange={(e) => {
                                        const agentId =
                                          staff.raw?.id ??
                                          staff.raw?.agent_id ??
                                          staff.raw?.staff_id;

                                        const newValue = e.target.checked
                                          ? 1
                                          : 0;

                                        setStaffList((prev) =>
                                          prev.map((s) => {
                                            const id =
                                              s.raw?.id ??
                                              s.raw?.agent_id ??
                                              s.raw?.staff_id;

                                            return id === agentId
                                              ? {
                                                  ...s,
                                                  raw: {
                                                    ...s.raw,
                                                    can_view_fares: newValue,
                                                  },
                                                }
                                              : s;
                                          })
                                        );

                                        updatePermission(agentId, newValue);
                                      }}
                                      className="custom-checkbox-input"
                                    />

                                    {Number(staff.raw?.can_view_fares) ===
                                      0 && (
                                      <span className="checkbox-x fw-bolder">
                                        ✕
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            </>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="d-flex justify-content-center gap-2 align-items-center mt-3">
          <button
            type="button"
            className="btn btn-sm btn-success"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Prev
          </button>

          <span className="px-2 small text-muted">
            Page {currentPage} of {totalPages}
          </span>

          <button
            type="button"
            className="btn btn-sm btn-success"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}

      <ToastContainer position="bottom-right" autoClose={1000} />
    </div>
  );
}

export default Staff;
