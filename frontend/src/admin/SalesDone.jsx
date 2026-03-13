import { useEffect, useRef, useState } from "react";
import axios from "axios";
import ExcelJS from "exceljs";
import { toast, ToastContainer } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faTrash } from "@fortawesome/free-solid-svg-icons";

function SalesDone() {
  const API_URL = import.meta.env.VITE_API_URL;

  const [user, setUser] = useState([]);
  const itemsPerPage = 21;
  const [currentPage, setCurrentPage] = useState(1);

  const [search, setSearch] = useState({
    pnr: "",
    dot: "",
  });

  const [filteredData, setFilteredData] = useState([]);
  const [showDate1, setShowDate1] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setSearch((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSearch = (e) => {
    e.preventDefault();

    if (!search.pnr && !search.dot) {
      toast.error("Please fill either PNR or Date");
      return;
    }

    let filtered = Array.isArray(user) ? user : [];

    if (search.pnr) {
      filtered = filtered.filter((item) =>
        item?.pnr?.toLowerCase().includes(search.pnr.toLowerCase())
      );
    }

    if (search.dot) {
      filtered = filtered.filter((item) => {
        if (!item?.dot || typeof item.dot !== "string") return false;

        let formattedDot = "";

        if (/^\d{2}-\d{2}-\d{4}$/.test(item.dot)) {
          const [dd, mm, yyyy] = item.dot.split("-");
          formattedDot = `${yyyy}-${mm}-${dd}`;
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(item.dot)) {
          formattedDot = item.dot;
        } else {
          return false;
        }

        return formattedDot === search.dot;
      });
    }

    setFilteredData(filtered);
    setCurrentPage(1);
  };

  const allData = async () => {
    try {
      const response = await axios.get(`${API_URL}/allsalesdone`);
      setUser(response.data.data);
      setFilteredData(response.data.data);
    } catch (error) {
      console.error("error", error);
    }
  };

  useEffect(() => {
    allData();
  }, []);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = Array.isArray(filteredData)
    ? filteredData.slice(startIndex, endIndex)
    : [];

  const handleDownload = async () => {
    if (!paginatedData || paginatedData.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("EditSales");

    worksheet.addRow([
      "ID",
      "SECTOR",
      "PAX",
      "DOT",
      "DOTB",
      "AIRLINE",
      "AGENT",
      "FARE",
      "PNR",
    ]);

    paginatedData.forEach((item) => {
      worksheet.addRow([
        item.id,
        item.sector || "-",
        item.pax || "-",
        item.dot || "-",
        item.dotb || "-",
        item.airline || "-",
        item.agent || "-",
        item.fare || "-",
        item.pnr || "-",
      ]);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(blob, "Sales Done.xlsx");
  };

  const deleteData = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this record?"
    );

    if (!confirmDelete) return;

    try {
      await axios.delete(`${API_URL}/deletesource/${id}`);

      setUser((prev) => prev.filter((item) => item.id !== id));
      setFilteredData((prev) => prev.filter((item) => item.id !== id));

      toast.success("Deleted successfully");
    } catch (error) {
      toast.error("Delete failed");
    }
  };

  const modalRef = useRef();
  const inputRef = useRef();
  const agentDropdownRef = useRef();
  const agentInputRef = useRef();
  const dropdownRef = useRef();
  const [showModal, setShowModal] = useState(false);
  const [agents, setAgents] = useState([]);
  const [showAgentList, setShowAgentList] = useState([]);

  const formatForDateInput = (dateStr) => {
    if (!dateStr || typeof dateStr !== "string") return "";

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }

    if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
      const [dd, mm, yyyy] = dateStr.split("-");
      return `${yyyy}-${mm}-${dd}`;
    }

    return "";
  };

  const [editData, setEditData] = useState({
    id: "",
    sector: "",
    pax: "",
    dot: "",
    dotb: "",
    airline: "",
    fare: "",
    pnr: "",
    agent: "",
  });

  const handleUpdate = async () => {
    if (!editData.id) {
      toast.warn("No record selected to update.");
      return;
    }

    try {
      const response = await axios.put(
        `${API_URL}/updatesalessource/${editData.id}`,
        {
          sector: editData.sector,
          pax: editData.pax,
          dot: editData.dot,
          dotb: editData.dotb,
          airline: editData.airline,
          fare: editData.fare,
          pnr: editData.pnr,
          agent: editData.agent,
        }
      );

      setShowModal(false);

      if (typeof allData === "function") {
        allData();
      }

      toast.success(response.data?.message || "Record updated successfully!");
    } catch (err) {
      console.error("Update error:", err);

      if (err.response?.data?.message) {
        toast.error(`Update failed: ${err.response.data.message}`);
      } else if (err.message) {
        toast.error(`Update failed: ${err.message}`);
      } else {
        toast.error("Update failed. Please try again.");
      }
    }
  };

  useEffect(() => {
    const agents = async () => {
      try {
        const response = await axios.get(`${API_URL}/allagents`);
        setAgents(response.data.data || []);
      } catch (error) {
        console.error("error", error);
      }
    };
    agents();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setShowModal(false);
      }

      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setShowSectorList(false);
      }

      if (
        agentDropdownRef.current &&
        !agentDropdownRef.current.contains(event.target) &&
        agentInputRef.current &&
        !agentInputRef.current.contains(event.target)
      ) {
        setShowAgentList(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="content-wrapper">
      <div className="d-flex flex-wrap justify-content-between px-lg-4 px-0 mb-0 text-center gap-3 px-1 m-0 py-3 mt-0 header-color">
        <form
          className="d-flex flex-row gap-2 flex-wrap ms-2 ms-lg-0"
          onSubmit={handleSearch}
        >
          <input
            type="search"
            className="form-control sector-link1"
            placeholder="Search By PNR"
            name="pnr"
            value={search.pnr}
            onChange={handleChange}
          />

          <input
            type={showDate1 ? "date" : "text"}
            className="form-control sector-link1"
            placeholder="Search by DATE"
            name="dot"
            value={search.dot}
            onFocus={() => setShowDate1(true)}
            onBlur={(e) => {
              if (!e.target.value) setShowDate1(false);
            }}
            onChange={handleChange}
          />

          <button
            className="btn btn-light sector-link submit-btn"
            type="submit"
          >
            Search
          </button>
        </form>
      </div>

      <div className="container-fluid px-lg-1 px-xl-4 px-xxl-4 px-2">
        <div className="row mt-3">
          <div className="col-lg-12 col-md-12 col-12 mt-3 mt-lg-0 overflow-x-auto">
            <h5 className="fw-bold text-success text-decoration-underline">
              Sales done from other source
            </h5>
            <table className="table table-bordered table-striped table-sm text-center mb-0">
              <thead className="table-light">
                <tr>
                  <th>ID</th>
                  <th>SECTOR</th>
                  <th>PAX</th>
                  <th>AIRLINE</th>
                  <th>PNR</th>
                  <th>ACTION</th>
                </tr>
              </thead>

              <tbody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((data, index) => (
                    <tr key={data.id ?? index}>
                      <td>{startIndex + index + 1}</td>
                      <td>{data.sector || "-"}</td>
                      <td>{data.pax || "-"}</td>
                      <td>{data.airline || "-"}</td>
                      <td>{data.pnr || "-"}</td>
                      <td>
                        <span title="Edit">
                          <FontAwesomeIcon
                            icon={faEdit}
                            className="custom-color-delete custom-color-edit"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditData({
                                id: data.id,
                                sector: data.sector || "",
                                pax: data.pax || "",
                                dot: formatForDateInput(data.dot),
                                dotb: formatForDateInput(data.dotb),
                                airline: data.airline || "",
                                fare: data.fare || "",
                                pnr: data.pnr || "",
                                agent: data.agent || "",
                              });
                              setShowModal(true);
                            }}
                          />
                        </span>

                        <span title="Delete">
                          <FontAwesomeIcon
                            icon={faTrash}
                            className="custom-color-delete ms-2"
                            title="Delete"
                            style={{ cursor: "pointer" }}
                            onClick={() => deleteData(data.id)}
                          />
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center text-danger fw-bold">
                      No records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {showModal && (
              <div className="modal fade show d-block" tabIndex="-1">
                <div
                  className="modal-dialog modal-dialog-centered"
                  ref={modalRef}
                >
                  <div className="modal-content custom-color">
                    <div className="modal-header py-2">
                      <h5 className="modal-title text-light">Edit: SDFOS</h5>

                      <button
                        type="button"
                        title="Cut"
                        className="btn-close btn-close-white"
                        onClick={() => setShowModal(false)}
                      ></button>
                    </div>

                    <div className="modal-body">
                      <div className="mb-2 position-relative">
                        <label className="form-label text-light">
                          Sector Name
                        </label>

                        <input
                          ref={inputRef}
                          type="text"
                          className="form-control"
                          placeholder="Select Sector"
                          name="sector"
                          value={editData.sector || ""}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              sector: e.target.value,
                            })
                          }
                          onFocus={() => setShowSectorList(true)}
                          autoComplete="off"
                        />
                      </div>

                      <div className="mb-2">
                        <label className="form-label text-light">
                          Pax Name
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="PAX Name"
                          name="pax"
                          value={editData.pax}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              pax: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="mb-2">
                        <label className="form-label text-light">DOT</label>
                        <input
                          type="date"
                          className="form-control"
                          name="dot"
                          value={editData.dot}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              dot: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="mb-2">
                        <label className="form-label text-light">DOTB</label>
                        <input
                          type="date"
                          className="form-control"
                          name="dotb"
                          value={editData.dotb}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              dotb: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="mb-2">
                        <label className="form-label text-light">Airline</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="AIRLINE"
                          name="airline"
                          value={editData.airline}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              airline: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="mb-2">
                        <label className="form-label text-light">Fare</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="FARE"
                          name="fare"
                          value={editData.fare}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              fare: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="mb-2">
                        <label className="form-label text-light">PNR</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="PNR"
                          name="pnr"
                          value={editData.pnr}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              pnr: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="mb-2 position-relative">
                        <label className="form-label text-light">
                          Agent Name
                        </label>

                        <input
                          type="search"
                          value={editData.agent}
                          ref={agentInputRef}
                          onFocus={() => setShowAgentList(true)}
                          onChange={(e) =>
                            setEditData({ ...editData, agent: e.target.value })
                          }
                          className="form-control"
                          placeholder="Select Agent"
                        />

                        {showAgentList && (
                          <ul
                            ref={agentDropdownRef}
                            className="list-group position-absolute w-100 list-group-custom p-0"
                            style={{
                              zIndex: 1055,
                              maxHeight: "130px",
                              overflowY: "auto",
                              backgroundColor: "white",
                            }}
                          >
                            {agents
                              .filter((a) =>
                                (a.agent_name || "")
                                  .toLowerCase()
                                  .includes(
                                    (editData.agent || "").toLowerCase()
                                  )
                              )
                              .map((agent) => (
                                <li
                                  key={agent.id}
                                  className="list-group-item list-group-item-action text-dark px-3"
                                  style={{
                                    cursor: "pointer",
                                    padding: "5px 0px",
                                  }}
                                  onClick={() => {
                                    setEditData({
                                      ...editData,
                                      agent: agent.agent_name || "",
                                    });
                                    setShowAgentList(false);
                                  }}
                                >
                                  {agent.agent_name || "Unnamed Agent"}
                                </li>
                              ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    <div className="modal-footer">
                      <button
                        className="btn btn-secondary"
                        onClick={() => setShowModal(false)}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn btn-success"
                        onClick={handleUpdate}
                      >
                        Update
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="d-flex flex-row justify-content-center gap-3 mb-3">
              {filteredData.length > itemsPerPage && (
                <div className="d-flex justify-content-center mt-2 gap-2">
                  <button
                    className="btn btn-sm btn-success pagination-button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => prev - 1)}
                  >
                    Prev
                  </button>

                  <span className="align-self-center">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    className="btn btn-sm btn-success pagination-button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                  >
                    Next
                  </button>
                </div>
              )}

              {filteredData.length > 0 && (
                <div>
                  <button
                    className="btn btn-success mt-1 download-btn"
                    onClick={handleDownload}
                  >
                    Download CSV
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ToastContainer position="bottom-right" autoClose={1500} />
    </div>
  );
}

export default SalesDone;
