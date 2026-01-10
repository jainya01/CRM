import ReactDOM from "react-dom";
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
  useMemo,
} from "react";
import { toast, ToastContainer } from "react-toastify";
import "../App.css";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";

function SuggestionsPortal({
  parentRect,
  items,
  onSelect,
  visible,
  maxHeight = 420,
  className = "",
}) {
  const [style, setStyle] = useState({});

  const updateStyle = useCallback(() => {
    if (!parentRect) return;
    const left = parentRect.left + window.scrollX;
    const top = parentRect.bottom + window.scrollY + 0;
    const width = parentRect.width;
    setStyle({
      position: "absolute",
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      zIndex: 30000,
      maxHeight: `${maxHeight}px`,
      backgroundColor: "rgb(139, 182, 148)",
      boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
      borderRadius: 0,
    });
  }, [parentRect, items.length, maxHeight]);

  useEffect(() => {
    if (!parentRect) return;
    updateStyle();
    const onResize = () => updateStyle();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [parentRect, updateStyle]);

  if (!visible || !items || items.length === 0) return null;
  if (!parentRect) return null;
  if (typeof document === "undefined") return null;

  return ReactDOM.createPortal(
    <ul className={`list-group ${className}`} style={style}>
      {items.map((a) => {
        const key = a.id ?? a.agent_name;
        return (
          <li
            key={key}
            className="list-group-item list-group-item-action text-start"
            style={{
              cursor: "pointer",
              fontWeight: 600,
              backgroundColor: "rgb(139, 182, 148)",
              border: "none",
              padding: "12px 16px",
            }}
            onClick={() => onSelect(a)}
          >
            {a.agent_name}
          </li>
        );
      })}
    </ul>,
    document.body
  );
}

function Urase() {
  const API_URL = import.meta.env.VITE_API_URL;

  const [staffList, setStaffList] = useState([]);
  const [openIndex, setOpenIndex] = useState(null);

  const toggleDropdown = (index, message) => {
    setOpenIndex(openIndex === index ? null : index);

    const lastRead =
      parseInt(localStorage.getItem("lastReadURASECreatedAt")) || 0;

    const msgTime = new Date(message.created_at).getTime();
    if (msgTime > lastRead) {
      localStorage.setItem("lastReadURASECreatedAt", msgTime);
    }

    const activeIds = (localStorage.getItem("uraseIds") || "")
      .split(",")
      .filter(Boolean)
      .map(Number)
      .filter((id) => id !== message.id);

    localStorage.setItem("uraseIds", activeIds.join(","));

    const blocked = new Set(
      (localStorage.getItem("uraseBlockedIds") || "")
        .split(",")
        .filter(Boolean)
        .map(Number)
    );

    blocked.add(message.id);

    localStorage.setItem("uraseBlockedIds", [...blocked].join(","));
  };

  useEffect(() => {
    const controller = new AbortController();

    const fetchOtbData = async () => {
      try {
        const response = await axios.get(`${API_URL}/allotbs`, {
          signal: controller.signal,
        });

        const data = response.data?.data || [];

        const existingIds = (localStorage.getItem("uraseIds") || "")
          .split(",")
          .filter(Boolean)
          .map(Number);

        const blockedIds = new Set(
          (localStorage.getItem("uraseBlockedIds") || "")
            .split(",")
            .filter(Boolean)
            .map(Number)
        );

        const newIds = data
          .map((item) => item.id)
          .filter((id) => !existingIds.includes(id) && !blockedIds.has(id));

        if (newIds.length > 0) {
          localStorage.setItem(
            "uraseIds",
            [...existingIds, ...newIds].join(",")
          );
        }

        setStaffList(data);
      } catch (error) {
        if (axios.isCancel?.(error)) {
          console.log("FetchAllOtbs cancelled");
        } else {
          console.error("Error fetching allotbs:", error);
        }
      }
    };

    fetchOtbData();

    return () => {
      controller.abort();
    };
  }, [API_URL]);

  const [agent, setAgent] = useState({ agent_name: "", mail: "" });
  const [otb, setOtb] = useState([]);
  const [filteredAgents, setFilteredAgents] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [inputRect, setInputRect] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    const allOtbData = async () => {
      try {
        const response = await axios.get(`${API_URL}/allagents`, {
          signal: controller.signal,
        });
        setOtb(response.data?.data || response.data || []);
      } catch (error) {
        if (axios.isCancel(error)) {
          console.log("OtbData request cancelled");
        } else {
          console.error("Error fetching agents:", error);
        }
      }
    };

    allOtbData();

    return () => {
      controller.abort();
    };
  }, [API_URL]);

  useEffect(() => {
    setShowSuggestions(false);
  }, []);

  useEffect(() => {
    const handleDocClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setShowSuggestions(false);
    };

    document.addEventListener("click", handleDocClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("click", handleDocClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const measureInput = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setInputRect(rect);
  }, []);

  useLayoutEffect(() => {
    if (showSuggestions) measureInput();
  }, [showSuggestions, filteredAgents.length, measureInput]);

  useEffect(() => {
    const onScrollOrResize = () => {
      if (showSuggestions) measureInput();
    };
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [showSuggestions, measureInput]);

  const handleAgentNameChange = (e) => {
    const value = e.target.value;
    setAgent((p) => ({ ...p, agent_name: value }));

    if (value.trim() !== "") {
      const results = otb.filter((a) =>
        (a.agent_name || "").toLowerCase().includes(value.toLowerCase())
      );
      setFilteredAgents(results);
      setShowSuggestions(results.length > 0);
      measureInput();
    } else {
      setFilteredAgents([]);
      setShowSuggestions(false);
      setAgent((p) => ({ ...p, mail: "" }));
    }
  };

  const handleSelectAgent = (selectedAgent) => {
    setAgent({
      agent_name: selectedAgent.agent_name,
      mail: selectedAgent.agent_email || selectedAgent.mail || "",
    });
    setFilteredAgents([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleMailChange = (e) => {
    setAgent((p) => ({ ...p, mail: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { agent_name, mail } = agent;
    if (!agent_name || !mail) {
      toast.error("Both Agent name and mail are required.");
      return;
    }

    try {
      setLoading(true);
      const payload = { agent_name, mail };
      const res = await axios.post(`${API_URL}/otbpost`, payload, {
        headers: { "Content-Type": "application/json" },
      });

      if (res?.data?.success) {
        toast.success(res.data.message || "OTB send successfully!");
        setAgent({ agent_name: "", mail: "" });
      } else {
        toast.error(res?.data?.message || "Failed to save data.");
      }
    } catch (err) {
      console.error("submit error", err);
      toast.error("Server or network error.");
    } finally {
      setLoading(false);
    }
  };

  const deleteData = async (id) => {
    if (!id) return;
    if (!window.confirm("Delete this Urase notification?")) return;

    try {
      const resp = await axios.delete(`${API_URL}/otbdelete/${id}`);

      if (resp?.status === 200 && resp?.data?.success === true) {
        setStaffList((prev) => prev.filter((item) => item.id !== id));
        try {
          const fresh = await axios.get(`${API_URL}/allotbs`);
          setStaffList(fresh.data?.data || fresh.data || []);
        } catch (err) {
          console.warn("Refetch after delete failed:", err);
        }
      } else {
        console.error("Delete failed:", resp?.data || resp);
        alert(resp?.data?.message || "Delete failed on server.");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Something went wrong while deleting. Check console.");
    }
  };

  const itemsPerPage = 42;
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = useMemo(() => {
    const length = Array.isArray(staffList) ? staffList.length : 0;
    return Math.max(1, Math.ceil(length / itemsPerPage));
  }, [staffList, itemsPerPage]);

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const paginatedGroups = useMemo(() => {
    if (!Array.isArray(staffList) || staffList.length === 0) return [];
    const start = (currentPage - 1) * itemsPerPage;
    return staffList.slice(start, start + itemsPerPage);
  }, [staffList, currentPage, itemsPerPage]);

  return (
    <div className="content-wrapper">
      <div className="d-flex flex-wrap justify-content-start mb-0 text-center header-color gap-5 px-1 m-0 py-3 mt-0">
        <form onSubmit={handleSubmit}>
          <div className="row g-3 align-items-start ms-lg-3 ms-0">
            <div className="col-md-4 col-6 col-sm-6">
              <div className="position-relative w-100" ref={wrapperRef}>
                <input
                  ref={inputRef}
                  type="search"
                  placeholder="Search Agent"
                  className="form-control sector-link"
                  value={agent.agent_name}
                  onChange={handleAgentNameChange}
                  onFocus={() => {
                    if (agent.agent_name) {
                      setShowSuggestions(true);
                      measureInput();
                    }
                  }}
                  autoComplete="off"
                  required
                />
              </div>
            </div>

            <div className="col-md-4 col-6 col-sm-6">
              <input
                type="email"
                placeholder="Agent Email"
                className="form-control sector-link"
                value={agent.mail}
                onChange={handleMailChange}
                required
              />
            </div>

            <div className="col-md-4 col-12 d-flex justify-content-start justify-content-md-start">
              <button
                className="btn btn-light sector-link w-md-auto submit-btn"
                type="submit"
                disabled={loading}
              >
                {loading ? "Saving..." : "Submit"}
              </button>
            </div>
          </div>
        </form>
      </div>

      <SuggestionsPortal
        parentRect={inputRect}
        items={filteredAgents}
        onSelect={handleSelectAgent}
        visible={showSuggestions && filteredAgents.length > 0 && !!inputRect}
        maxHeight={420}
      />

      <div className="row p-3">
        {paginatedGroups.length === 0 ? (
          <div className="col-12">
            <div className="card-bod1y py-4 text-center text-muted">
              <div className="mb-2 text-danger text-center">
                No Urase notifications found.
              </div>
            </div>
          </div>
        ) : (
          paginatedGroups.map((agentItem, idx) => {
            const globalIndex = (currentPage - 1) * itemsPerPage + idx;

            return (
              <div
                className="col-12 col-md-6 col-lg-4 mb-3"
                key={agentItem?.id ?? globalIndex}
              >
                <div className="card border-0 shadow-sm">
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-bordered text-center table-sm mb-0">
                        <thead className="table-light">
                          <tr>
                            <th
                              colSpan={4}
                              className="item-color text-start px-2 py-2 size-text"
                              onClick={() =>
                                toggleDropdown(globalIndex, agentItem)
                              }
                              style={{ cursor: "pointer" }}
                            >
                              You have sent an email{" "}
                              {agentItem.agent_name || "Unknown Agent"}
                              <div className="turq-caret float-end">
                                {openIndex === globalIndex ? "▴" : "▾"}
                              </div>
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {openIndex === globalIndex && (
                            <tr>
                              <td>{agentItem.agent_name || "N/A"}</td>
                              <td>{agentItem.mail || "No Email"}</td>
                              <td>
                                <span
                                  title="Delete"
                                  className="custom-color-delete"
                                  onClick={() => deleteData(agentItem.id)}
                                >
                                  <FontAwesomeIcon icon={faTrash} />
                                </span>
                              </td>
                            </tr>
                          )}
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
        <div className="d-flex justify-content-center gap-2 align-items-center mt-0 mb-1">
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

export default Urase;
