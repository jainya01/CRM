import { useEffect, useMemo, useState } from "react";
import axios from "axios";
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
  const [chartData, setChartData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [paxQuery, setPaxQuery] = useState("");
  const itemsPerPage = 13;

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

    const parseLocalDate = (dot) => {
      if (!dot) return null;
      const s = String(dot).trim();
      const parts = s.split("-");
      if (parts.length !== 3) return null;

      let y, m, d;
      if (parts[0].length === 4) {
        y = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10) - 1;
        d = parseInt(parts[2], 10);
      } else {
        d = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10) - 1;
        y = parseInt(parts[2], 10);
        if (y < 100) y = y < 70 ? 2000 + y : 1900 + y;
      }

      const dt = new Date(y, m, d);
      return isNaN(dt.getTime()) ? null : dt;
    };

    const isDotExpiredLocal = (dot) => {
      const date = parseLocalDate(dot);
      if (!date) return false;
      const cmp = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const today = getToday();
      return cmp < today;
    };

    const fetchData = async () => {
      try {
        const [stocksRes, salesRes] = await Promise.all([
          axios.get(`${API_URL}/allstocks`, { signal: controller.signal }),
          axios.get(`${API_URL}/allsales`, { signal: controller.signal }),
        ]);

        if (!mounted) return;

        const stockData = Array.isArray(stocksRes.data?.data)
          ? stocksRes.data.data
          : [];

        const salesData = Array.isArray(salesRes.data?.data)
          ? salesRes.data.data
          : [];

        setStockList(stockData);
        setSales(salesData);

        const nonExpiredStocks = stockData.filter(
          (item) => !isDotExpiredLocal(item.dot)
        );

        const latestSaleMap = {};
        salesData.forEach((s) => {
          if (!s.stock_id) return;
          const t = new Date(s.updated_at || s.created_at || 0).getTime();

          if (!latestSaleMap[s.stock_id] || t > latestSaleMap[s.stock_id]) {
            latestSaleMap[s.stock_id] = t;
          }
        });

        const sortedStocks = [...nonExpiredStocks].sort((a, b) => {
          const aSaleTime = latestSaleMap[a.id] || 0;
          const bSaleTime = latestSaleMap[b.id] || 0;

          const aStockTime = new Date(
            a.updated_at || a.created_at || 0
          ).getTime();

          const bStockTime = new Date(
            b.updated_at || b.created_at || 0
          ).getTime();

          const aFinalTime = Math.max(aSaleTime, aStockTime);
          const bFinalTime = Math.max(bSaleTime, bStockTime);

          return bFinalTime - aFinalTime;
        });

        setFilteredStockList(sortedStocks);
      } catch (error) {
        if (!axios.isCancel(error)) {
          setStockList([]);
          setFilteredStockList([]);
          setSales([]);
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [API_URL]);

  const [salesPageState, setSalesPageState] = useState({});
  const [searchType, setSearchType] = useState("");
  const [pnrQuery, setPnrQuery] = useState("");

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

  const handleSearch = (e) => {
    e.preventDefault();

    if (searchType === "pnr") {
      const q = pnrQuery.trim().toLowerCase();

      const filtered = stockList.filter(
        (s) => !isDotExpired(s.dot) && (s.pnr || "").toLowerCase().includes(q)
      );

      setFilteredStockList(filtered);
      setCurrentPage(1);
      return;
    }

    if (searchType === "dot") {
      if (!stock.dot) return;

      const qDate = parseToDateObj(stock.dot);

      const filtered = stockList.filter((s) => {
        if (isDotExpired(s.dot)) return false;

        const sDate = parseToDateObj(s.dot);
        if (!qDate || !sDate) return false;

        return (
          sDate.getFullYear() === qDate.getFullYear() &&
          sDate.getMonth() === qDate.getMonth() &&
          sDate.getDate() === qDate.getDate()
        );
      });

      setFilteredStockList(filtered);
      setCurrentPage(1);
      return;
    }

    if (searchType === "pax") {
      const q = paxQuery.trim().toLowerCase();

      const matchedSales = sales.filter((s) =>
        (s.pax || s.name || "").toLowerCase().includes(q)
      );

      const stockIdSet = new Set(matchedSales.map((s) => String(s.stock_id)));

      const filtered = stockList.filter(
        (st) => !isDotExpired(st.dot) && stockIdSet.has(String(st.id))
      );

      setFilteredStockList(filtered);
      setCurrentPage(1);
      return;
    }

    if (searchType === "sector") {
      const originQ = origin.trim().toLowerCase();
      const destinationQ = destination.trim().toLowerCase();
      const dateQ = stock.dot ? parseToDateObj(stock.dot) : null;

      const filtered = stockList.filter((s) => {
        if (isDotExpired(s.dot)) return false;

        let sectorRaw = (s.sector || "").toLowerCase();

        sectorRaw = sectorRaw
          .replace(/\s+to\s+/g, "-")
          .replace(/\s*→\s*/g, "-")
          .replace(/\s*\/\s*/g, "-")
          .replace(/\s*-\s*/g, "-")
          .trim();

        const [sectorOrigin = "", sectorDestination = ""] = sectorRaw
          .split("-")
          .map((p) => p.trim());

        let matchesSector = true;

        if (originQ && destinationQ) {
          matchesSector =
            sectorOrigin === originQ && sectorDestination === destinationQ;
        } else if (originQ) {
          matchesSector = sectorOrigin.startsWith(originQ);
        } else if (destinationQ) {
          matchesSector = sectorDestination.endsWith(destinationQ);
        }

        let matchesDate = true;
        if (dateQ) {
          const sDate = parseToDateObj(s.dot);
          if (!sDate) return false;

          matchesDate =
            sDate.getFullYear() === dateQ.getFullYear() &&
            sDate.getMonth() === dateQ.getMonth() &&
            sDate.getDate() === dateQ.getDate();
        }

        return matchesSector && matchesDate;
      });

      setFilteredStockList(filtered);
      setCurrentPage(1);
      return;
    }
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

  function parseToDateObj(value) {
    if (!value) return null;

    if (value instanceof Date && !isNaN(value)) return value;

    if (typeof value === "string") {
      const s = value.trim();

      const yxx = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
      if (yxx) {
        const [, y, a, b] = yxx.map(Number);

        let day, month;

        if (a > 12) {
          day = a;
          month = b;
        } else if (b > 12) {
          month = a;
          day = b;
        } else {
          month = a;
          day = b;
        }

        return new Date(y, month - 1, day);
      }

      const xxxy = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
      if (xxxy) {
        let [, a, b, y] = xxxy;
        y = y.length === 2 ? (Number(y) < 70 ? "20" + y : "19" + y) : y;

        a = Number(a);
        b = Number(b);

        let day, month;

        if (a > 12) {
          day = a;
          month = b;
        } else if (b > 12) {
          month = a;
          day = b;
        } else {
          day = a;
          month = b;
        }

        return new Date(Number(y), month - 1, day);
      }

      const fallback = new Date(s);
      if (!isNaN(fallback)) return fallback;
    }

    return null;
  }

  function formatDateDisplay(d) {
    if (!d || !(d instanceof Date) || isNaN(d.getTime())) return "-";

    const day = String(d.getDate()).padStart(2, "0");
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
    const month = monthNames[d.getMonth()];
    const year = d.getFullYear();

    return `${day} ${month} ${year}`;
  }

  function formatDot(value) {
    const d = parseToDateObj(value);
    return formatDateDisplay(d);
  }

  const [open, setOpen] = useState(false);
  const [role, setRole] = useState("");
  const [staff, setStaff] = useState([]);

  const [permissions, setPermissions] = useState({
    can_view_agents: 0,
    can_view_fares: 0,
  });

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const staffResponse = await axios.get(`${API_URL}/allstaffs`);
        const staffs = staffResponse.data?.data || staffResponse.data || [];

        if (isMounted) {
          setStaff(staffs);
        }

        const admin = JSON.parse(localStorage.getItem("adminUser"));
        const staffUser = JSON.parse(localStorage.getItem("staffUser"));
        const agentUser = JSON.parse(localStorage.getItem("agentUser"));

        if (agentUser) {
          if (isMounted) setRole("agent");

          const agentRes = await axios.get(`${API_URL}/allagents`);
          const agents = agentRes.data?.data || [];

          const me = agents.find((a) => String(a.id) === String(agentUser.id));

          if (isMounted) {
            setPermissions({
              can_view_agents: Number(me?.can_view_agents) || 0,
              can_view_fares: Number(me?.can_view_fares) || 0,
            });
          }
          return;
        }

        if (admin) {
          if (isMounted) {
            setRole("admin");
            setPermissions({ can_view_agents: 1, can_view_fares: 1 });
          }
          return;
        }

        if (staffUser) {
          if (isMounted) setRole("staff");

          const me = staffs.find((s) => String(s.id) === String(staffUser.id));

          if (isMounted) {
            setPermissions({
              can_view_fares: Number(me?.can_view_fares) || 0,
            });
          }
          return;
        }

        if (isMounted) {
          setRole("");
          setPermissions({ can_view_agents: 0, can_view_fares: 0 });
        }
      } catch (err) {
        console.error("Auth init failed:", err);
        if (isMounted) {
          setRole("");
          setPermissions({ can_view_agents: 0, can_view_fares: 0 });
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, [API_URL]);

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");

  const swapValues = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  return (
    <div className="content-wrapper">
      <div className="d-flex flex-wrap justify-content-start mb-0 text-center header-color gap-5 px-1 m-0 py-3 mt-0">
        <form onSubmit={handleSearch}>
          <div className="d-flex align-items-center flex-wrap gap-2 ms-lg-2 ms-1 w-100">
            <div style={{ minWidth: "200px" }}>
              <div
                className={`dropdown-wrapper origin-reolve text-start ${
                  open ? "open" : ""
                }`}
              >
                <select
                  className="custom-select text-dark"
                  value={searchType}
                  onFocus={() => setOpen(true)}
                  onBlur={() => setOpen(false)}
                  onChange={(e) => {
                    setSearchType(e.target.value);
                    setOpen(false);
                  }}
                >
                  <option value="">Select & Option</option>
                  <option value="sector">Search Sector</option>
                  <option value="pnr">PNR</option>
                  <option value="dot">DOT</option>
                  <option value="pax">PAX Name</option>
                </select>
              </div>
            </div>

            {searchType === "sector" && (
              <>
                <div style={{ width: "360px" }} className="origin-desti me-1">
                  <div className="route-input-wrapper">
                    <input
                      type="text"
                      className="route-input left"
                      placeholder="Enter Origin"
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                    />

                    <button
                      type="button"
                      className="swap-btn fw-bold"
                      onClick={swapValues}
                    >
                      ⇄
                    </button>

                    <input
                      type="text"
                      className="route-input right"
                      placeholder="Enter Destination"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <input
                    type="date"
                    className="form-control"
                    value={stock.dot}
                    onChange={(e) =>
                      setStock((prev) => ({ ...prev, dot: e.target.value }))
                    }
                  />
                </div>
              </>
            )}

            {searchType === "pnr" && (
              <input
                type="search"
                className="form-control pnr-wise"
                placeholder="Search by PNR Number"
                // style={{ width: "220px" }}
                value={pnrQuery}
                onChange={(e) => setPnrQuery(e.target.value)}
                required
              />
            )}

            {searchType === "dot" && (
              <input
                type="date"
                className="form-control pnr-wise"
                style={{ width: "220px" }}
                value={stock.dot}
                onChange={(e) =>
                  setStock((prev) => ({ ...prev, dot: e.target.value }))
                }
                required
              />
            )}

            {searchType === "pax" && (
              <input
                type="search"
                className="form-control pnr-wise"
                placeholder="Search by PAX Name"
                style={{ width: "220px" }}
                value={paxQuery}
                onChange={(e) => setPaxQuery(e.target.value)}
                required
              />
            )}

            <div style={{ width: "90px" }} className="mt-0">
              <button className="btn btn-secondary" type="submit">
                Search
              </button>
            </div>

            <div style={{ minWidth: "260px" }} className="box-end">
              <div className="border rounded px-2 py-1 bg-white text-start">
                <span
                  className={`fw-bold ${
                    totalPax > 0 ? "text-success" : "text-danger"
                  }`}
                >
                  <span className="text-dark">Result:</span>
                </span>{" "}
                <span
                  className={`fw-bold ${
                    totalPax > 0 ? "text-success" : "text-danger"
                  }`}
                >
                  Total {totalPax} Seats available.
                </span>
              </div>
            </div>
          </div>
        </form>
      </div>

      <div className="container-fluid py-4 dashboard">
        <div className="row">
          <div className="col-12 col-lg-8 mb-4">
            <div className="chart-wrapper ps-0">
              <ResponsiveContainer width="100%" height={680}>
                <LineChart
                  data={chartData}
                  margin={{ top: 0, right: 20, bottom: 20, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis dataKey="year" />

                  <YAxis
                    tickFormatter={(value) =>
                      value >= 1000000
                        ? `${value / 1000000}M`
                        : value >= 1000
                        ? `${value / 1000}K`
                        : value
                    }
                    label={{
                      angle: -90,
                      position: "insideLeft",
                      offset: 0,
                    }}
                  />

                  <Tooltip
                    formatter={(value) => new Intl.NumberFormat().format(value)}
                  />
                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="sell"
                    stroke="#8884d8"
                    strokeWidth={3}
                    activeDot={{ r: 6, stroke: "none" }}
                  />
                </LineChart>
              </ResponsiveContainer>

              <div className="text-center stats-labels d-flex flex-row flex-wrap mt-3">
                {Array.isArray(chartStats) &&
                  chartStats.map((item, i) => (
                    <div key={i} className="stat-item mb-2">
                      <h5 className="text-start fw-bold">{item.name}</h5>
                      <p className="fw-bold">{item.value}</p>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-4">
            {Array.isArray(paginatedList) && paginatedList.length > 0 ? (
              paginatedList.map((item, idx) => {
                const serial = (currentPage - 1) * itemsPerPage + idx + 1;

                const toIntOrNull = (v) => {
                  if (v === null || v === undefined) return null;
                  const n = Number(String(v).trim());
                  if (!Number.isFinite(n)) return null;
                  const i = Math.trunc(n);
                  return Number.isNaN(i) ? null : i;
                };

                const hasTopPaxKey = Object.prototype.hasOwnProperty.call(
                  item,
                  "pax"
                );
                const hasTopSoldKey = Object.prototype.hasOwnProperty.call(
                  item,
                  "sold"
                );

                const topPax = hasTopPaxKey ? toIntOrNull(item.pax) : null;
                const topSold = hasTopSoldKey ? toIntOrNull(item.sold) : null;

                let totalSeats = 0;
                let seatsSold = 0;

                if (topPax !== null) {
                  totalSeats = topPax;
                } else if (Array.isArray(item.items) && item.items.length > 0) {
                  totalSeats = item.items.reduce(
                    (sum, it) => sum + (toIntOrNull(it.pax) ?? 0),
                    0
                  );
                } else {
                  totalSeats = 0;
                }

                if (topSold !== null) {
                  seatsSold = topSold;
                } else if (Array.isArray(item.items) && item.items.length > 0) {
                  seatsSold = item.items.reduce(
                    (sum, it) => sum + (toIntOrNull(it.sold) ?? 0),
                    0
                  );
                } else {
                  seatsSold = 0;
                }

                const rawSeatsLeft = totalSeats - seatsSold;
                const seatsLeft = Math.max(0, rawSeatsLeft);

                return (
                  <div key={item.id ?? serial} className="size-text mb-3">
                    <div
                      className="flight-header size-text"
                      onClick={() => toggleDropdown(serial)}
                      style={{ cursor: "pointer" }}
                    >
                      <span>
                        {item.sector} |
                        <span className="text-success fw-bold ms-2">
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
                        <div className="d-flex justify-content-between mb-1">
                          <span className="text-danger">
                            <strong>PNR:</strong> {item.pnr}
                          </span>

                          <span className="text-danger text-end">
                            <strong>COST:</strong>{" "}
                            {role === "admin"
                              ? item.fare + "/-"
                              : (role === "staff" || role === "agent") &&
                                permissions.can_view_fares === 1
                              ? item.fare + "/-"
                              : "***"}
                          </span>
                        </div>

                        <div className="d-flex justify-content-between mb-2">
                          <div>
                            <span className="fw-bold">Date:</span>{" "}
                            {formatDot(item.dot)}
                          </div>

                          <div>
                            <span className="fw-bold">Airline:</span>{" "}
                            {item.airline}
                          </div>
                        </div>

                        <div className="d-flex flex-row justify-content-between gap-3 align-items-center mt-0 mb-2">
                          <span className="text-success1 fw-bold">
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
                                <th style={{ width: "25%" }}>PAX NAME</th>
                                <th style={{ width: "30%" }}>DATE</th>
                                <th style={{ width: "25%" }}>AGENT</th>
                              </tr>
                            </thead>

                            <tbody>
                              {(() => {
                                const salesForStock = Array.isArray(sales)
                                  ? sales.filter(
                                      (s) =>
                                        String(s.stock_id) === String(item.id)
                                    )
                                  : [];

                                if (salesForStock.length === 0) {
                                  return (
                                    <tr>
                                      <td
                                        colSpan="4"
                                        className="text-danger fw-bold"
                                      >
                                        No sales available.
                                      </td>
                                    </tr>
                                  );
                                }

                                const salesPerPage = 7;

                                const salesPage = salesPageState[item.id] || 1;

                                const start = (salesPage - 1) * salesPerPage;
                                const paginatedSales = salesForStock.slice(
                                  start,
                                  start + salesPerPage
                                );

                                const totalPages = Math.ceil(
                                  salesForStock.length / salesPerPage
                                );

                                const goToPage = (p) => {
                                  setSalesPageState((prev) => ({
                                    ...prev,
                                    [item.id]: p,
                                  }));
                                };

                                return (
                                  <>
                                    {paginatedSales.map((sale, idx) => (
                                      <tr key={`sale-${sale.id}-${idx}`}>
                                        <td>{start + idx + 1}</td>
                                        <td>{sale.pax ?? sale.name ?? "-"}</td>
                                        <td style={{ whiteSpace: "nowrap" }}>
                                          {formatDot(
                                            sale.dotb ?? sale.dot ?? sale.dotb
                                          )}
                                        </td>
                                        <td>
                                          {role === "admin" || role === "staff"
                                            ? sale.agent || "-"
                                            : role === "agent" &&
                                              permissions.can_view_agents === 1
                                            ? sale.agent || "-"
                                            : "***"}
                                        </td>
                                      </tr>
                                    ))}

                                    {salesForStock.length > salesPerPage && (
                                      <tr>
                                        <td
                                          colSpan="4"
                                          className="text-center p-2"
                                        >
                                          <button
                                            className="btn btn-sm btn-success mx-1"
                                            disabled={salesPage === 1}
                                            onClick={() =>
                                              goToPage(salesPage - 1)
                                            }
                                          >
                                            Prev
                                          </button>

                                          <span className="small text-dark mx-2">
                                            Page {salesPage} of {totalPages}
                                          </span>

                                          <button
                                            className="btn btn-sm btn-success mx-1"
                                            disabled={salesPage === totalPages}
                                            onClick={() =>
                                              goToPage(salesPage + 1)
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
                );
              })
            ) : (
              <div className="size-text mb-3">
                <div className="p-3 rounded bg-white text-center">
                  <p className="mb-0 fw-bold text-danger border rounded text-start px-3 py-2">
                    No records found for the selected search criteria.
                  </p>
                </div>
              </div>
            )}

            {filteredStockList && filteredStockList.length > itemsPerPage && (
              <div className="d-flex justify-content-center gap-2 align-items-center mt-0">
                <button
                  type="button"
                  className="btn btn-sm btn-success pagination-button"
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
