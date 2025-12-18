import { useEffect, useState, useMemo, useRef } from "react";
import { toast, ToastContainer } from "react-toastify";
import axios from "axios";
import "../App.css";

function startOfWeek(d) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = x.getDate() - day + (day === 0 ? -6 : 1);
  x.setDate(diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfWeek(d) {
  const x = startOfWeek(d);
  x.setDate(x.getDate() + 6);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfMonth(d) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfMonth(d) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + 1, 0);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfYear(d) {
  const x = new Date(d);
  x.setMonth(0, 0);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfYear(d) {
  const x = new Date(d);
  x.setMonth(11, 31);
  x.setHours(23, 59, 59, 999);
  return x;
}

function getRangeForFilter(filter, now = new Date(), customFrom, customTo) {
  switch (filter) {
    case "weekly":
      return {
        start: startOfWeek(now),
        end: endOfWeek(now),
      };

    case "monthly":
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
      };

    case "halfYearly":
      return {
        start: startOfMonth(new Date(now.getFullYear(), now.getMonth() - 5, 1)),
        end: endOfMonth(now),
      };

    case "yearly":
      return {
        start: startOfYear(now),
        end: endOfYear(now),
      };

    case "custom": {
      if (!customFrom || !customTo) return null;
      const s = startOfDay(new Date(customFrom));
      const e = endOfDay(new Date(customTo));
      if (isNaN(s) || isNaN(e) || s > e) return null;
      return { start: s, end: e };
    }

    default:
      return null;
  }
}

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
  const itemsPerPage = 42;
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

  const [months, setMonths] = useState("");
  const monthPillRef = useRef(null);
  const popoverRef = useRef(null);
  const [month, setMonth] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState(null);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [selectedFilter, setSelectedFilter] = useState(null);
  const [filteredStocks, setFilteredStocks] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const stocksToUse = selectedFilter ? filteredStocks : staff;
  const salesToUse = selectedFilter ? filteredSales : sales;

  useEffect(() => {
    const updateMonth = () => {
      const now = new Date();
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      setMonths(monthNames[now.getMonth()]);
    };

    updateMonth();
    const interval = setInterval(updateMonth, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  function applyPresetFilter(filterName) {
    setSelectedFilter(filterName);
    setMonth(false);
  }

  useEffect(() => {
    if (!selectedFilter) {
      setFilteredStocks(staff);
      setFilteredSales(sales);
      return;
    }

    if (selectedFilter !== "custom") {
      const range = getRangeForFilter(selectedFilter, new Date());
      if (!range) return;

      const { start, end } = range;

      const filterStocksByDot = (list) =>
        list.filter((item) => {
          const d = parseToDateObj(item.dot);
          return d && d >= start && d <= end;
        });

      const filterSalesByDate = (list) =>
        list.filter((item) => {
          const d = parseToDateObj(item.dotb || item.created_at);
          return d && d >= start && d <= end;
        });

      setFilteredStocks(filterStocksByDot(staff));
      setFilteredSales(filterSalesByDate(sales));
    }
  }, [selectedFilter, staff, sales]);

  function toggleMonthPopover() {
    if (month) {
      setMonth(false);
      return;
    }

    const pill = monthPillRef.current;
    if (!pill) return;

    const rect = pill.getBoundingClientRect();
    const cardWidth = 220;
    const gap = 8;
    const margin = 8;

    let top = rect.bottom + gap;
    let left = rect.left + rect.width / 2 - cardWidth / 2;

    if (left < margin) left = margin;
    if (left + cardWidth > window.innerWidth - margin) {
      left = window.innerWidth - cardWidth - margin;
    }

    setPopoverStyle({
      top: `${top}px`,
      left: `${left}px`,
    });

    setMonth(true);
  }

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedFilter]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (monthPillRef.current?.contains(e.target)) return;
      if (popoverRef.current?.contains(e.target)) return;
      setMonth(false);
    }

    if (month) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [month]);

  function applyCustomRange() {
    if (!customFrom || !customTo) {
      alert("Please pick both dates");
      return;
    }

    const range = getRangeForFilter("custom", new Date(), customFrom, customTo);
    if (!range) return;

    const { start, end } = range;

    const filterStocksByDot = (list) =>
      list.filter((item) => {
        const d = parseToDateObj(item.dot);
        return d && d >= start && d <= end;
      });

    const filterSalesByDate = (list) =>
      list.filter((item) => {
        const d = parseToDateObj(item.dotb || item.created_at);
        return d && d >= start && d <= end;
      });

    setFilteredStocks(filterStocksByDot(staff));
    setFilteredSales(filterSalesByDate(sales));

    setSelectedFilter("custom");
    setMonth(false);
  }

  const toggleDropdown = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        const [stocksResponse, salesResponse] = await Promise.all([
          axios.get(`${API_URL}/allstocks`, { signal: controller.signal }),
          axios.get(`${API_URL}/allsales`, { signal: controller.signal }),
        ]);

        setStaff(stocksResponse.data?.data || []);
        setSales(salesResponse.data?.data || []);
      } catch (e) {
        if (!axios.isCancel(e)) {
          console.error(e);
        }
      }
    };

    fetchData();

    const intervalId = setInterval(fetchData, 1000);

    return () => {
      clearInterval(intervalId);
      controller.abort();
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
        const [y, m, d] = s.split(/[-T ]/).map(Number);
        if (m > 12) return new Date(y, d - 1, m);
        return new Date(y, m - 1, d);
      }

      const sepMatch = s.match(/^(\d{1,4})[\/\-.](\d{1,2})[\/\-.](\d{1,4})$/);
      if (sepMatch) {
        let [, p1, p2, p3] = sepMatch.map(Number);

        let day, month, year;

        if (p1 > 31) {
          year = p1;
          if (p2 > 12) {
            day = p2;
            month = p3;
          } else {
            month = p2;
            day = p3;
          }
        } else if (p3 > 31) {
          year = p3 < 100 ? (p3 < 70 ? 2000 + p3 : 1900 + p3) : p3;
          if (p1 > 12) {
            day = p1;
            month = p2;
          } else {
            day = p2;
            month = p1;
          }
        } else {
          day = p1;
          month = p2;
          year = p3 < 100 ? (p3 < 70 ? 2000 + p3 : 1900 + p3) : p3;
        }

        const dateObj = new Date(year, month - 1, day);
        if (!isNaN(dateObj.getTime())) return dateObj;
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

    (Array.isArray(stocksToUse) ? stocksToUse : []).forEach((item) => {
      const sector = (item.sector ?? "").trim();
      const dot = (item.dot ?? "").trim();
      const airline = (item.airline ?? "").trim();
      const agent = (item.agent ?? "-").trim() || "-";

      const key = `${sector}||${dot}||${airline}||${agent}`;

      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });

    return Array.from(map.entries()).map(([key, items]) => {
      const [sector, dot, airline, agent] = key.split("||");
      return { key, sector, dot, airline, agent, items };
    });
  }, [stocksToUse]);

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
  }, [filteredGroups, filteredSales]);

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

  const addBulkBtnRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (addBulkBtnRef.current?.contains(event.target)) return;

      if (modalRef.current?.contains(event.target)) return;

      setShowModal(false);
    };

    if (showModal) {
      document.addEventListener("mousedown", handleClickOutside);
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
            <button
              ref={addBulkBtnRef}
              type="button"
              className="btn btn-light sector-link sales-btn"
              onClick={() => setShowModal((prev) => !prev)}
            >
              Add Bulk
            </button>

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

          <div className="text-dark">
            <div className="month-pill-wrapper">
              <div
                ref={monthPillRef}
                className="month-pill"
                onClick={toggleMonthPopover}
              >
                {months}
              </div>

              {month && (
                <div
                  ref={popoverRef}
                  className="spending-card mt-2 me-2 text-start"
                  aria-modal="true"
                  role="dialog"
                >
                  <h5 className="title fw-bold text-dark text-start">
                    Show Date
                  </h5>

                  <div
                    className="spending-form"
                    onSubmit={(e) => e.preventDefault()}
                  >
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="performance"
                        id="monthly"
                        value="monthly"
                        checked={selectedFilter === "monthly"}
                        onChange={() => applyPresetFilter("monthly")}
                      />
                      <label className="form-check-label" htmlFor="monthly">
                        Monthly
                      </label>
                    </div>

                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="performance"
                        id="halfYearly"
                        value="halfYearly"
                        checked={selectedFilter === "halfYearly"}
                        onChange={() => applyPresetFilter("halfYearly")}
                      />
                      <label className="form-check-label" htmlFor="halfYearly">
                        Half-yearly
                      </label>
                    </div>

                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="performance"
                        id="yearly"
                        value="yearly"
                        checked={selectedFilter === "yearly"}
                        onChange={() => applyPresetFilter("yearly")}
                      />
                      <label className="form-check-label" htmlFor="yearly">
                        Yearly
                      </label>
                    </div>

                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="performance"
                        id="custom"
                        value="custom"
                        checked={selectedFilter === "custom"}
                        onChange={() => {
                          setSelectedFilter("custom");
                        }}
                      />
                      <label className="form-check-label" htmlFor="custom">
                        Custom range
                      </label>
                    </div>

                    {selectedFilter === "custom" && (
                      <div
                        className="custom-range-row"
                        style={{ marginTop: 8 }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                            alignItems: "start",
                          }}
                        >
                          <label className="text-dark">From</label>
                          <input
                            type="date"
                            value={customFrom}
                            onChange={(e) => setCustomFrom(e.target.value)}
                            className="form-control"
                            aria-label="From date"
                          />
                          <label className="text-dark">To</label>
                          <input
                            type="date"
                            value={customTo}
                            onChange={(e) => setCustomTo(e.target.value)}
                            className="form-control"
                            aria-label="To date"
                          />
                        </div>

                        <div className="mt-3">
                          <button
                            type="button"
                            className="btn btn-primary apply-btn"
                            onClick={applyCustomRange}
                          >
                            Apply
                          </button>

                          <button
                            type="button"
                            className="btn btn-secondary mt-0 ms-2"
                            onClick={() => {
                              setMonth(false);
                              setPopoverStyle(null);
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {selectedFilter !== "custom" && (
                      <div
                        className="d-flex justify-content-end"
                        style={{ marginTop: 12 }}
                      >
                        <button
                          type="button"
                          className="cancel-btn ms-2"
                          onClick={() => {
                            setMonth(false);
                            setPopoverStyle(null);
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
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
                <div
                  className="card-header size-text text-dark rounded-0 d-flex justify-content-between align-items-center turq-box"
                  style={{ cursor: "pointer" }}
                  onClick={() => toggleDropdown(index)}
                >
                  <div
                    className="item-color1"
                    style={{ wordBreak: "break-word", cursor: "pointer" }}
                  >
                    {group.sector}
                    {group.agent !== "-" ? group.agent : " - "}{" "}
                    {(() => {
                      const seatsLeftRaw = group.items.reduce(
                        (sum, item) =>
                          sum +
                          ((parseInt(item.pax, 10) || 0) -
                            (parseInt(item.sold, 10) || 0)),
                        0
                      );

                      const seatsLeft = Math.max(0, seatsLeftRaw);

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

                  <div className="turq-caret" role="button">
                    {openIndex === index ? "▴" : "▾"}
                  </div>
                </div>

                {openIndex === index && (
                  <div className="card-body p-0 controll-size">
                    <div className="d-flex justify-content-between align-items-center mb-0 px-2 py-2 flex-wrap">
                      <span className="text-danger me-2">
                        <strong>PNR:</strong> {pnr}
                      </span>
                      <span className="text-danger">
                        <strong>COST:</strong>{" "}
                        {fare !== "-" ? `${fare}/-` : "-"}
                      </span>
                    </div>

                    <div className="d-flex justify-content-between gap-1 ms-2 me-2 mt-0 mb-2">
                      <div>
                        <span className="fw-bolder">Date:</span> {formattedDot}
                      </div>

                      <div className="text-end">
                        <span className="fw-bolder">Airline:</span>{" "}
                        {group.airline}{" "}
                      </div>
                    </div>

                    <div className="d-flex flex-row justify-content-between gap-3 align-items-center mt-0 mb-2">
                      <span className="text-success1 fw-bold px-2">
                        Total Seats:{" "}
                        <strong>
                          {group.items.reduce(
                            (sum, item) => sum + (parseInt(item.pax, 10) || 0),
                            0
                          )}
                        </strong>
                      </span>

                      <span className="text-success fw-bold text-center">
                        Seats Sold:{" "}
                        <strong>
                          {group.items.reduce(
                            (sum, item) => sum + (parseInt(item.sold, 10) || 0),
                            0
                          )}
                        </strong>
                      </span>

                      <span className="text-danger fw-bold pe-1 text-end">
                        Seats Left:{" "}
                        <strong className="text-danger">
                          {Math.max(
                            0,
                            group.items.reduce(
                              (sum, item) =>
                                sum +
                                ((parseInt(item.pax, 10) || 0) -
                                  (parseInt(item.sold, 10) || 0)),
                              0
                            )
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
                            const matchingSales = salesToUse.filter(
                              (sale) =>
                                sale.sector?.trim() === group.sector?.trim() &&
                                sale.dot?.trim() === group.dot?.trim() &&
                                sale.airline?.trim() === group.airline?.trim()
                            );

                            if (matchingSales.length === 0) {
                              return (
                                <tr>
                                  <td colSpan="4" className="text-danger">
                                    No sales available.
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
