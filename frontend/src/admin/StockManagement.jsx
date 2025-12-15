import { useEffect, useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import axios from "axios";
import "../App.css";

function StockManagement() {
  const API_URL = import.meta.env.VITE_API_URL;

  const [stock, setStock] = useState({
    sector: "",
    pax: "",
    dot: "",
    fare: "",
    airline: "",
    pnr: "",
  });

  const [openIndex, setOpenIndex] = useState(null);
  const [staff, setStaff] = useState([]);
  const [showDate, setShowDate] = useState(false);
  const [filterStatus, setFilterStatus] = useState("available");
  const itemsPerPage = 27;
  const [currentPage, setCurrentPage] = useState(1);
  const modalRef = useRef(null);
  const [showModal, setShowModal] = useState(false);
  const [file, setFile] = useState(null);
  const [sales, setSales] = useState([]);
  const [salesPageState, setSalesPageState] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setStock((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post(`${API_URL}/stockpost`, stock, {
        headers: { "Content-Type": "application/json" },
      });

      if (response.data.success) {
        toast.success(response.data.message || "Stock added successfully!");
        setStock({
          sector: "",
          pax: "",
          dot: "",
          fare: "",
          airline: "",
          pnr: "",
        });
      } else {
        toast.error(response.data.message || "Something went wrong");
      }
    } catch (err) {
      console.error("Error:", err);
      toast.error("Server connection failed.");
    }
  };

  const toggleDropdown = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        const [stocks, sales] = await Promise.all([
          axios.get(`${API_URL}/allstocks`),
          axios.get(`${API_URL}/allsales`),
        ]);

        if (mounted) {
          setStaff(stocks.data.data || []);
          setSales(sales.data.data || []);
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [API_URL]);

  function parseToDateObj(value) {
    if (value == null || value === "") return null;

    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;

    if (typeof value === "number" && !Number.isNaN(value)) {
      try {
        const utcDays = value - 25569;
        const utcValue = utcDays * 86400 * 1000;
        const d = new Date(utcValue);
        if (!isNaN(d.getTime())) return d;
      } catch (e) {}
    }

    if (typeof value === "string") {
      const s = value.trim();

      if (/^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}:\d{2})?$/.test(s)) {
        const iso = s.replace(" ", "T");
        const d = new Date(iso);
        if (!isNaN(d.getTime())) return d;
      }

      const sepMatch = s.match(/^(\d{1,4})[\/\-.](\d{1,2})[\/\-.](\d{1,4})$/);
      if (sepMatch) {
        let [, p1, p2, p3] = sepMatch;
        if (p1.length === 4) {
          const y = parseInt(p1, 10),
            m = parseInt(p2, 10),
            d = parseInt(p3, 10);
          const dateObj = new Date(y, m - 1, d);
          if (!isNaN(dateObj.getTime())) return dateObj;
        } else {
          let day = parseInt(p1, 10),
            month = parseInt(p2, 10),
            year = parseInt(p3, 10);
          if (year < 100) year = year < 70 ? 2000 + year : 1900 + year;
          const dateObj = new Date(year, month - 1, day);
          if (!isNaN(dateObj.getTime())) return dateObj;
        }
      }

      const d2 = new Date(s);
      if (!isNaN(d2.getTime())) return d2;
    }

    return null;
  }

  function formatDateToDisplay(dateObj) {
    if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime()))
      return "-";
    const day = String(dateObj.getDate()).padStart(2, "0");
    const monthNames = [
      "JAN",
      "FEB",
      "MAR",
      "APR",
      "MAY",
      "JUN",
      "JUL",
      "AUG",
      "SEP",
      "OCT",
      "NOV",
      "DEC",
    ];
    const month = monthNames[dateObj.getMonth()];
    const year = dateObj.getFullYear();
    return `${day} ${month} ${year}`;
  }

  function formatDot(dateString) {
    if (!dateString && dateString !== 0) return "-";
    const d = parseToDateObj(dateString);
    return formatDateToDisplay(d);
  }

  function isDotExpired(dateString) {
    if (!dateString && dateString !== 0) return false;
    const d = parseToDateObj(dateString);
    if (!d) return false;
    const parsed = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return parsed < today;
  }

  const groupedByHeader = useMemo(() => {
    const map = new Map();
    (Array.isArray(staff) ? staff : []).forEach((item) => {
      const sector = (item.sector ?? "").toString().trim();
      const dot = (item.dot ?? "").toString().trim();
      const airline = (item.airline ?? "").toString().trim();
      const agent = (item.agent ?? "-").toString().trim() || "-";

      const key = `${sector}||${dot}||${airline}||${agent}`;

      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });

    return Array.from(map.entries()).map(([key, items]) => {
      const [sector, dot, airline, agent] = key.split("||");
      return {
        key,
        sector,
        dot,
        airline,
        agent,
        items,
      };
    });
  }, [staff]);

  const filteredGroups = useMemo(() => {
    if (!Array.isArray(groupedByHeader)) return [];
    if (filterStatus === "all") return groupedByHeader;
    const wantExpired = filterStatus === "expired";
    return groupedByHeader.filter((group) => {
      const isExpired = group.items.some((it) => isDotExpired(it.dot));
      return wantExpired ? isExpired : !isExpired;
    });
  }, [groupedByHeader, filterStatus]);

  const sortedGroups = useMemo(() => {
    if (!Array.isArray(filteredGroups)) return [];

    const getTime = (t) => {
      const d = new Date(t);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    };

    return [...filteredGroups].sort((a, b) => {
      const latestSaleTime = (group) => {
        const relatedSales = sales.filter(
          (sale) =>
            sale.sector?.trim() === group.sector?.trim() &&
            sale.dot?.trim() === group.dot?.trim() &&
            sale.airline?.trim() === group.airline?.trim()
        );

        if (relatedSales.length === 0) return 0;

        return Math.max(
          ...relatedSales.map((s) => getTime(s.updated_at || s.created_at))
        );
      };

      const latestStockTime = (group) => {
        return Math.max(
          ...group.items.map((i) => getTime(i.updated_at || i.created_at))
        );
      };

      const timeA = latestSaleTime(a) || latestStockTime(a);
      const timeB = latestSaleTime(b) || latestStockTime(b);

      return timeB - timeA;
    });
  }, [filteredGroups, sales]);

  const paginatedGroups = useMemo(() => {
    if (!Array.isArray(sortedGroups)) return [];
    const start = (currentPage - 1) * itemsPerPage;
    return sortedGroups.slice(start, start + itemsPerPage);
  }, [sortedGroups, currentPage]);

  const totalPages = Math.max(
    1,
    Math.ceil((filteredGroups?.length || 0) / itemsPerPage)
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmited = async (e) => {
    e.preventDefault();

    if (!file) {
      toast.error("Please select a excel file first!");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post(`${API_URL}/upload-stock`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (res.status === 200) {
        toast.success(res.data.message || "File uploaded successfully!");
        setShowModal(false);
        setFile(null);
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error.response?.data?.error || "Something went wrong while uploading!"
      );
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setShowModal(false);
      }
    };

    if (showModal) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showModal]);

  return (
    <div className="content-wrapper">
      <div className="d-flex flex-wrap justify-content-between px-lg-4 px-0 mb-0 text-center gap-3 px-1 m-0 py-3 mt-0 header-color">
        <form
          className="d-flex flex-row gap-2 flex-wrap ms-2 ms-lg-0"
          onSubmit={handleSubmit}
        >
          <input
            type="search"
            className="form-control sector-link1"
            placeholder="Add Sector"
            name="sector"
            value={stock.sector}
            onChange={handleChange}
            required
          />

          <input
            type="number"
            className="form-control sector-link1"
            placeholder="Add PAXQ"
            name="pax"
            value={stock.pax}
            onChange={handleChange}
            required
          />

          <input
            type={showDate ? "date" : "text"}
            className="form-control sector-link1"
            placeholder="Add DOT"
            name="dot"
            value={stock.dot}
            onFocus={() => setShowDate(true)}
            onBlur={(e) => {
              if (!e.target.value) setShowDate(false);
            }}
            onChange={handleChange}
            required
          />

          <input
            type="search"
            className="form-control sector-link1"
            placeholder="Add Fare"
            name="fare"
            value={stock.fare}
            onChange={handleChange}
            required
          />

          <input
            type="search"
            className="form-control sector-link1"
            placeholder="Add Airline"
            name="airline"
            value={stock.airline}
            onChange={handleChange}
            required
          />

          <input
            type="search"
            className="form-control sector-link1"
            placeholder="Add PNR"
            name="pnr"
            value={stock.pnr}
            onChange={handleChange}
            required
          />

          <button
            className="btn btn-light sector-link submit-btn"
            type="submit"
          >
            Submit
          </button>

          <div style={{ position: "relative" }}>
            <Link
              className="btn btn-light sector-link sales-btn"
              onClick={() => setShowModal(!showModal)}
            >
              Add Bulk
            </Link>

            {showModal && (
              <div className="bulk-upload-box" ref={modalRef}>
                <h5>Upload Excel File</h5>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  required
                />
                <div style={{ marginTop: "10px" }}>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    onClick={handleSubmited}
                  >
                    Submit
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ marginLeft: "10px" }}
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <select
              className="form-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All</option>
              <option value="available">Available</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </form>
      </div>

      <div className="row p-3">
        {paginatedGroups.map((group, index) => {
          const first = group.items[0] ?? {};
          const formattedDot = formatDot(group.dot);

          const pnr = first.pnr ?? "-";
          const fare = first.fare ?? "-";
          const isExpired = group.items.some((it) => isDotExpired(it.dot));

          return (
            <div
              key={group.key ?? index}
              className="col-12 col-sm-6 col-md-6 col-lg-4 mb-3"
            >
              <div className="card border-0 shadow-sm">
                <div className="card-header size-text text-dark rounded-0 d-flex justify-content-between align-items-center turq-box">
                  <div
                    className="item-color1"
                    style={{ wordBreak: "break-word", cursor: "pointer" }}
                    onClick={() => toggleDropdown(index)}
                  >
                    {group.sector} {formattedDot} {group.airline}{" "}
                    {group.agent !== "-" ? group.agent : "-"}{" "}
                    {(() => {
                      const seatsLeft = group.items.reduce(
                        (sum, item) =>
                          sum +
                          ((parseInt(item.pax, 10) || 0) -
                            (parseInt(item.sold, 10) || 0)),
                        0
                      );

                      return (
                        <span
                          className={
                            isExpired
                              ? "text-danger fw-bold"
                              : "text-success fw-bold"
                          }
                        >
                          {seatsLeft}{" "}
                          {isExpired ? "Seats Unsold" : "Seats Left"}
                        </span>
                      );
                    })()}
                    {isExpired && (
                      <span
                        className="badge bg-danger ms-2"
                        style={{ fontSize: "0.75rem" }}
                      >
                        STOCK DOT EXPIRED
                      </span>
                    )}
                  </div>

                  <div
                    className="turq-caret"
                    role="button"
                    onClick={() => toggleDropdown(index)}
                  >
                    {openIndex === index ? "▴" : "▾"}
                  </div>
                </div>

                {openIndex === index && (
                  <div className="card-body p-0">
                    <div className="d-flex justify-content-between align-items-center mb-2 px-2 py-2 flex-wrap">
                      <span className="text-danger me-2">
                        <strong>PNR:</strong> {pnr}
                      </span>
                      <span className="text-danger">
                        <strong>COST:</strong>{" "}
                        {fare !== "-" ? `${fare}/-` : "-"}
                      </span>
                    </div>

                    <div className="d-flex flex-row justify-content-center gap-3 align-items-center mt-0 mb-2">
                      <span className="text-success1 fw-bold px-2">
                        Total Seats:{" "}
                        <strong>
                          {group.items.reduce(
                            (sum, item) => sum + (parseInt(item.pax, 10) || 0),
                            0
                          )}
                        </strong>
                      </span>
                      <span className="text-success fw-bold">
                        Seats Sold:{" "}
                        <strong>
                          {group.items.reduce(
                            (sum, item) => sum + (parseInt(item.sold, 10) || 0),
                            0
                          )}
                        </strong>
                      </span>
                      <span className="text-danger fw-bold pe-1">
                        Seats Left:{" "}
                        <strong className="text-danger">
                          {group.items.reduce(
                            (sum, item) =>
                              sum +
                              ((parseInt(item.pax, 10) || 0) -
                                (parseInt(item.sold, 10) || 0)),
                            0
                          )}
                        </strong>
                      </span>
                    </div>

                    <div className="table-responsive">
                      <table className="table table-bordered table-striped text-center table-sm mb-0">
                        <thead className="table-light">
                          <tr>
                            <th style={{ width: "20%" }}>SL. NO</th>
                            <th style={{ width: "25%" }}>PAX NAME</th>
                            <th style={{ width: "30%" }}>DATE</th>
                            <th style={{ width: "25%" }}>AGENT</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const matchingSales = sales.filter(
                              (sale) =>
                                sale.sector?.trim() === group.sector?.trim() &&
                                sale.dot?.trim() === group.dot?.trim() &&
                                sale.airline?.trim() === group.airline?.trim()
                            );

                            if (matchingSales.length === 0) {
                              return (
                                <tr>
                                  <td colSpan="4" className="text-danger">
                                    No Sales
                                  </td>
                                </tr>
                              );
                            }

                            const salesPerPage = 7;

                            const salesPage = salesPageState[group.key] || 1;

                            const start = (salesPage - 1) * salesPerPage;
                            const paginatedSales = matchingSales.slice(
                              start,
                              start + salesPerPage
                            );

                            const totalSalesPages = Math.ceil(
                              matchingSales.length / salesPerPage
                            );

                            const goToPage = (p) => {
                              setSalesPageState((prev) => ({
                                ...prev,
                                [group.key]: p,
                              }));
                            };

                            return (
                              <>
                                {Array.isArray(paginatedSales) &&
                                paginatedSales.length > 0 ? (
                                  paginatedSales.map((sale, idx) => (
                                    <tr key={sale.id ?? idx}>
                                      <td>{start + idx + 1}</td>
                                      <td>{sale.pax ?? "-"}</td>
                                      <td style={{ whiteSpace: "nowrap" }}>
                                        {formatDot(
                                          sale.dotb ?? sale.dot ?? "-"
                                        )}
                                      </td>
                                      <td>{sale.agent ?? "-"}</td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan="4" className="text-danger">
                                      No Sales Available
                                    </td>
                                  </tr>
                                )}

                                {matchingSales.length > salesPerPage && (
                                  <tr>
                                    <td colSpan="4" className="text-center p-2">
                                      <button
                                        className="btn btn-sm btn-success mx-1"
                                        disabled={salesPage === 1}
                                        onClick={() =>
                                          goToPage(Math.max(1, salesPage - 1))
                                        }
                                      >
                                        Prev
                                      </button>

                                      <span className="small text-dark mx-2">
                                        Page {salesPage} of {totalSalesPages}
                                      </span>

                                      <button
                                        className="btn btn-sm btn-success mx-1"
                                        disabled={salesPage === totalSalesPages}
                                        onClick={() =>
                                          goToPage(
                                            Math.min(
                                              totalSalesPages,
                                              salesPage + 1
                                            )
                                          )
                                        }
                                      >
                                        Next
                                      </button>
                                    </td>
                                  </tr>
                                )}
                              </>
                            );
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filteredGroups.length === 0 && (
          <div className="col-12 text-center text-danger">
            No stocks available.
          </div>
        )}
      </div>

      {filteredGroups && filteredGroups.length > itemsPerPage && (
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

export default StockManagement;
