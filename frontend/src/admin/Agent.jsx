import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import "../App.css";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit } from "@fortawesome/free-solid-svg-icons";

function Agent() {
  const API_URL = import.meta.env.VITE_API_URL;

  const [agent, setAgent] = useState({
    agent_name: "",
    agent_email: "",
    agent_password: "",
  });

  const [staffList, setStaffList] = useState([]);
  const [dropdownIndex, setDropdownIndex] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [activeAction, setActiveAction] = useState({
    index: null,
    type: null,
  });

  const [editValues, setEditValues] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [search, setSearch] = useState("");
  const itemsPerPage = 42;
  const [currentPage, setCurrentPage] = useState(1);
  const editNameRef = useRef(null);

  const fetchStaff = useCallback(
    async ({ force = false, signal } = {}) => {
      if (editingIndex !== null && !force) return;

      try {
        const response = await axios.get(`${API_URL}/allagents`, { signal });

        const agentsRaw = Array.isArray(response.data)
          ? response.data
          : response.data?.data || [];

        const formattedData = agentsRaw.map((a) => ({
          name: a.agent_name ?? "",
          email: a.agent_email ?? "",
          raw: a,
        }));

        setStaffList(formattedData);
        return formattedData;
      } catch (error) {
        if (axios.isCancel?.(error)) {
          console.log("Fetch Agents cancelled");
        } else {
          console.error("❌ Error fetching agents:", error);
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

    console.log("Submitting agent:", agent);

    try {
      const response = await axios.post(`${API_URL}/agentpost`, agent, {
        headers: { "Content-Type": "application/json" },
      });

      if (response.data?.success) {
        toast.success(response.data.message || "Agent added successfully!");
        setAgent({ agent_name: "", agent_email: "", agent_password: "" });

        fetchStaff({ force: true }).catch((err) =>
          console.error("Error fetching agents after add:", err)
        );
      } else {
        toast.error(response.data?.message || "Something went wrong");
      }
    } catch (err) {
      if (err.response) {
        const serverMsg =
          err.response.data?.message ||
          err.response.data?.error ||
          JSON.stringify(err.response.data) ||
          "Bad Request";
        toast.error(`Server: ${serverMsg}`);
      } else if (err.request) {
        toast.error("No response from server.");
      } else {
        console.error("Axios setup error:", err.message);
        toast.error(err.message || "Request failed.");
      }
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
      name: staff.name ?? "",
      email: staff.email ?? "",
      password: "",
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
        !search ||
        s.name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q)
      );
    });

    const agentToUpdate = displayedStaff[displayedIndex];
    if (!agentToUpdate) {
      toast.error("Agent not found.");
      setEditingIndex(null);
      return;
    }

    const agentId =
      agentToUpdate.raw?.id ??
      agentToUpdate.raw?.agent_id ??
      agentToUpdate.raw?.staff_id;

    try {
      const payload = {
        agent_name: editValues.name,
        agent_email: editValues.email,
        agent_password: editValues.password,
      };

      const response = await axios.put(
        `${API_URL}/editagent/${agentId}`,
        payload
      );

      if (response.data?.success) {
        toast.success("Agent credentials updated successfully");

        const idxInStaffList = staffList.findIndex(
          (s) =>
            s.raw?.id === agentId ||
            s.raw?.agent_id === agentId ||
            s.raw?.staff_id === agentId
        );

        if (idxInStaffList !== -1) {
          setStaffList((prev) => {
            const updatedList = [...prev];
            updatedList[idxInStaffList] = {
              ...updatedList[idxInStaffList],
              name: editValues.name,
              email: editValues.email,
              raw: {
                ...updatedList[idxInStaffList].raw,
                agent_name: editValues.name,
                agent_email: editValues.email,
              },
            };
            return updatedList;
          });
        }

        setEditingIndex(null);
        setEditValues({ name: "", email: "", password: "" });
      } else {
        toast.error(response.data?.message || "Failed to update agent");
      }
    } catch (err) {
      console.error(err);
      toast.error("Server error while updating agent");
    }
  };

  const [agents, setAgents] = useState([]);

  useEffect(() => {
    const allStaff = async () => {
      try {
        const res = await axios.get(`${API_URL}/allagents`);
        const list = res.data?.data || [];

        const normalized = list.map((s) => ({
          ...s,
          can_view_fares: Number(s.can_view_fares) === 1 ? 1 : 0,
          can_view_agents: Number(s.can_view_agents) === 1 ? 1 : 0,
        }));

        setAgents(normalized);
      } catch (err) {
        console.error(err);
      }
    };

    allStaff();
  }, [API_URL]);

  const updatePermission = async (agentId, field, value) => {
    try {
      await axios.put(`${API_URL}/agent/toggle/${agentId}`, {
        field,
        value,
      });

      toast.success("Permission updated successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update permission");
    }
  };

  const filteredStaff = useMemo(() => {
    const q = search.trim().toLowerCase();
    return Array.isArray(staffList)
      ? staffList.filter((s) => {
          if (!search) return true;
          return (
            s.name?.toLowerCase().includes(q) ||
            s.email?.toLowerCase().includes(q)
          );
        })
      : [];
  }, [staffList, search]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredStaff.length / itemsPerPage));
  }, [filteredStaff, itemsPerPage]);

  const paginatedStaff = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStaff.slice(start, start + itemsPerPage);
  }, [filteredStaff, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  return (
    <div className="content-wrapper">
      <div className="d-flex flex-wrap justify-content-start mb-0 text-center header-color gap-5 px-1 m-0 py-3 mt-0">
        <form onSubmit={handleSubmit}>
          <div className="row g-2 ms-lg-3 ms-0 align-items-center">
            <div className="col-12 col-sm-6 col-lg-3">
              <input
                type="text"
                placeholder="Agent Name"
                className="form-control sector-link"
                name="agent_name"
                value={agent.agent_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <input
                type="email"
                placeholder="Agent Email"
                className="form-control sector-link"
                name="agent_email"
                value={agent.agent_email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <input
                type="password"
                placeholder="Agent Password"
                className="form-control sector-link"
                name="agent_password"
                value={agent.agent_password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-12 col-sm-6 col-lg-3 d-flex gap-2">
              <button
                className="btn btn-light flex-shrink-0 sector-link submit-btn"
                type="submit"
              >
                Add
              </button>

              <input
                type="search"
                className="form-control sector-link"
                placeholder="Search Agent"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </form>
      </div>

      <div className="row p-2 p-lg-3">
        {!paginatedStaff || paginatedStaff.length === 0 ? (
          <div className="col-12">
            <div className="text-center fw-medium text-danger">
              No agent available.
            </div>
          </div>
        ) : (
          paginatedStaff.map((staff, idx) => {
            const displayedIndex = idx;
            const globalIndex = (currentPage - 1) * itemsPerPage + idx;

            const keyId =
              staff.raw?.id ??
              staff.raw?.agent_id ??
              staff.raw?.staff_id ??
              staff.email ??
              globalIndex;

            return (
              <div
                className="col-12 col-md-12 col-lg-6 col-xl-4 col-xxl-4 mb-3 m-0"
                key={keyId}
              >
                <div className="card border-0 shadow-sm">
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-bordered table-striped table-sm table-fixed mb-0">
                        <thead
                          className="table-light"
                          style={{
                            height: "37px",
                          }}
                        >
                          <tr>
                            <th className="item-color text-start px-2 name-col align-middle">
                              <span
                                className="text-truncate custom-bg d-block"
                                style={{
                                  maxWidth: 160,
                                }}
                              >
                                {staff.name}
                              </span>
                            </th>

                            <th className="item-color text-start email-col align-middle px-2">
                              <span
                                className="text-truncate d-block"
                                style={{ maxWidth: 220 }}
                              >
                                {staff.email}
                              </span>
                            </th>

                            <th className="text-center p-0 align-middle action-col">
                              <div className="d-flex justify-content-center align-items-center gap-0 item-color">
                                <span
                                  className={`action-icon ${
                                    activeAction.index === globalIndex &&
                                    activeAction.type === "perm"
                                      ? "active"
                                      : ""
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();

                                    setActiveAction((prev) => {
                                      if (
                                        prev.index === globalIndex &&
                                        prev.type === "perm"
                                      ) {
                                        return { index: null, type: null };
                                      }

                                      return {
                                        index: globalIndex,
                                        type: "perm",
                                      };
                                    });

                                    toggleDropdown(globalIndex, e);
                                  }}
                                  title="Permissions"
                                >
                                  📝
                                </span>

                                <span
                                  className={`action-icon py-2 ${
                                    activeAction.index === globalIndex &&
                                    activeAction.type === "edit"
                                      ? "active"
                                      : ""
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();

                                    setActiveAction((prev) => {
                                      if (
                                        prev.index === globalIndex &&
                                        prev.type === "edit"
                                      ) {
                                        return { index: null, type: null };
                                      }

                                      return {
                                        index: globalIndex,
                                        type: "edit",
                                      };
                                    });

                                    startEdit(globalIndex, staff, e);
                                  }}
                                  title="Edit"
                                >
                                  <FontAwesomeIcon
                                    icon={faEdit}
                                    className="edit-icon"
                                  />
                                </span>
                              </div>
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {editingIndex === globalIndex ? (
                            <tr>
                              <td colSpan={3} className="text-start px-3 py-2">
                                <div className="row g-2">
                                  <div className="col-12">
                                    <input
                                      ref={editNameRef}
                                      type="text"
                                      name="name"
                                      value={editValues.name}
                                      onChange={handleEditChange}
                                      className="form-control form-control-sm"
                                      placeholder="Agent Name"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>

                                  <div className="col-12">
                                    <input
                                      type="email"
                                      name="email"
                                      value={editValues.email}
                                      onChange={handleEditChange}
                                      className="form-control form-control-sm"
                                      placeholder="Agent Email"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>

                                  <div className="col-12">
                                    <input
                                      type="password"
                                      name="password"
                                      value={editValues.password}
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
                          ) : dropdownIndex === globalIndex ? (
                            <>
                              <tr>
                                {" "}
                                <td
                                  colSpan={2}
                                  className="text-danger text-start ps-3"
                                >
                                  {" "}
                                  <Link
                                    className="text-dark text-decoration-none"
                                    to="/admin/agent"
                                  >
                                    {" "}
                                    Can View Agents{" "}
                                  </Link>{" "}
                                </td>{" "}
                                <td>
                                  {" "}
                                  <div className="checkbox-wrapper d-flex justify-content-center w-100">
                                    {" "}
                                    <input
                                      type="checkbox"
                                      checked={
                                        Number(staff.raw?.can_view_agents) === 1
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
                                                    can_view_agents: newValue,
                                                  },
                                                }
                                              : s;
                                          })
                                        );
                                        updatePermission(
                                          agentId,
                                          "can_view_agents",
                                          newValue
                                        );
                                      }}
                                      className="custom-checkbox-input"
                                    />{" "}
                                    {Number(staff.raw?.can_view_agents) ===
                                      0 && (
                                      <span className="checkbox-x fw-bolder">
                                        {" "}
                                        ✕{" "}
                                      </span>
                                    )}{" "}
                                  </div>{" "}
                                </td>{" "}
                              </tr>

                              <tr>
                                {" "}
                                <td
                                  colSpan={2}
                                  className="text-danger text-start ps-3"
                                >
                                  {" "}
                                  <Link
                                    className="text-dark text-decoration-none"
                                    to="/admin/agent"
                                  >
                                    {" "}
                                    Can View Fares{" "}
                                  </Link>{" "}
                                </td>{" "}
                                <td>
                                  {" "}
                                  <div className="checkbox-wrapper d-flex justify-content-center w-100">
                                    {" "}
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
                                        updatePermission(
                                          agentId,
                                          "can_view_fares",
                                          newValue
                                        );
                                      }}
                                      className="custom-checkbox-input"
                                    />{" "}
                                    {Number(staff.raw?.can_view_fares) ===
                                      0 && (
                                      <span className="checkbox-x fw-bolder">
                                        {" "}
                                        ✕{" "}
                                      </span>
                                    )}{" "}
                                  </div>{" "}
                                </td>{" "}
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

export default Agent;
