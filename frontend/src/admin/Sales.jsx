import React, { useEffect, useRef, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import axios from "axios";
import "../App.css";
import { Link, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";

function Sales() {
  const API_URL = import.meta.env.VITE_API_URL;

  const [stockList, setStockList] = useState([]);
  const [selectedStockId, setSelectedStockId] = useState("");

  const [stock, setStock] = useState({
    stock_id: "",
    sector: "",
    pax: "",
    dot: "",
    dotb: "",
    airline: "",
    agent: "",
  });

  const [agents, setAgents] = useState([]);
  const [filteredSectors, setFilteredSectors] = useState([]);
  const [showSectorSuggestions, setShowSectorSuggestions] = useState(false);
  const sectorRef = useRef(null);
  const [filteredAgents, setFilteredAgents] = useState([]);
  const [showAgentSuggestions, setShowAgentSuggestions] = useState(false);
  const agentRef = useRef(null);
  const [openIndex, setOpenIndex] = useState(null);
  const [staff, setStaff] = useState([]);
  const [stockError, setStockError] = useState("");
  const [sales, setSales] = useState(false);
  const popupRef = useRef(null);
  const buttonRef = useRef(null);
  const navigate = useNavigate();
  const [showDate, setShowDate] = useState(false);
  const [showDate1, setShowDate1] = useState(false);
  const [showDate2, setShowDate2] = useState(false);
  const portalRef = useRef(null);

  let newStockAdd = (e) => {
    e.stopPropagation();
    setSales((prev) => !prev);
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setSales(false);
      }
    }

    if (sales) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [sales]);

  const [stocks, setStocks] = useState({
    sector: "",
    pax: "",
    dot: "",
    fare: "",
    airline: "",
    pnr: "",
  });

  const handleChanges = (e) => {
    const { name, value } = e.target;
    setStocks((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmited = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post(`${API_URL}/stockpost`, stocks, {
        headers: { "Content-Type": "application/json" },
      });

      if (response.data.success) {
        toast.success(response.data.message || "Stock added successfully!");
        setStocks({
          sector: "",
          pax: "",
          dot: "",
          fare: "",
          airline: "",
          pnr: "",
        });

        setTimeout(() => {
          navigate("/admin/stockmanagement");
        }, 300);
      } else {
        toast.error(response.data.message || "Something went wrong");
      }
    } catch (err) {
      console.error("Error:", err);
    }
  };

  const fetchStocks = async () => {
    try {
      const stocksRes = await axios.get(`${API_URL}/allstocks`);
      if (stocksRes.data && stocksRes.data.success) {
        setStockList(stocksRes.data.data || []);
      } else {
        setStockList([]);
      }
    } catch (err) {
      console.error("fetchStocks error:", err);
      setStockList([]);
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [agentsRes, stocksRes] = await Promise.all([
          axios.get(`${API_URL}/allagents`),
          axios.get(`${API_URL}/allstocks`),
        ]);

        if (agentsRes.data && agentsRes.data.success) {
          setAgents(agentsRes.data.data || []);
        } else {
          setAgents([]);
        }

        if (stocksRes.data && stocksRes.data.success) {
          setStockList(stocksRes.data.data || []);
        } else {
          setStockList([]);
        }
      } catch (err) {
        console.error("Error in Promise.all:", err);
        setAgents([]);
        setStockList([]);
      }
    };

    fetchAll();
  }, [API_URL]);

  const uniqueSectors = Array.from(
    new Set(
      [
        ...agents.map((a) => a.sector || ""),
        ...stockList.map((s) => s.sector || ""),
      ]
        .map((s) => (s || "").toString().trim())
        .filter(Boolean)
    )
  );

  const handleChange = (e) => {
    const { name } = e.target;
    let { value } = e.target;

    if (name === "pax") {
      value = value === "" ? "" : value.replace(/[^\d]/g, "");
    }

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

      if (name === "agent") {
        const q = (value || "").toString().trim();
        if (!q) {
          setFilteredAgents([]);
          setShowAgentSuggestions(false);
        } else {
          const matches = agents
            .filter((a) =>
              (a.agent_name || "")
                .toString()
                .toLowerCase()
                .includes(q.toLowerCase())
            )
            .slice(0, 10);
          setFilteredAgents(matches);
          setShowAgentSuggestions(matches.length > 0);
        }
      }

      if (name === "pax") {
        validatePaxValue(value, newStock);
      }

      return newStock;
    });
  };

  function validatePaxValue(paxValue, currentStock) {
    const paxNum = parseInt(paxValue, 10);
    if (isNaN(paxNum) || paxNum < 0) {
      setStockError("");
      return;
    }

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

    if (!stockToCheck) {
      setStockError("");
      return;
    }

    const available = parseInt(stockToCheck.pax, 10);
    if (isNaN(available)) {
      setStockError("Stock has invalid pax data.");
      return;
    }

    if (paxNum > available) {
      setStockError(
        `Requested pax (${paxNum}) exceeds available (${available}).`
      );
    } else {
      setStockError("");
    }
  }

  useEffect(() => {
    function handleDocClick(e) {
      if (sectorRef.current && sectorRef.current.contains(e.target)) return;
      if (portalRef.current && portalRef.current.contains(e.target)) return;
      if (agentRef.current && agentRef.current.contains(e.target)) return;

      setShowSectorSuggestions(false);
      setShowAgentSuggestions(false);
    }

    function handleEsc(e) {
      if (e.key === "Escape") {
        setShowSectorSuggestions(false);
        setShowAgentSuggestions(false);
      }
    }

    document.addEventListener("click", handleDocClick);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("click", handleDocClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const handleSelectSector = (sector) => {
    const chosenStock = stockList.find(
      (s) =>
        (s.sector || "").toString().trim().toLowerCase() ===
        sector.toString().trim().toLowerCase()
    );

    if (chosenStock) {
      setStock((prev) => ({
        ...prev,
        sector,
        dot: chosenStock.dot ?? "",
        airline: chosenStock.airline ?? "",
        stock_id: chosenStock.id ?? "",
      }));
      setSelectedStockId(String(chosenStock.id ?? ""));
      setShowSectorSuggestions(false);
      return;
    }

    const agentMatch = agents.find(
      (a) =>
        (a.sector || "").toString().trim().toLowerCase() ===
        sector.toString().trim().toLowerCase()
    );
    if (agentMatch) {
      setStock((prev) => ({
        ...prev,
        sector,
        dot: agentMatch.dot ?? prev.dot ?? "",
        airline: agentMatch.airline ?? prev.airline ?? "",
      }));
      setShowSectorSuggestions(false);
      return;
    }

    setStock((prev) => ({ ...prev, sector }));
    setShowSectorSuggestions(false);
  };

  const handleSelectAgent = (agentName) => {
    setStock((prev) => ({ ...prev, agent: agentName }));
    setShowAgentSuggestions(false);
  };

  useEffect(() => {
    const allSales = async () => {
      try {
        const response = await axios.get(`${API_URL}/allsales`);
        const payload = response.data?.data ?? response.data;
        setStaff(Array.isArray(payload) ? payload : []);
      } catch (err) {
        console.error("error fetching allsales:", err);
      }
    };

    allSales();
    const interval = setInterval(allSales, 1000);
    return () => clearInterval(interval);
  }, [API_URL]);

  const toggleDropdown = (key) => {
    setOpenIndex(openIndex === key ? null : key);
  };

  const groupedByHeader = (() => {
    const map = new Map();
    staff.forEach((item) => {
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
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !stock.pax ||
      !stock.dot ||
      !stock.dotb ||
      !stock.airline ||
      !stock.agent
    ) {
      toast.error("Please fill required fields.");
      return;
    }

    const paxNum = parseInt(stock.pax, 10);
    if (isNaN(paxNum) || paxNum <= 0) {
      toast.error("Pax must be a positive number.");
      return;
    }

    if (stock.stock_id) {
      const chosen = stockList.find(
        (s) => String(s.id) === String(stock.stock_id)
      );
      if (!chosen) {
        toast.error("Selected stock not found. Try reloading stocks.");
        return;
      }
      const available = parseInt(chosen.pax, 10);
      if (isNaN(available)) {
        toast.error("Selected stock has invalid pax value.");
        return;
      }
      if (paxNum > available) {
        toast.error(
          `Requested pax (${paxNum}) is more than available (${available}).`
        );
        return;
      }
    }

    const payload = {
      sector: stock.sector,
      pax: paxNum,
      dot: stock.dot,
      dotb: stock.dotb,
      airline: stock.airline,
      agent: stock.agent,
    };
    if (stock.stock_id) payload.stock_id = stock.stock_id;

    try {
      const response = await axios.post(`${API_URL}/salespost`, payload, {
        headers: { "Content-Type": "application/json" },
      });

      if (response.data && response.data.success) {
        toast.success(response.data.message || "Sales added successfully!");

        setStock({
          stock_id: "",
          sector: "",
          pax: "",
          dot: "",
          dotb: "",
          airline: "",
          agent: "",
        });
        setSelectedStockId("");
      } else {
        toast.error(response.data?.message || "Something went wrong");
        return;
      }
    } catch (err) {
      toast.error("Server connection failed.");
      return;
    }

    await fetchStocks();
    try {
      const allSales = await axios.get(`${API_URL}/allsales`);
      if (allSales.data && allSales.data.success) {
        setStaff(allSales.data.data || []);
      } else {
        console.error("allsales returned non-success:", allSales.data);
      }
    } catch (err) {
      console.error("GET /allsales after submit failed:", err);
    }
  };

  const [coords, setCoords] = useState(null);

  useEffect(() => {
    function update() {
      const el = sectorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [showSectorSuggestions, stock.sector]);

  const flights = [
    "LKO MCT RUH 19 NOV OMAN AIR ALHAMD",
    "LKO MCT RUH 20 NOV OMAN AIR ALHAMD",
    "LKO MCT RUH 21 NOV OMAN AIR ALHAMD",
    "LKO MCT RUH 29 NOV OMAN AIR ALHAMD",
    "LKO MCT RUH 1 DEC OMAN AIR ALHAMD",
    "LKO MCT RUH 2 DEC OMAN AIR ALHAMD",
    "LKO MCT RUH 5 DEC OMAN AIR ALHAMD",
    "LKO MCT RUH 10 DEC OMAN AIR ALHAMD",
    "LKO MCT RUH 12 DEC OMAN AIR ALHAMD",
    "LKO MCT RUH 1 JAN OMAN AIR ALHAMD",
    "LKO MCT RUH 2 JAN OMAN AIR ALHAMD",
    "LKO MCT RUH 3 JAN OMAN AIR ALHAMD",
    "LKO MCT RUH 5 JAN OMAN AIR ALHAMD",
    "LKO MCT RUH 10 JAN OMAN AIR ALHAMD",
    "LKO MCT RUH 12 JAN OMAN AIR ALHAMD",
  ];

  return (
    <div className="content-wrapper">
      <div className="d-flex flex-wrap justify-content-between mb-0 text-center px-lg-4 m-0 py-3 mt-0 header-color">
        <form
          className="d-flex flex-row flex-row gap-2 flex-wrap ms-2 ms-lg-0"
          onSubmit={handleSubmit}
        >
          <div className="header-container">
            <div className="position-relative" ref={sectorRef}>
              <input
                type="search"
                className="form-control"
                placeholder="Search Sector"
                name="sector"
                value={stock.sector}
                onChange={handleChange}
                autoComplete="off"
                required
              />
            </div>
          </div>

          {showSectorSuggestions &&
            coords &&
            createPortal(
              <ul
                className="list-group portal-suggestion-box"
                ref={portalRef}
                style={{
                  position: "absolute",
                  top: coords.top,
                  left: coords.left,
                  width: coords.width,
                  maxHeight: 320,
                  overflowY: "auto",
                  overflowX: "hidden",
                  background: "#fff",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                  borderRadius: 6,
                  zIndex: 999999,
                  marginTop: -8,
                  padding: 0,
                  listStyle: "none",
                }}
              >
                {filteredSectors.length > 0 ? (
                  filteredSectors.map((s) => (
                    <li
                      key={s}
                      className="list-group-it1em text-dark"
                      style={{ cursor: "pointer", padding: "10px 12px" }}
                      onClick={() => {
                        handleSelectSector(s);
                        setShowSectorSuggestions(false);
                      }}
                    >
                      {s}
                    </li>
                  ))
                ) : (
                  <li style={{ padding: "8px 12px", color: "#777" }}>
                    No sector found
                  </li>
                )}
              </ul>,
              document.body
            )}

          <input
            type="number"
            className={`form-control sector-link1 ${
              stockError ? "is-invalid" : ""
            }`}
            placeholder="Add PAX"
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
            type={showDate1 ? "date" : "text"}
            className="form-control sector-link1"
            placeholder="Add DOTB"
            name="dotb"
            value={stock.dotb}
            onFocus={() => setShowDate1(true)}
            onBlur={(e) => {
              if (!e.target.value) setShowDate1(false);
            }}
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

          <div className="header-container">
            <div className="position-relative" ref={agentRef}>
              <input
                type="search"
                className="form-control"
                placeholder="Select Agent"
                name="agent"
                value={stock.agent}
                onChange={handleChange}
                autoComplete="off"
                required
              />

              {showAgentSuggestions && (
                <ul className="list-group suggestion-box1">
                  {filteredAgents.length > 0 ? (
                    filteredAgents.map((a) => (
                      <li
                        key={a._id}
                        className="list-group-item list-group-item-action1 px-3"
                        onClick={() => handleSelectAgent(a.agent_name)}
                        style={{ cursor: "pointer" }}
                      >
                        {a.agent_name}
                      </li>
                    ))
                  ) : (
                    <li className="list-group-item text-muted">
                      No agent found
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>

          <button className="btn btn-light sector-link" type="submit">
            Submit
          </button>

          <Link
            className="btn btn-light sector-link"
            onClick={newStockAdd}
            ref={buttonRef}
          >
            Add Stock
          </Link>

          {sales && (
            <div
              className="new-stock-add"
              onClick={(e) => e.stopPropagation()}
              ref={popupRef}
              role="dialog"
              aria-modal="true"
            >
              <div className="d-flex flex-column gap-2">
                <div className="col-12">
                  <input
                    type="text"
                    placeholder="Add sector"
                    className="form-control"
                    name="sector"
                    value={stocks.sector}
                    onChange={handleChanges}
                    required
                  />
                </div>

                <div className="col-12">
                  <input
                    type="number"
                    placeholder="Add PAX"
                    className="form-control"
                    name="pax"
                    value={stocks.pax}
                    onChange={handleChanges}
                    required
                  />
                </div>

                <div className="col-12">
                  <input
                    type={showDate2 ? "date" : "text"}
                    className="form-control"
                    placeholder="Add DOT"
                    name="dot"
                    value={stocks.dot}
                    onFocus={() => setShowDate2(true)}
                    onBlur={(e) => {
                      if (!e.target.value) setShowDate2(false);
                    }}
                    onChange={handleChanges}
                    required
                  />
                </div>

                <div className="col-12">
                  <input
                    type="text"
                    placeholder="Add Fare"
                    className="form-control"
                    name="fare"
                    value={stocks.fare}
                    onChange={handleChanges}
                    required
                  />
                </div>

                <div className="col-12">
                  <input
                    type="text"
                    placeholder="Add Airline"
                    className="form-control"
                    name="airline"
                    value={stocks.airline}
                    onChange={handleChanges}
                    required
                  />
                </div>

                <div className="col-12">
                  <input
                    type="text"
                    placeholder="Add PNR"
                    className="form-control"
                    name="pnr"
                    value={stocks.pnr}
                    onChange={handleChanges}
                    required
                  />
                </div>

                <div className="d-flex flex-row justify-content-center gap-2">
                  <div>
                    <button
                      className="btn btn-success"
                      type="button"
                      onClick={handleSubmited}
                    >
                      Submit
                    </button>
                  </div>

                  <div>
                    <button
                      className="btn btn-danger"
                      type="button"
                      onClick={() => setSales((prev) => !prev)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
      <div className="sales-grid grid-container">
        {groupedByHeader.map((group) => {
          const first = group.items[0] ?? {};
          const pnr = first.pnr ?? "-";
          const fare = first.fare ?? "-";

          const cardKey = group.key;

          const headerText = `${group.sector} ${group.dot} ${group.airline} ${
            group.agent !== "-" ? group.agent : "-"
          }`;

          return (
            <div key={cardKey} className="card-wrapper">
              <div className="card border-0 shadow-sm">
                <div className="card-header size-text text-dark rounded-0 d-flex justify-content-between align-items-center turq-box">
                  <div
                    className="item-color1"
                    style={{ wordBreak: "break-word" }}
                  >
                    {headerText}
                  </div>

                  <div
                    className="turq-caret"
                    role="button"
                    onClick={() => toggleDropdown(cardKey)}
                  >
                    {openIndex === cardKey ? "▴" : "▾"}
                  </div>
                </div>

                {openIndex === cardKey && (
                  <div className="card-body p-0">
                    <div className="d-flex justify-content-between align-items-center mb-2 px-2 py-2 flex-wrap">
                      <span className="text-danger me-2">
                        <strong>PNR:</strong> {pnr}
                      </span>

                      <span className="text-danger">
                        <strong>COST:</strong> {fare}
                      </span>
                    </div>

                    <div className="table-responsive">
                      <table className="table table-bordered table-striped text-center table-sm mb-0">
                        <thead className="table-light">
                          <tr>
                            <th style={{ width: "8%" }}>SL. NO</th>
                            <th style={{ width: "52%" }}>PAX</th>
                            <th style={{ width: "20%" }}>DATE</th>
                            <th style={{ width: "30%" }}>AGENT</th>
                          </tr>
                        </thead>

                        <tbody>
                          {group.items.map((it, idx) => {
                            const paxName =
                              (it.pax ?? "").toString().trim() || "-";
                            const dot = it.dot ?? group.dot ?? "-";
                            const agent = it.agent ?? group.agent ?? "-";

                            return (
                              <tr key={it.id ?? idx}>
                                <td>{idx + 1}</td>
                                <td>{paxName}</td>
                                <td>{dot}</td>
                                <td>{agent !== "-" ? agent : "-"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {groupedByHeader.length === 0 && (
          <div className="col-12 text-center text-danger">
            No sales available.
          </div>
        )}
      </div>

      <ToastContainer position="bottom-right" autoClose={1000} />
    </div>
  );
}

export default Sales;
