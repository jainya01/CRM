import { useEffect, useMemo, useRef, useState } from "react";
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
  const portalRef1 = useRef(null);
  const [sectorCoords, setSectorCoords] = useState(null);
  const [agentCoords, setAgentCoords] = useState(null);
  const [groupPages, setGroupPages] = useState({});
  const itemsPerPage = 27;
  const [currentPage, setCurrentPage] = useState(1);

  const setPageForGroup = (key, page) => {
    setGroupPages((prev) => ({ ...prev, [key]: page }));
  };

  const getPageForGroup = (key) => {
    return groupPages[key] || 1;
  };

  let newStockAdd = (e) => {
    e.stopPropagation();
    setSales((prev) => !prev);
  };

  const updateSectorCoords = () => {
    if (sectorRef.current) {
      const rect = sectorRef.current.getBoundingClientRect();
      setSectorCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  };

  const updateAgentCoords = () => {
    if (agentRef.current) {
      const rect = agentRef.current.getBoundingClientRect();
      setAgentCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
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
    const controller = new AbortController();

    const fetchAll = async () => {
      try {
        const [agentsRes, stocksRes] = await Promise.all([
          axios.get(`${API_URL}/allagents`, { signal: controller.signal }),
          axios.get(`${API_URL}/allstocks`, { signal: controller.signal }),
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
        if (axios.isCancel(err)) {
          console.log("FetchAll request cancelled");
        } else {
          console.error("Error in Promise.all:", err);
          setAgents([]);
          setStockList([]);
        }
      }
    };

    fetchAll();

    return () => {
      controller.abort();
    };
  }, [API_URL]);

  useEffect(() => {
    function updatePositions() {
      if (sectorRef.current) {
        const rect = sectorRef.current.getBoundingClientRect();
        setSectorCoords({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
        });
      }

      if (agentRef.current) {
        const rect2 = agentRef.current.getBoundingClientRect();
        setAgentCoords({
          top: rect2.bottom + window.scrollY,
          left: rect2.left + window.scrollX,
          width: rect2.width,
        });
      }
    }

    updatePositions();

    window.addEventListener("resize", updatePositions);
    window.addEventListener("scroll", updatePositions, true);
    window.addEventListener("orientationchange", updatePositions);

    return () => {
      window.removeEventListener("resize", updatePositions);
      window.removeEventListener("scroll", updatePositions, true);
      window.removeEventListener("orientationchange", updatePositions);
    };
  }, [showSectorSuggestions, showAgentSuggestions, stock.sector, stock.agent]);

  const uniqueSectors = Array.from(
    new Set(
      [
        ...agents.map((a) => a.sector || ""),
        ...stockList.map((s) => s.sector || ""),
      ]
        .map((s) => (s || "").toString().trim())
        .filter(Boolean)
    )
  ).filter((sector) => {
    const stocksForSector = stockList.filter(
      (s) =>
        (s.sector || "").toString().trim().toLowerCase() ===
        sector.toString().trim().toLowerCase()
    );

    if (stocksForSector.length === 0) return true;

    return stocksForSector.some((s) => !isDotExpired(s.dot));
  });

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
    const controller = new AbortController();

    const allSales = async () => {
      try {
        const response = await axios.get(`${API_URL}/allsales`, {
          signal: controller.signal,
        });
        const payload = response.data?.data ?? response.data;
        setStaff(Array.isArray(payload) ? payload : []);
      } catch (err) {
        if (axios.isCancel(err)) {
          console.log("AllSales request cancelled");
        } else {
          console.error("Error fetching allsales:", err);
        }
      }
    };

    allSales();

    const interval = setInterval(allSales, 1000);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
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

    if (!stock.dot || !stock.dotb || !stock.airline || !stock.agent) {
      toast.error("Please fill required fields.");
      return;
    }

    const rawPax = (stock.pax || "").toString().trim();
    if (!rawPax) {
      toast.error("Please provide Pax.");
      return;
    }

    const payload = {
      sector: stock.sector,
      pax: rawPax,
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
        toast.success("Sales added successfully!");
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
      }
    } catch (err) {
      toast.error("Server connection failed.");
    }

    await fetchStocks();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setStock((prev) => {
      const newStock = { ...prev, [name]: value };

      if (name === "sector") {
        const q = (value || "").trim();
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
        const q = (value || "").trim();
        if (!q) {
          setFilteredAgents([]);
          setShowAgentSuggestions(false);
        } else {
          const matches = agents
            .filter((a) =>
              (a.agent_name || "").toLowerCase().includes(q.toLowerCase())
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

  function parseToDateObj(value) {
    if (value == null || value === "") return null;

    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;

    if (typeof value === "number" && !Number.isNaN(value)) {
      try {
        const utcDays = value - 25569;
        const utcValue = utcDays * 86400 * 1000;
        const d = new Date(utcValue);
        return isNaN(d.getTime()) ? null : d;
      } catch (e) {}
    }

    if (
      typeof value === "object" &&
      value !== null &&
      value.v &&
      (value.t === "d" || value.t === "n")
    ) {
      const d = new Date(value.v);
      return isNaN(d.getTime()) ? null : d;
    }

    if (typeof value === "string") {
      const s = value.trim();

      if (/^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}:\d{2})?$/.test(s)) {
        const iso = s.replace(" ", "T");
        const d = new Date(iso);
        if (!isNaN(d.getTime())) return d;
      }

      let m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
      if (m) {
        let [, p1, p2, p3] = m;
        if (p3.length === 2) p3 = Number(p3) < 70 ? "20" + p3 : "19" + p3;
        const dNum = parseInt(p1, 10);
        const mNum = parseInt(p2, 10);
        const yNum = parseInt(p3, 10);

        const dateObj = new Date(yNum, mNum - 1, dNum);
        if (!isNaN(dateObj.getTime())) return dateObj;
      }

      const d2 = new Date(s);
      if (!isNaN(d2.getTime())) return d2;
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
    if (value == null || value === "") return "-";
    const d = parseToDateObj(value);
    return formatDateDisplay(d);
  }

  function isDotExpired(value) {
    if (value == null || value === "") return false;
    const d = parseToDateObj(value);
    if (!d) return false;
    const parsed = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    parsed.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return parsed < today;
  }

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

  const groupedSales = useMemo(() => {
    const map = new Map();
    staff.forEach((item) => {
      const sector = (item.sector ?? "").toString().trim();
      const dot = (item.dot ?? "").toString().trim();
      const airline = (item.airline ?? "").toString().trim();

      const key = `${sector}||${dot}||${airline}`;

      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });

    return Array.from(map.entries()).map(([key, items]) => {
      const [sector, dot, airline] = key.split("||");
      return { key, sector, dot, airline, items };
    });
  }, [staff]);

  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return groupedSales.slice(start, start + itemsPerPage);
  }, [groupedSales, currentPage]);

  const totalPages = Math.ceil((groupedSales?.length || 0) / itemsPerPage);

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
                onChange={(e) => {
                  handleChange(e);
                  updateSectorCoords();
                }}
                onFocus={() => updateSectorCoords()}
                autoComplete="off"
                required
              />
            </div>
          </div>

          {showSectorSuggestions &&
            sectorCoords &&
            createPortal(
              <ul
                className="list-group portal-suggestion-box"
                ref={portalRef}
                role="listbox"
                aria-label="sector suggestions"
                style={{
                  position: "absolute",
                  top: `${sectorCoords.top}px`,
                  left: `${sectorCoords.left}px`,
                  width: `${sectorCoords.width}px`,
                  maxHeight: 320,
                  overflowY: "auto",
                  background: "#fff",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                  borderRadius: 6,
                  zIndex: 999999,
                  padding: 0,
                  listStyle: "none",
                }}
              >
                {filteredSectors.length > 0 ? (
                  filteredSectors.map((s, i) => (
                    <li
                      key={`${s}-${i}`}
                      role="option"
                      tabIndex={0}
                      onClick={() => {
                        handleSelectSector(s);
                        setShowSectorSuggestions(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleSelectSector(s);
                          setShowSectorSuggestions(false);
                        }
                      }}
                      style={{
                        cursor: "pointer",
                        padding: "10px 12px",
                        lineHeight: 1.3,
                        minHeight: 36,
                        boxSizing: "border-box",
                        whiteSpace: "normal",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {s}
                    </li>
                  ))
                ) : (
                  <li style={{ padding: "10px 12px", color: "#777" }}>
                    No sector found
                  </li>
                )}
              </ul>,
              document.body
            )}

          <input
            type="text"
            className={`form-control sector-link1 ${
              stockError ? "is-invalid" : ""
            }`}
            placeholder="PAX Name"
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
                onChange={(e) => {
                  handleChange(e);
                  updateAgentCoords();
                }}
                onFocus={() => updateAgentCoords()}
                autoComplete="off"
                required
              />

              {showAgentSuggestions &&
                agentCoords &&
                createPortal(
                  <ul
                    className="list-group portal-suggestion-box"
                    ref={portalRef1}
                    style={{
                      position: "absolute",
                      top: agentCoords.top,
                      left: agentCoords.left,
                      width: agentCoords.width,
                      maxHeight: 320,
                      overflowY: "auto",
                      background: "#fff",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                      borderRadius: 6,
                      zIndex: 999999,
                      padding: 0,
                      listStyle: "none",
                    }}
                  >
                    {filteredAgents.length > 0 ? (
                      filteredAgents.map((a) => (
                        <li
                          key={a._id}
                          style={{ cursor: "pointer", padding: "10px 12px" }}
                          onClick={() => {
                            handleSelectAgent(a.agent_name);
                            setShowAgentSuggestions(false);
                          }}
                        >
                          {a.agent_name}
                        </li>
                      ))
                    ) : (
                      <li style={{ padding: "8px 12px", color: "#777" }}>
                        No agent found
                      </li>
                    )}
                  </ul>,
                  document.body
                )}
            </div>
          </div>

          <button className="btn btn-light sector-link" type="submit">
            Submit
          </button>

          <Link
            className="btn btn-light sector-link sales-btn"
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
              <h5 className="text-light mb-3 mt-0">Add New Stock</h5>
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
                    placeholder="Add PAXQ"
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
        {paginatedGroups.map((group) => {
          const first = group.items[0] ?? {};
          const pnr = first.pnr ?? "-";
          const fare = first.fare ?? "-";
          const cardKey = group.key;
          const formattedDot = formatDot(group.dot);
          const headerText = `${group.sector} ${formattedDot} ${group.airline}`;

          return (
            <div key={cardKey} className="card-wrapper">
              <div className="card border-0 shadow-sm">
                <div className="card-header size-text text-dark rounded-0 d-flex justify-content-between align-items-center turq-box">
                  <div
                    className="item-color1"
                    style={{ wordBreak: "break-word", cursor: "pointer" }}
                    onClick={() => toggleDropdown(cardKey)}
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
                        <strong>COST:</strong> {fare}/-
                      </span>
                    </div>

                    <div className="table-responsive">
                      <table className="table table-bordered table-striped text-center table-sm mb-0">
                        <thead className="table-light">
                          <tr>
                            <th style={{ width: "15%" }}>SL. NO</th>
                            <th style={{ width: "30%" }}>PAX Name</th>
                            <th style={{ width: "30%" }}>DATE</th>
                            <th style={{ width: "25%" }}>AGENT</th>
                          </tr>
                        </thead>

                        <tbody>
                          {(() => {
                            const items = group.items ?? [];
                            const itemsPerPage = 7;
                            const currentPage = getPageForGroup(group.key);
                            const startIdx = (currentPage - 1) * itemsPerPage;
                            const paginatedItems = items.slice(
                              startIdx,
                              startIdx + itemsPerPage
                            );
                            const totalPages = Math.ceil(
                              items.length / itemsPerPage
                            );

                            if (items.length === 0) {
                              return (
                                <tr>
                                  <td colSpan="4" className="text-danger">
                                    No Sales Available
                                  </td>
                                </tr>
                              );
                            }

                            return (
                              <>
                                {paginatedItems.map((it, idx) => {
                                  const paxName =
                                    (it.pax ?? "").toString().trim() || "-";
                                  const dotb = formatDot(
                                    it.dotb ?? group.dot ?? "-"
                                  );
                                  const agent = it.agent ?? "-";

                                  return (
                                    <tr key={it.id ?? idx}>
                                      <td>{startIdx + idx + 1}</td>
                                      <td>{paxName}</td>
                                      <td style={{ whiteSpace: "nowrap" }}>
                                        {dotb}
                                      </td>
                                      <td>{agent}</td>
                                    </tr>
                                  );
                                })}

                                {items.length > itemsPerPage && (
                                  <tr>
                                    <td colSpan="4" className="text-center p-2">
                                      <button
                                        className="btn btn-sm btn-success mx-1"
                                        disabled={currentPage === 1}
                                        onClick={() =>
                                          setPageForGroup(
                                            group.key,
                                            Math.max(1, currentPage - 1)
                                          )
                                        }
                                      >
                                        Prev
                                      </button>
                                      <span className="mx-2">
                                        Page {currentPage} of {totalPages}
                                      </span>
                                      <button
                                        className="btn btn-sm btn-success mx-1"
                                        disabled={currentPage === totalPages}
                                        onClick={() =>
                                          setPageForGroup(
                                            group.key,
                                            Math.min(
                                              totalPages,
                                              currentPage + 1
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

        {paginatedGroups.length === 0 && (
          <div className="col-12 text-center text-danger">
            No sales available.
          </div>
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



      {/* <div className="d-flex justify-content-center">
        <div className="blink-box"></div>
      </div> */}





      <ToastContainer position="bottom-right" autoClose={1000} />
    </div>
  );
}

export default Sales;
