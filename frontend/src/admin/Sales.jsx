import { useEffect, useMemo, useRef, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faTrash } from "@fortawesome/free-solid-svg-icons";
import "../App.css";
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
  const [showDate, setShowDate] = useState(false);
  const [showDate1, setShowDate1] = useState(false);
  const portalRef = useRef(null);
  const portalRef1 = useRef(null);
  const [sectorCoords, setSectorCoords] = useState(null);
  const [agentCoords, setAgentCoords] = useState(null);
  const [groupPages, setGroupPages] = useState({});
  const itemsPerPage = 42;
  const [currentPage, setCurrentPage] = useState(1);
  const [showAgentList, setShowAgentList] = useState(false);
  const [showSectorList, setShowSectorList] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const agentInputRef = useRef(null);
  const agentDropdownRef = useRef(null);
  const modalRef = useRef(null);

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

  const editSectorOptions = useMemo(() => {
    return stockList
      .filter((s) => s.sector)
      .map((s) => ({
        id: s.id,
        sector: s.sector.toString().trim(),
      }));
  }, [stockList]);

  const setPageForGroup = (key, page) => {
    setGroupPages((prev) => ({ ...prev, [key]: page }));
  };

  const getPageForGroup = (key) => {
    return groupPages[key] || 1;
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

  const sectorOptions = useMemo(() => {
    return stockList
      .filter(
        (s) =>
          s.sector &&
          !isDotExpired(s.dot) &&
          parseInt(s.pax, 10) !== parseInt(s.sold, 10)
      )
      .map((s) => ({
        id: s.id,
        sector: s.sector.toString().trim(),
        dot: s.dot,
        airline: s.airline,
      }));
  }, [stockList]);

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

  const handleSelectSector = (stockItem) => {
    setStock((prev) => ({
      ...prev,
      sector: stockItem.sector,
      dot: stockItem.dot ?? "",
      airline: stockItem.airline ?? "",
      stock_id: stockItem.id,
    }));

    setSelectedStockId(String(stockItem.id));
    setShowSectorSuggestions(false);
  };

  const handleSelectAgent = (agentName) => {
    setStock((prev) => ({ ...prev, agent: agentName }));
    setShowAgentSuggestions(false);
  };

  const fetchSales = async () => {
    try {
      const response = await axios.get(`${API_URL}/allsales`);
      const payload = response.data?.data ?? response.data;
      setStaff(Array.isArray(payload) ? payload : []);
    } catch (err) {
      console.error("Error fetching allsales:", err);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [API_URL]);

  const toggleDropdown = (key) => {
    setOpenIndex(openIndex === key ? null : key);
  };

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
      flightno: stock.flightno,
    };

    if (stock.stock_id) payload.stock_id = stock.stock_id;

    try {
      const response = await axios.post(`${API_URL}/salespost`, payload, {
        headers: { "Content-Type": "application/json" },
      });

      if (response.data?.success) {
        toast.success("Sales added successfully!");

        setStock({
          stock_id: "",
          sector: "",
          pax: "",
          dot: "",
          dotb: "",
          airline: "",
          agent: "",
          flightno: "",
        });

        setSelectedStockId("");

        fetchSales();
      } else {
        toast.error(response.data?.message || "Something went wrong");
      }
    } catch (err) {
      toast.error("Server connection failed.");
    }
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
          const matches = sectorOptions.filter((s) =>
            s.sector.toLowerCase().includes(q.toLowerCase())
          );

          setFilteredSectors(matches.slice(0, 10));
          setShowSectorSuggestions(matches.length > 0);

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

      const key = sector;

      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });

    return Array.from(map.entries()).map(([key, items]) => {
      const firstItem = items[0] ?? {};
      return {
        key,
        sector: key,
        dot: firstItem.dot ?? "-",
        airline: firstItem.airline ?? "-",
        items,
      };
    });
  }, [staff]);

  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return groupedSales.slice(start, start + itemsPerPage);
  }, [groupedSales, currentPage]);

  const totalPages = Math.ceil((groupedSales?.length || 0) / itemsPerPage);

  const groupedBySector = useMemo(() => {
    if (!paginatedGroups || paginatedGroups.length === 0) return [];

    const map = new Map();

    paginatedGroups.forEach((group) => {
      const sector = group.sector?.trim() || "Unknown";
      if (!map.has(sector)) {
        map.set(sector, []);
      }
      map.get(sector).push(...(group.items ?? []));
    });

    return Array.from(map.entries()).map(([sector, items]) => {
      const flightno = items[0]?.flightno ?? "-";
      return {
        sector,
        items,
        flightno,
      };
    });
  }, [paginatedGroups]);

  const deletedata = async (sector) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete all sales of this sector?"
    );

    if (!confirmDelete) return;

    try {
      const res = await axios.delete(`${API_URL}/deletesalesdata/${sector}`, {
        data: { staff },
      });

      toast.success(res.data.message || "Sales deleted");
    } catch (error) {
      console.error(error);
      toast.error("Delete failed");
    }
  };

  const deletedata1 = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this sale?"
    );

    if (!confirmDelete) return;

    try {
      const res = await axios.delete(`${API_URL}/deletesalesid/${id}`, {
        data: { staff },
      });

      toast.success(res.data.message || "Sale deleted successfully");
    } catch (error) {
      console.error(error);
      toast.error("Delete failed");
    }
  };

  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState({
    id: "",
    sector: "",
    pax: "",
    dotb: "",
    agent: "",
  });

  const handleUpdate = async () => {
    if (!editData.id) {
      toast.warn("No record selected to update.");
      return;
    }

    try {
      const response = await axios.put(
        `${API_URL}/updatesales/${editData.id}`,
        {
          sector: editData.sector,
          pax: editData.pax,
          dotb: editData.dotb,
          agent: editData.agent,
        }
      );

      setShowModal(false);

      if (typeof fetchSales === "function") {
        fetchSales();
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
                  lineHeight: 4.5,
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
                  filteredSectors.map((item) => (
                    <li
                      key={item.id}
                      role="option"
                      tabIndex={0}
                      onClick={() => {
                        handleSelectSector(item);
                        setShowSectorSuggestions(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleSelectSector(item);
                          setShowSectorSuggestions(false);
                        }
                      }}
                      style={{
                        cursor: "pointer",
                        padding: "10px 12px",
                        lineHeight: 1.3,
                        wordBreak: "break-word",
                      }}
                    >
                      <div>{item.sector}</div>
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
                    {stock.agent && filteredAgents.length > 0 ? (
                      filteredAgents.map((a, idx) => (
                        <li
                          key={(a._id, idx)}
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
        </form>
      </div>

      <div className="sales-grid grid-container">
        {groupedBySector.map((group) => {
          const cardKey = group.sector;

          return (
            <div key={cardKey} className="card-wrapper">
              <div className="card border-0 shadow-sm">
                <div
                  className="card-header size-text text-dark rounded-0 d-flex justify-content-between align-items-center turq-box"
                  style={{ cursor: "pointer" }}
                  onClick={() => toggleDropdown(cardKey)}
                >
                  <div
                    className="item-color1 d-flex gap-2"
                    style={{ wordBreak: "break-word", cursor: "pointer" }}
                  >
                    {group.sector} |
                    <div className="d-flex align-items-center justify-content-center">
                      <FontAwesomeIcon
                        icon={faTrash}
                        title="Delete"
                        className="custom-color-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          deletedata(group.sector);
                        }}
                      />
                    </div>
                  </div>

                  <div className="turq-caret" role="button">
                    {openIndex === cardKey ? "▴" : "▾"}
                  </div>
                </div>

                {openIndex === cardKey && (
                  <div className="card-body p-2 controll-size">
                    {(() => {
                      const uniquePnrMap = new Map();
                      group.items.forEach((item) => {
                        if (!uniquePnrMap.has(item.pnr)) {
                          uniquePnrMap.set(item.pnr, item);
                        }
                      });
                      const uniquePnrItems = Array.from(uniquePnrMap.values());

                      return uniquePnrItems.map((item, idx) => {
                        const pnr = item.pnr ?? "-";
                        const fare = item.fare ?? "-";
                        const dot = formatDot(item.dot) ?? "-";
                        const airline = item.airline ?? "-";

                        return (
                          <div key={item.id ?? idx} className="mb-1">
                            <div className="border border-success px-2 py-2 rounded-1">
                              <div className="d-flex flex-row justify-content-between">
                                <span className="text-danger text-start">
                                  <strong>PNR:</strong> {pnr} &nbsp;
                                </span>

                                <span className="text-danger text-center">
                                  <strong>COST:</strong> {fare}/- &nbsp;
                                </span>

                                <span className="text-danger text-end">
                                  <span className="fw-bold">SUPPLIER:</span> AL
                                  HAMD
                                </span>
                              </div>

                              <hr className="mt-1 mb-1" />

                              <div className="d-flex flex-row justify-content-between">
                                <span className="text-start">
                                  <strong>Date:</strong> {dot} &nbsp;
                                </span>

                                <span className="text-end">
                                  <strong>Airline:</strong> {airline}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}

                    <div className="table-responsive">
                      <table className="table table-bordered table-striped text-center table-sm mb-0">
                        <thead className="table-light">
                          <tr>
                            <th style={{ width: "15%" }}>SL.NO</th>
                            <th style={{ width: "30%" }}>PAX Name</th>
                            <th style={{ width: "30%" }}>DATE</th>
                            <th style={{ width: "25%" }}>AGENT</th>
                            <th style={{ width: "25%" }}>ACTION</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const items = group.items ?? [];
                            const itemsPerPage = 5;
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
                                  <td colSpan="5" className="text-danger">
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
                                      <td>
                                        <FontAwesomeIcon
                                          icon={faTrash}
                                          title="Delete"
                                          className="ms-2 custom-color-delete"
                                          style={{ cursor: "pointer" }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            deletedata1(it.id);
                                          }}
                                        />

                                        <FontAwesomeIcon
                                          icon={faEdit}
                                          title="Edit"
                                          className="ms-2 custom-color-delete"
                                          style={{ cursor: "pointer" }}
                                          onClick={(e) => {
                                            e.stopPropagation();

                                            setEditData({
                                              id: it.id,
                                              sector: it.sector || "",
                                              pax: it.pax || "",
                                              dotb: it.dotb
                                                ? it.dotb.split("T")[0]
                                                : "",
                                              agent: it.agent || "",
                                            });

                                            setShowModal(true);
                                          }}
                                        />
                                      </td>
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

                      {showModal && (
                        <div className="modal fade show d-block" tabIndex="-1">
                          <div
                            className="modal-dialog modal-dialog-centered"
                            ref={modalRef}
                          >
                            <div className="modal-content custom-color">
                              <div className="modal-header">
                                <h5 className="modal-title text-light">
                                  Edit Sale
                                </h5>

                                <button
                                  type="button"
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
                                    type="search"
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

                                  {showSectorList && (
                                    <ul
                                      ref={dropdownRef}
                                      className="list-group position-absolute w-100 list-group-custom1"
                                      style={{
                                        zIndex: 1055,
                                        maxHeight: "250px",
                                        overflowY: "auto",
                                      }}
                                    >
                                      {editSectorOptions
                                        .filter((s) =>
                                          s.sector
                                            .toLowerCase()
                                            .includes(
                                              (
                                                editData.sector || ""
                                              ).toLowerCase()
                                            )
                                        )
                                        .map((sectorItem) => (
                                          <li
                                            key={sectorItem.id}
                                            className="list-group-item list-group-item-action text-dark px-3"
                                            style={{
                                              cursor: "pointer",
                                              backgroundColor: "white",
                                            }}
                                            onClick={() => {
                                              setEditData((prev) => ({
                                                ...prev,
                                                sector: sectorItem.sector,
                                              }));
                                              setShowSectorList(false);
                                            }}
                                          >
                                            {sectorItem.sector}
                                          </li>
                                        ))}

                                      {editSectorOptions.length === 0 && (
                                        <li className="list-group-item text-muted">
                                          No sector found
                                        </li>
                                      )}
                                    </ul>
                                  )}
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
                                  <label className="form-label text-light">
                                    DOTB
                                  </label>
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

                                <div className="mb-2 position-relative">
                                  <label className="form-label text-light">
                                    Agent Name
                                  </label>

                                  <input
                                    ref={agentInputRef}
                                    type="search"
                                    className="form-control"
                                    placeholder="Select Agent"
                                    name="agent"
                                    value={editData.agent || ""}
                                    onChange={(e) =>
                                      setEditData({
                                        ...editData,
                                        agent: e.target.value,
                                      })
                                    }
                                    onFocus={() => setShowAgentList(true)}
                                    autoComplete="off"
                                  />

                                  {showAgentList && (
                                    <ul
                                      ref={agentDropdownRef}
                                      className="list-group position-absolute w-100 list-group-custom"
                                      style={{
                                        zIndex: 1055,
                                        maxHeight: "250px",
                                        overflowY: "auto",
                                      }}
                                    >
                                      {(agents || [])
                                        .filter((a) =>
                                          (a.agent_name || "")
                                            .toLowerCase()
                                            .includes(
                                              (
                                                editData.agent || ""
                                              ).toLowerCase()
                                            )
                                        )
                                        .map((agent) => (
                                          <li
                                            key={agent.id}
                                            className="list-group-item list-group-item-action text-dark px-3"
                                            style={{
                                              cursor: "pointer",
                                              backgroundColor: "white",
                                            }}
                                            onClick={() => {
                                              setEditData({
                                                ...editData,
                                                agent: agent.agent_name || "",
                                              });
                                              setShowAgentList(false);
                                            }}
                                          >
                                            {agent.agent_name ||
                                              "Unnamed Agent"}
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
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {groupedBySector.length === 0 && (
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

      <ToastContainer position="bottom-right" autoClose={1000} />
    </div>
  );
}

export default Sales;
