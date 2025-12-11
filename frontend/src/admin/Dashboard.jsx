import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

function Dashboard() {
  const API_URL = import.meta.env.VITE_API_URL;

  const [stockList, setStockList] = useState([]);
  const [filteredStockList, setFilteredStockList] = useState([]);
  const [sales, setSales] = useState([]);
  const [openIndex, setOpenIndex] = useState(null);
  const sectorRef = useRef(null);
  const [showSectorSuggestions, setShowSectorSuggestions] = useState(false);
  const [filteredSectors, setFilteredSectors] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [showDate, setShowDate] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  function isDotExpired(dateString) {
    if (!dateString) return false;

    const isoMatch = /^\d{4}-\d{2}-\d{2}$/.test(String(dateString).trim());
    let d;
    if (isoMatch) {
      const parts = String(dateString).trim().split("-");
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      d = new Date(y, m, day);
    } else {
      d = new Date(String(dateString));
    }

    if (isNaN(d.getTime())) return false;

    d.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
  }

  const [stock, setStock] = useState({
    stock_id: "",
    sector: "",
    pax: "",
    dot: "",
    dotb: "",
    airline: "",
    agent: "",
  });

  const [chartStats, setChartStats] = useState([
    { name: "Total Sector", value: 0 },
    { name: "Total Passenger", value: 0 },
    { name: "Total Airlines", value: 0 },
    { name: "Total PNR", value: 0 },
  ]);

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    const getToday = () => {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    };

    const parseLocalDate = (ymd) => {
      if (!ymd) return null;
      const p = ymd.split("-");
      if (p.length !== 3) return null;
      return new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
    };

    const isDotExpiredLocal = (dot) => {
      const date = parseLocalDate(dot);
      if (!date) return false;
      return date < getToday();
    };

    const stockData = async () => {
      try {
        const response = await axios.get(`${API_URL}/allstocks`, {
          signal: controller.signal,
        });

        const data = Array.isArray(response.data?.data)
          ? response.data.data
          : [];

        if (!mounted) return;

        setStockList(data);

        const nonExpired = data.filter((item) => !isDotExpiredLocal(item.dot));

        setFilteredStockList(nonExpired);
      } catch (error) {
        if (axios.isCancel(error)) {
          console.log("Stock request cancelled");
        } else {
          console.error("Error fetching stocks", error);
          setStockList([]);
          setFilteredStockList([]);
        }
      }
    };

    stockData();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [API_URL]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchSales = async () => {
      try {
        const response = await axios.get(`${API_URL}/allsales`, {
          signal: controller.signal,
        });
        setSales(Array.isArray(response.data?.data) ? response.data.data : []);
      } catch (error) {
        if (axios.isCancel(error)) {
          console.log("Sales request cancelled:", error.message);
        } else {
          console.error("Error fetching sales:", error);
          setSales([]);
        }
      }
    };

    fetchSales();

    return () => {
      controller.abort();
    };
  }, [API_URL]);

  const uniqueSectors = useMemo(() => {
    const sectors = (Array.isArray(stockList) ? stockList : [])
      .map((s) => (s.sector || "").toString().trim())
      .filter(Boolean);

    const unique = Array.from(new Set(sectors));

    return unique.filter((sector) => {
      const stocksForSector = stockList.filter(
        (s) =>
          (s.sector || "").toString().trim().toLowerCase() ===
          sector.toString().trim().toLowerCase()
      );
      if (stocksForSector.length === 0) return true;
      return stocksForSector.some((s) => !isDotExpired(s.dot));
    });
  }, [stockList]);

  useEffect(() => {
    const totalPassenger = Array.isArray(sales) ? sales.length : 0;

    if (!Array.isArray(stockList) || stockList.length === 0) {
      setChartStats([
        { name: "Total Sector", value: 0 },
        { name: "Total Passenger", value: totalPassenger },
        { name: "Total Airlines", value: 0 },
        { name: "Total PNR", value: 0 },
      ]);
      return;
    }

    const sectorSet = new Set(
      stockList.map((s) => (s.sector || "").toString().trim()).filter(Boolean)
    );
    const totalSector = sectorSet.size;

    const airlineSet = new Set(
      stockList.map((s) => (s.airline || "").toString().trim()).filter(Boolean)
    );
    const totalAirlines = airlineSet.size;

    const pnrSet = new Set(
      stockList.map((s) => (s.pnr || "").toString().trim()).filter(Boolean)
    );
    const totalPnr = pnrSet.size;

    setChartStats([
      { name: "Total Sector", value: totalSector },
      { name: "Total Passenger", value: totalPassenger },
      { name: "Total Airlines", value: totalAirlines },
      { name: "Total PNR", value: totalPnr },
    ]);
  }, [stockList, sales]);

  useEffect(() => {
    if (!sales || sales.length === 0) {
      setChartData([]);
      return;
    }

    const fareByYear = {};

    sales.forEach((item) => {
      const year = new Date(item.created_at).getFullYear();
      const fare = parseFloat(item.fare) || 0;
      if (fareByYear[year]) {
        fareByYear[year] += fare;
      } else {
        fareByYear[year] = fare;
      }
    });

    const years = Array.from({ length: 2025 - 2015 + 1 }, (_, i) => 2015 + i);
    const chartArray = years.map((year) => ({
      year,
      sell: fareByYear[year] || 0,
    }));

    setChartData(chartArray);
  }, [sales]);

  const toggleDropdown = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  function validatePaxValue(paxValue, currentStock) {
    if (paxValue === "" || paxValue === null || paxValue === undefined) return;
    const paxNum = parseInt(paxValue, 10);
    if (isNaN(paxNum) || paxNum < 0) return;

    let stockToCheck = null;
    if (currentStock.stock_id) {
      stockToCheck = stockList.find(
        (s) => String(s.id) === String(currentStock.stock_id)
      );
    } else if (
      currentStock.sector &&
      currentStock.sector.toString().trim() !== ""
    ) {
      stockToCheck = stockList.find(
        (s) =>
          (s.sector || "").toString().trim().toLowerCase() ===
          currentStock.sector.toString().trim().toLowerCase()
      );
    }
    if (!stockToCheck) return;
    const available = Number(stockToCheck.pax);
    if (isNaN(available)) return;
  }

  const handleChange = (e) => {
    const { name } = e.target;
    let { value } = e.target;

    if (name === "pax") value = value === "" ? "" : value.replace(/[^\d]/g, "");

    setStock((prev) => {
      const newStock = { ...prev, [name]: value };

      if (name === "sector") {
        const q = (value || "").toString().trim();

        if (!q) {
          setFilteredSectors([]);
          setShowSectorSuggestions(false);
        } else {
          const matches = uniqueSectors.filter((s) =>
            s.toLowerCase().includes(q.toLowerCase())
          );
          setFilteredSectors(matches.slice(0, 10));
          setShowSectorSuggestions(true);
        }
      }

      if (name === "pax") {
        validatePaxValue(value, newStock);
      }

      if (name === "dot") {
        const selected = new Date(value);
        if (!isNaN(selected)) {
          const day = selected.getDate().toString().padStart(2, "0");
          const month = selected
            .toLocaleString("en-US", { month: "short" })
            .toUpperCase();
          const year = selected.getFullYear();
          value = `${day} ${month} ${year}`;
        }
      }

      return newStock;
    });
  };

  const handleSelectSector = (sector) => {
    setStock((prev) => {
      const found = stockList.find(
        (s) =>
          (s.sector || "").toString().trim().toLowerCase() ===
          sector.toString().trim().toLowerCase()
      );

      const newStock = {
        ...prev,
        sector,
        stock_id: found ? found.id : prev.stock_id,
        airline: found?.airline ?? prev.airline,
      };

      return newStock;
    });

    setShowSectorSuggestions(false);
  };

  useEffect(() => {
    function handleClickOutside(e) {
      if (sectorRef.current && !sectorRef.current.contains(e.target)) {
        setShowSectorSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();

    const sectorQuery = (stock.sector || "").trim().toLowerCase();
    const dotQuery = (stock.dot || "").trim().toLowerCase();

    const filtered = stockList.filter((s) => {
      if (isDotExpired(s.dot)) return false;

      const sDot = (s.dot || "").toLowerCase();
      const dotQuery = (stock.dot || "").trim().toLowerCase();
      return (
        (s.sector || "").toLowerCase().includes(sectorQuery) &&
        sDot.includes(dotQuery)
      );
    });

    setFilteredStockList(filtered);
    setShowSectorSuggestions(false);
    setCurrentPage(1);
  };

  const totalPages = useMemo(() => {
    return Math.ceil((filteredStockList?.length || 0) / itemsPerPage);
  }, [filteredStockList]);

  const paginatedList = useMemo(() => {
    if (!Array.isArray(filteredStockList)) return [];
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStockList.slice(start, start + itemsPerPage);
  }, [filteredStockList, currentPage]);

  const totalPax = useMemo(() => {
    if (!Array.isArray(filteredStockList) || filteredStockList.length === 0)
      return 0;
    return filteredStockList.reduce((sum, it) => {
      const paxNum = Number(it.pax);
      return sum + (isNaN(paxNum) ? 0 : paxNum);
    }, 0);
  }, [filteredStockList]);

  function formatDot(dotValue) {
    if (!dotValue) return "";
    const isoMatch = /^\d{4}-\d{2}-\d{2}$/.test(String(dotValue).trim());
    const iso = isoMatch ? String(dotValue).trim() : null;

    const date = iso ? new Date(iso + "T00:00:00") : new Date(String(dotValue));
    if (isNaN(date.getTime())) return String(dotValue);

    const day = String(date.getDate()).padStart(2, "0");
    const month = date
      .toLocaleString("en-GB", { month: "short" })
      .toUpperCase();
    const year = date.getFullYear();

    return `${day} ${month} ${year}`;
  }

  const [permissions, setPermissions] = useState({
    can_view_agents: 0,
    can_view_fares: 0,
  });
  const [role, setRole] = useState("");

  useEffect(() => {
    const fetchPermissions = async () => {
      const storedAgent = JSON.parse(localStorage.getItem("agentUser"));
      const storedAdmin = JSON.parse(localStorage.getItem("adminUser"));

      if (storedAdmin) {
        setRole(storedAdmin.role);
        setPermissions({
          can_view_agents: 1,
          can_view_fares: 1,
        });
        return;
      }

      if (!storedAgent) return;
      setRole(storedAgent.role);

      try {
        const res = await axios.get(`${API_URL}/allagents`);
        const agents = res.data.data;
        const loggedInAgent = agents.find((a) => a.id === storedAgent.id);

        if (loggedInAgent) {
          setPermissions({
            can_view_agents: loggedInAgent.can_view_agents,
            can_view_fares: loggedInAgent.can_view_fares,
          });
        }
      } catch (err) {
        console.error("Failed to fetch agent permissions", err);
      }
    };

    fetchPermissions();
  }, []);

  return (
    <div className="content-wrapper">
      <div className="d-flex flex-wrap justify-content-start mb-0 text-center header-color gap-5 px-1 m-0 py-3 mt-0">
        <form onSubmit={handleSearch}>
          <div className="row g-2 ms-lg-3 ms-0 align-items-start">
            <div
              className="col-6 col-md-6 col-lg-2 position-relative"
              ref={sectorRef}
            >
              <input
                type="search"
                className="form-control custom-form"
                placeholder="Search Sector"
                name="sector"
                value={stock.sector}
                onChange={handleChange}
                onFocus={() => {
                  return;
                }}
                autoComplete="off"
                required
              />

              {showSectorSuggestions && (
                <ul
                  className="list-group suggestion-box1 position-absolute w-100"
                  style={{ zIndex: 9999 }}
                >
                  {filteredSectors.length > 0 ? (
                    filteredSectors.map((s) => (
                      <li
                        key={s}
                        className="list-group-item px-3 text-dark text-start list-group-item-action2"
                        onClick={() => handleSelectSector(s)}
                        style={{ cursor: "pointer" }}
                      >
                        {s}
                      </li>
                    ))
                  ) : (
                    <li className="list-group-item text-danger">
                      No sector found
                    </li>
                  )}
                </ul>
              )}
            </div>

            <div className="col-6 col-md-6 col-lg-2">
              <input
                type={showDate ? "date" : "text"}
                className="form-control custom-form"
                placeholder="Date of travel (DOT)"
                name="dot"
                value={stock.dot}
                onFocus={() => setShowDate(true)}
                onBlur={(e) => {
                  if (!e.target.value) setShowDate(false);
                }}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-3 col-md-2 col-sm-2 col-lg-1 d-flex justify-content-start">
              <button className="btn btn-secondary px-1" type="submit">
                Search
              </button>
            </div>

            {filteredStockList.length > 0 ? (
              <div className="col-9 col-md-10 col-sm-10 col-lg-7 mt-2 mt-md-2 ps-0">
                <div className="p-0 border rounded px-2 ticket-result bg-white text-start">
                  <span className="fw-bold text-success">Result: </span>
                  <span className="seat-contact">
                    Total {totalPax} Seats available. Contact travel agency to
                    book.
                  </span>
                </div>
              </div>
            ) : (
              <div className="col-9 col-md-10 col-sm-10 col-lg-7 mt-2 mt-md-2 ps-0">
                <div className="p-0 border rounded px-2 ticket-result bg-white text-start">
                  <span className="fw-bold text-danger">Result: </span>
                  <span className="seat-contact text-danger">
                    Total 0 Seats available. Contact travel agency to book.
                  </span>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>

      <div className="container-fluid py-4 dashboard">
        <div className="row">
          <div className="col-12 col-lg-8 mb-4">
            <div className="chart-wrapper ps-0">
              <ResponsiveContainer width="100%" height={700}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis dataKey="year" />
                  <YAxis
                    label={{
                      angle: -90,
                      position: "insideLeft",
                    }}
                  />

                  <Tooltip />
                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="sell"
                    stroke="#8884d8"
                    strokeWidth={3}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>

              <div className="text-center stats-labels mt-3">
                {Array.isArray(chartStats) &&
                  chartStats.map((item, i) => (
                    <div key={i} className="stat-item">
                      <h5>{item.name}</h5>
                      <p>{item.value}</p>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-4">
            {Array.isArray(paginatedList) && paginatedList.length > 0 ? (
              paginatedList.map((item, idx) => {
                const serial = (currentPage - 1) * itemsPerPage + idx + 1;

                let totalSeats = 0;
                let seatsSold = 0;
                if (Array.isArray(item.items) && item.items.length > 0) {
                  totalSeats = item.items.reduce(
                    (sum, it) => sum + (parseInt(it.pax, 10) || 0),
                    0
                  );
                  seatsSold = item.items.reduce(
                    (sum, it) => sum + (parseInt(it.sold, 10) || 0),
                    0
                  );
                } else {
                  totalSeats = parseInt(item.pax, 10) || 0;
                  seatsSold = parseInt(item.sold, 10) || 0;
                }
                const seatsLeft = totalSeats - seatsSold;

                return (
                  <div key={item.id ?? serial} className="size-text mb-3">
                    <div
                      className="flight-header size-text"
                      onClick={() => toggleDropdown(serial)}
                      style={{ cursor: "pointer" }}
                    >
                      <span>
                        {item.sector} | {formatDot(item.dot)} | {item.airline} |{" "}
                        <span className="text-success fw-bold">
                          <strong className="text-success">{seatsLeft}</strong>{" "}
                          Seats Left
                        </span>
                      </span>

                      <div className="turq-caret ms-1" role="button">
                        {openIndex === serial ? "▴" : "▾"}
                      </div>
                    </div>

                    {openIndex === serial && (
                      <div className="flight-body border border-light">
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-danger">
                            <strong>PNR:</strong> {item.pnr}
                          </span>
                          <span className="text-danger text-end">
                            <strong>COST:</strong>{" "}
                            {role === "admin" ||
                            permissions.can_view_fares === 1
                              ? item.fare + "/-"
                              : "***"}
                          </span>
                        </div>

                        <div className="d-flex flex-row justify-content-center gap-3 align-items-center mt-0 mb-2">
                          <span className="text-success1 fw-bold px-2">
                            Total Seats: <strong>{totalSeats}</strong>
                          </span>
                          <span className="text-success fw-bold">
                            Seats Sold: <strong>{seatsSold}</strong>
                          </span>
                          <span className="text-danger fw-bold pe-1">
                            Seats Left:{" "}
                            <strong className="text-danger">{seatsLeft}</strong>
                          </span>
                        </div>

                        <div className="table-responsive">
                          <table className="table table-bordered table-sm text-center mb-0">
                            <thead className="table-light">
                              <tr>
                                <th style={{ width: "15%" }}>SL. NO</th>
                                <th style={{ width: "25%" }}>PAXQ</th>
                                <th style={{ width: "30%" }}>DATE</th>
                                <th style={{ width: "25%" }}>AGENT</th>
                              </tr>
                            </thead>

                            <tbody>
                              <tr>
                                <td>{serial}</td>
                                <td>{seatsLeft}</td>
                                <td style={{ whiteSpace: "nowrap" }}>
                                  {formatDot(item.dot)}
                                </td>
                                <td>
                                  {role === "admin" ||
                                  permissions.can_view_agents === 1
                                    ? item.agent || "-"
                                    : "***"}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="size-text mb-3">
                <div className="p-3 rounded bg-white text-center">
                  <p className="mb-0 fw-bold text-danger border rounded text-start px-3 py-2">
                    No seats available for the selected date.
                  </p>
                </div>
              </div>
            )}

            {filteredStockList && filteredStockList.length > itemsPerPage && (
              <div className="d-flex justify-content-center gap-2 align-items-center mt-3">
                <button
                  type="button"
                  className="btn btn-sm btn-success pagination-button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Prev
                </button>

                <button
                  type="button"
                  className="btn btn-sm btn-success pagination-button"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
