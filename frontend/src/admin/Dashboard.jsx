import axios from "axios";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
    const stockData = async () => {
      try {
        const response = await axios.get(`${API_URL}/allstocks`);
        const data = Array.isArray(response.data?.data)
          ? response.data.data
          : [];
        setStockList(data);
        setFilteredStockList(data);
      } catch (error) {
        console.error("error fetching stocks", error);
        setStockList([]);
        setFilteredStockList([]);
      }
    };
    stockData();
  }, [API_URL]);

  useEffect(() => {
    const fetchSales = async () => {
      try {
        const response = await axios.get(`${API_URL}/allsales`);
        setSales(Array.isArray(response.data?.data) ? response.data.data : []);
      } catch (error) {
        console.error("Error fetching sales:", error);
        setSales([]);
      }
    };
    fetchSales();
  }, [API_URL]);

  const uniqueSectors = useMemo(() => {
    const arr = (Array.isArray(stockList) ? stockList : [])
      .map((s) => (s.sector || "").toString().trim())
      .filter(Boolean);
    return Array.from(new Set(arr));
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
        if (newStock.pax) validatePaxValue(newStock.pax, newStock);
      }

      if (name === "pax") {
        validatePaxValue(value, newStock);
      }

      if (name === "dot") {
      }

      return newStock;
    });
  };

  const handleSelectSector = (sector) => {
    setStock((prev) => ({ ...prev, sector }));
    setShowSectorSuggestions(false);

    const found = stockList.find(
      (s) =>
        (s.sector || "").toString().trim().toLowerCase() ===
        sector.toString().trim().toLowerCase()
    );
    if (found) {
      setStock((prev) => ({
        ...prev,
        stock_id: found.id,
        dot: found.dot ?? prev.dot,
        airline: found.airline ?? prev.airline,
      }));
    }
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

    const sectorQuery = (stock.sector || "").toString().trim().toLowerCase();
    const dotQuery = (stock.dot || "").toString().trim().toLowerCase();

    if (!sectorQuery && !dotQuery) {
      setFilteredStockList(stockList);
      return;
    }

    const filtered = stockList.filter((s) => {
      const sSector = (s.sector || "").toString().trim().toLowerCase();
      const sDot = (s.dot || "").toString().trim().toLowerCase();

      if (sectorQuery && dotQuery) {
        return sSector.includes(sectorQuery) && sDot.includes(dotQuery);
      }
      if (sectorQuery) return sSector.includes(sectorQuery);
      return sDot.includes(dotQuery);
    });

    setFilteredStockList(filtered);
    setShowSectorSuggestions(false);
  };

  const totalPax = useMemo(() => {
    if (!Array.isArray(filteredStockList) || filteredStockList.length === 0)
      return 0;
    return filteredStockList.reduce((sum, it) => {
      const paxNum = Number(it.pax);
      return sum + (isNaN(paxNum) ? 0 : paxNum);
    }, 0);
  }, [filteredStockList]);

  return (
    <div className="content-wrapper">
      <div className="d-flex flex-wrap justify-content-start mb-0 text-center bg-success gap-5 px-1 m-0 py-3 mt-0">
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
                  const q = (stock.sector || "").toString().trim();
                  if (q) {
                    const matches = uniqueSectors.filter((s) =>
                      s.toLowerCase().includes(q.toLowerCase())
                    );
                    setFilteredSectors(matches.slice(0, 10));
                  } else {
                    setFilteredSectors(uniqueSectors.slice(0, 10));
                  }
                  setShowSectorSuggestions(true);
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
                type="search"
                placeholder="Select DOT"
                className="form-control custom-form"
                name="dot"
                value={stock.dot}
                onChange={handleChange}
              />
            </div>

            <div className="col-3 col-md-2 col-sm-2 col-lg-1 d-flex justify-content-start">
              <button className="btn btn-secondary px-1" type="submit">
                Search
              </button>
            </div>

            {totalPax > 0 && (
              <div className="col-9 col-md-10 col-sm-10 col-lg-7 mt-2 mt-md-2 ps-0">
                <div className="p-0 border rounded px-2 ticket-result bg-white text-start">
                  <span className="fw-bold text-danger">Result: </span>
                  <span className="seat-contact">
                    Total {totalPax || 0} Seats available contact travel agency
                    to book your seats.
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
            {Array.isArray(filteredStockList) &&
              filteredStockList.map((item, index) => (
                <div key={index} className="size-text mb-3">
                  <div
                    className="flight-header size-text"
                    onClick={() => toggleDropdown(index)}
                  >
                    <span>
                      {item.sector} | {item.dot} | {item.airline}
                    </span>
                    <span className="caret">
                      {openIndex === index ? "▴" : "▾"}
                    </span>
                  </div>

                  {openIndex === index && (
                    <div className="flight-body">
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-danger">
                          <strong>PNR:</strong> {item.pnr}
                        </span>
                        <span className="text-danger text-end">
                          <strong>COST:</strong> {item.fare}/-
                        </span>
                      </div>

                      <div className="table-responsive">
                        <table className="table table-bordered table-sm text-center mb-0">
                          <thead className="table-light">
                            <tr>
                              <th>SL. NO</th>
                              <th>PAX</th>
                              <th>DATE</th>
                              <th>AGENT</th>
                            </tr>
                          </thead>

                          <tbody>
                            <tr>
                              <td>1</td>
                              <td>{item.pax}</td>
                              <td>{item.dot}</td>
                              <td>{item.agent || "-"}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
