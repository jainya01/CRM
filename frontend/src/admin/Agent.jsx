import React, { useEffect, useState } from "react";
import "../App.css";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import { Link } from "react-router-dom";

function Agent() {
  const API_URL = import.meta.env.VITE_API_URL;

  const [agent, setAgent] = useState({
    agent_name: "",
    agent_email: "",
    agent_password: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAgent((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_URL}/agentpost`, agent, {
        headers: { "Content-Type": "application/json" },
      });
      if (response.data.success) {
        toast.success(response.data.message || "Agent added successfully!");
        setAgent({
          agent_name: "",
          agent_email: "",
          agent_password: "",
        });
      } else {
        toast.error(response.data.message || "Something went wrong");
      }
    } catch (err) {
      console.error("Error:", err);
      toast.error("Server connection failed.");
    }
  };

  const [staffList, setStaffList] = useState([]);
  const [dropdownIndex, setDropdownIndex] = useState(null);
  const [search, setSearch] = useState("");

  const fetchStaff = async () => {
    try {
      const response = await axios.get(`${API_URL}/allagents`);
      const agentsRaw = Array.isArray(response.data)
        ? response.data
        : response.data.data || [];

      const formattedData = agentsRaw.map((a) => ({
        name: a.agent_name,
        email: a.agent_email,
        raw: a,
      }));

      setStaffList(formattedData);
    } catch (error) {
      console.error("❌ Error fetching agents:", error);
    }
  };

  useEffect(() => {
    fetchStaff();
    const interval = setInterval(fetchStaff, 0);
    return () => clearInterval(interval);
  }, []);

  const toggleDropdown = (index) => {
    setDropdownIndex(dropdownIndex === index ? null : index);
  };

  const displayedStaff = staffList.filter((s) => {
    if (!search) return true;
    const q = search.trim().toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="content-wrapper">
      <div className="d-flex flex-wrap justify-content-start mb-0 text-center bg-success gap-5 px-1 m-0 py-3 mt-0">
        <form onSubmit={handleSubmit}>
          <div className="row g-2 ms-lg-3 ms-0 align-items-center">
            <div className="col-12 col-sm-6 col-lg-3">
              <input
                type="text"
                placeholder="Select Agent"
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
                className="btn btn-light flex-shrink-0 sector-link"
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

      <div className="row p-3">
        {displayedStaff.length === 0 ? (
          <div className="text-center fw-medium text-danger">
            No agent available.
          </div>
        ) : (
          displayedStaff.map((staff, index) => (
            <div className="col-12 col-md-6 col-lg-4 mb-3" key={index}>
              <div className="card border-0 shadow-sm">
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-bordered table-striped text-center table-sm table-fixed mb-0">
                      <thead className="table-light">
                        <tr>
                          <th className="item-color text-start px-2">
                            {staff.name}
                          </th>
                          <th className="text-danger text-start">
                            {staff.email}
                          </th>
                          <th
                            className="turq-caret mt-1 mb-1"
                            role="button"
                            onClick={() => toggleDropdown(index)}
                          >
                            📝
                          </th>
                        </tr>
                      </thead>

                      <tbody className="text-center">
                        {dropdownIndex === index && (
                          <>
                            <tr>
                              <td colSpan={2} className="text-danger">
                                <Link
                                  className="text-danger text-decoration-none"
                                  to="/admin/dashboard"
                                >
                                  Can View Agents
                                </Link>
                              </td>
                              <td>
                                <span className="pointer-class">✅</span>
                                <span className="ms-2 pointer-class">❌</span>
                              </td>
                            </tr>
                            <tr>
                              <td colSpan={2} className="text-danger">
                                <Link
                                  className="text-danger text-decoration-none"
                                  to="/admin/dashboard"
                                >
                                  Can View Fares
                                </Link>
                              </td>

                              <td>
                                <span className="pointer-class">✅</span>
                                <span className="ms-2 pointer-class">❌</span>
                              </td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <ToastContainer position="bottom-right" autoClose={1000} />
    </div>
  );
}

export default Agent;
