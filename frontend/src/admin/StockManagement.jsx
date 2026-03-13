import { useEffect, useState, useMemo, useRef } from "react";
import { toast, ToastContainer } from "react-toastify";
import { useParams } from "react-router-dom";
import axios from "axios";
import "../App.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faTrash } from "@fortawesome/free-solid-svg-icons";

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
    flightno: "",
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
          flightno: "",
          pnr: "",
        });

        fetchData();
      } else {
        toast.error(response.data.message || "Something went wrong");
      }
    } catch (err) {
      console.error("Error:", err);
      toast.error("Server connection failed.");
    }
  };

  const { id } = useParams();
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
    const handleClickOutside = (event) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target) &&
        monthPillRef.current &&
        !monthPillRef.current.contains(event.target)
      ) {
        setMonth(false);
        setPopoverStyle(null);
      }
    };

    if (month) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [month]);

  useEffect(() => {
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

    const updateMonth = () => {
      const now = new Date();
      setMonths(monthNames[now.getMonth()]);
    };

    updateMonth();

    const now = new Date();
    const msUntilMidnight =
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now;

    const timeout = setTimeout(() => {
      updateMonth();
    }, msUntilMidnight);

    return () => clearTimeout(timeout);
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

    if (selectedFilter === "custom") {
      if (!customFrom || !customTo) return;

      const range = getRangeForFilter(
        "custom",
        new Date(),
        customFrom,
        customTo
      );
      if (!range) return;

      const { start, end } = range;

      setFilteredStocks(
        staff.filter((item) => {
          const d = parseToDateObj(item.dot);
          return d && d >= start && d <= end;
        })
      );

      setFilteredSales(
        sales.filter((item) => {
          const d = parseToDateObj(item.dotb || item.created_at);
          return d && d >= start && d <= end;
        })
      );

      return;
    }

    const range = getRangeForFilter(selectedFilter, new Date());
    if (!range) return;

    const { start, end } = range;

    setFilteredStocks(
      staff.filter((item) => {
        const d = parseToDateObj(item.dot);
        return d && d >= start && d <= end;
      })
    );

    setFilteredSales(
      sales.filter((item) => {
        const d = parseToDateObj(item.dotb || item.created_at);
        return d && d >= start && d <= end;
      })
    );
  }, [selectedFilter, staff, sales, customFrom, customTo]);

  const updatePopoverPosition = () => {
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

    const estimatedHeight = 260;
    if (top + estimatedHeight > window.innerHeight) {
      top = rect.top - estimatedHeight - gap;
    }

    setPopoverStyle({
      top: `${top}px`,
      left: `${left}px`,
    });
  };

  function toggleMonthPopover() {
    if (month) {
      setMonth(false);
      return;
    }

    updatePopoverPosition();
    setMonth(true);
  }

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedFilter]);

  useEffect(() => {
    if (!month) return;

    const handleUpdate = () => updatePopoverPosition();

    window.addEventListener("resize", handleUpdate);
    window.addEventListener("scroll", handleUpdate, true);
    window.addEventListener("orientationchange", handleUpdate);

    return () => {
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("scroll", handleUpdate, true);
      window.removeEventListener("orientationchange", handleUpdate);
    };
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

  const fetchData = async () => {
    try {
      const [stocksResponse, salesResponse] = await Promise.all([
        axios.get(`${API_URL}/allstocks`),
        axios.get(`${API_URL}/allsales`),
      ]);

      setStaff(stocksResponse.data?.data || []);
      setSales(salesResponse.data?.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
      const key = sector;

      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });

    return Array.from(map.entries()).map(([sector, items]) => ({
      key: sector,
      sector,
      flightno: items[0]?.flightno ?? "-",
      items,
    }));
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
      toast.error("Please select an excel file first!");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post(`${API_URL}/upload-stock`, formData);

      if (res.status === 200) {
        toast.success(res.data.message || "File uploaded successfully!");

        setShowModal(false);
        setFile(null);

        fetchData();
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

  const deleteStock = async (id) => {
    if (!id) return;

    try {
      await axios.delete(`${API_URL}/deletestockdata/${id}`);
      await fetchData();
      setOpenIndex(null);
      toast.success("Stock deleted");
    } catch (err) {
      console.error(err);
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

  const formatToInputDate = (value) => {
    if (!value) return "";
    const [dd, mm, yyyy] = value.split("-");
    return `${yyyy}-${mm}-${dd}`;
  };

  const [showModal1, setShowModal1] = useState(false);
  const [editData, setEditData] = useState({
    id: "",
    sector: "",
    pax: "",
    dot: "",
    fare: "",
    airline: "",
    flightno: "",
    pnr: "",
  });

  useEffect(() => {
    if (!id) return;
    somestocks();
  }, [id]);

  const somestocks = async () => {
    try {
      const response = await axios.get(`${API_URL}/somestocksdata/${id}`);

      const data = response.data?.data;

      if (!data) return;

      setEditData({
        id: data.id || "",
        sector: data.sector || "",
        pax: data.pax || "",
        dot: formatToInputDate(data.dot),
        fare: data.fare || "",
        airline: data.airline || "",
        flightno: data.flightno || "",
        pnr: data.pnr || "",
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async () => {
    if (!editData.id) {
      toast.warn("No record selected to update.");
      return;
    }

    try {
      const response = await axios.put(
        `${API_URL}/updatestocks/${editData.id}`,
        {
          sector: editData.sector,
          pax: editData.pax,
          dot: editData.dot,
          fare: editData.fare,
          airline: editData.airline,
          flightno: editData.flightno,
          pnr: editData.pnr,
        }
      );

      setShowModal1(false);

      if (typeof fetchData === "function") {
        fetchData();
      }

      toast.success(response.data?.message || "Stock updated successfully!");
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

  const modalRef1 = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (modalRef1.current && !modalRef1.current.contains(event.target)) {
        setShowModal1(false);
      }
    }

    if (showModal1) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showModal1, setShowModal1]);

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

          <input
            type="search"
            className="form-control sector-link1"
            placeholder="Flight No"
            name="flightno"
            value={stock.flightno}
            onChange={handleChange}
            required
          />

          <button className="btn sector-link submit-btn" type="submit">
            Submit
          </button>

          <div className="add-bulk-wrapper">
            <button
              ref={addBulkBtnRef}
              type="button"
              className="btn btn-light sector-link sales-btn"
              onClick={() => setShowModal((prev) => !prev)}
              style={{ position: "relative" }}
            >
              Add Bulk
            </button>

            {showModal && (
              <div className="bulk-upload-box" ref={modalRef}>
                <h5 className="fw-bold">Upload Excel File</h5>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  required
                />
                <div style={{ marginTop: "10px" }}>
                  <button
                    type="submit"
                    className="btn btn-outline-primary btn-sm"
                    onClick={handleSubmited}
                  >
                    Submit
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm ms-2"
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
                  style={popoverStyle}
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
          const isExpired = group.items.some((it) => isDotExpired(it.dot));

          const totalSeats = group.items.reduce(
            (sum, item) => sum + (parseInt(item.pax, 10) || 0),
            0
          );

          const totalSold = group.items.reduce(
            (sum, item) => sum + (parseInt(item.sold, 10) || 0),
            0
          );
          const totalLeft = Math.max(0, totalSeats - totalSold);

          return (
            <div
              key={group.key}
              className="col-12 col-sm-6 col-md-6 col-lg-6 col-xl-4 col-xxl-4 mb-3"
            >
              <div className="card border-0 shadow-sm">
                <div
                  className="card-header size-text text-dark rounded-0 d-flex justify-content-between align-items-center turq-box"
                  style={{ cursor: "pointer" }}
                  onClick={() => toggleDropdown(index)}
                >
                  <div
                    className="item-color1"
                    style={{ wordBreak: "break-word" }}
                  >
                    {group.sector} | {group.flightno || "none"} |{" "}
                    <span
                      className={
                        isExpired
                          ? "text-danger fw-bold"
                          : "text-success fw-bold"
                      }
                    >
                      {totalLeft} {isExpired ? "Seats Unsold" : "Seats Left"}
                    </span>
                    {isExpired && (
                      <span
                        className="badge bg-danger ms-2"
                        style={{ fontSize: "0.75rem" }}
                      >
                        STOCK DOT EXPIRED
                      </span>
                    )}
                  </div>
                  |
                  <div className="d-flex ms-0 ps-0 d-flex gap-1 align-items-center justify-content-center">
                    <div className="d-flex align-items-center" title="Edit">
                      <FontAwesomeIcon
                        icon={faEdit}
                        className="ms-1 me-1 custom-color-delete custom-color-edit"
                        style={{ cursor: "pointer" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const item = group.items[0];
                          setEditData({
                            id: item.id,
                            sector: item.sector || "",
                            pax: item.pax || "",
                            dot: item.dot ? formatToInputDate(item.dot) : "",
                            fare: item.fare || "",
                            airline: item.airline || "",
                            pnr: item.pnr || "",
                            flightno: item.flightno || "",
                          });

                          setShowModal1(true);
                        }}
                      />
                    </div>

                    <div className="d-flex align-items-center" title="Delete">
                      <FontAwesomeIcon
                        icon={faTrash}
                        title="Delete"
                        className="custom-color-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            !window.confirm(
                              "Are you sure you want to delete this stock?"
                            )
                          )
                            return;
                          deleteStock(group.items[0].id);
                          toast.success("Stock deleted successfully");
                          setOpenIndex(null);
                        }}
                      />
                    </div>
                  </div>
                  <div className="turq-caret">
                    {openIndex === index ? "▴" : "▾"}
                  </div>
                </div>

                {openIndex === index && (
                  <div className="card-body p-2 controll-size">
                    {group.items.map((item, idx) => {
                      const left = Math.max(
                        0,
                        (parseInt(item.pax, 10) || 0) -
                          (parseInt(item.sold, 10) || 0)
                      );

                      return (
                        <div
                          key={item.id}
                          className="border border-success rounded mb-2 p-2"
                        >
                          <div className="d-flex justify-content-between flex-wrap">
                            <span className="text-danger fw-bold text-start">
                              PNR: {item.pnr ?? "-"}
                            </span>
                            <span className="text-danger fw-bold text-center">
                              COST: {item.fare ? `${item.fare}/-` : "-"}
                            </span>

                            <span className="text-danger text-end">
                              <span className="fw-bold">SUPPLIER:</span> AL HAMD
                            </span>
                          </div>

                          <div className="border-bottom mt-2 mb-1"></div>

                          <div className="d-flex justify-content-between mt-1">
                            <span className="text-start">
                              <strong>Date:</strong> {formatDot(item.dot)}
                            </span>
                            <span className="text-end">
                              <strong>Airline:</strong> {item.airline}
                            </span>
                          </div>
                          <div className="border-bottom mt-2 mb-1"></div>

                          <div className="d-flex justify-content-between mt-1">
                            <span className="text-success fw-bold text-start">
                              Total Seats: {item.pax ?? 0}
                            </span>
                            <span className="text-success fw-bold text-center">
                              Sold: {item.sold ?? 0}
                            </span>
                            <span className="text-danger fw-bold text-end">
                              Left: {left}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    <div className="table-responsive mt-2">
                      <table className="table table-bordered table-striped table-sm text-center mb-0">
                        <thead className="table-light">
                          <tr>
                            <th style={{ width: "15%" }}>SL.NO</th>
                            <th style={{ width: "30%" }}>PAX NAME</th>
                            <th style={{ width: "30%" }}>DATE</th>
                            <th style={{ width: "25%" }}>AGENT</th>
                            <th style={{ width: "25%" }}>ACTION</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const matchingSales = salesToUse.filter(
                              (sale) =>
                                sale.sector?.trim() === group.sector?.trim()
                            );

                            if (matchingSales.length === 0) {
                              return (
                                <tr>
                                  <td colSpan="5" className="text-danger">
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

                            const goToPage = (p) =>
                              setSalesPageState((prev) => ({
                                ...prev,
                                [group.key]: p,
                              }));

                            return (
                              <>
                                {paginatedSales.map((sale, idx) => (
                                  <tr key={sale.id ?? idx}>
                                    <td>{start + idx + 1}</td>
                                    <td>{sale.pax ?? "-"}</td>
                                    <td style={{ whiteSpace: "nowrap" }}>
                                      {formatDot(sale.dotb ?? sale.dot)}
                                    </td>
                                    <td>{sale.agent ?? "-"}</td>
                                    <td title="Delete">
                                      <FontAwesomeIcon
                                        icon={faTrash}
                                        title="Delete"
                                        className="ms-2 custom-color-delete"
                                        style={{ cursor: "pointer" }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deletedata1(sale.id);
                                        }}
                                      />
                                    </td>
                                  </tr>
                                ))}

                                {matchingSales.length > salesPerPage && (
                                  <tr>
                                    <td colSpan="5" className="text-center p-2">
                                      <button
                                        className="btn btn-sm btn-success mx-1"
                                        disabled={salesPage === 1}
                                        onClick={() =>
                                          goToPage(Math.max(1, salesPage - 1))
                                        }
                                      >
                                        Prev
                                      </button>

                                      <span className="small mx-2">
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

        {showModal1 && (
          <div className="modal fade show d-block" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered" ref={modalRef1}>
              <div className="modal-content custom-color">
                <div className="modal-header">
                  <h5 className="modal-title text-light">Edit Stock</h5>

                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setShowModal1(false)}
                  ></button>
                </div>

                <div className="modal-body">
                  <div className="mb-2">
                    <label className="form-label text-light">Sector Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Sector Name"
                      name="sector"
                      value={editData.sector}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          sector: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="mb-2">
                    <label className="form-label text-light">PAXQ</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="PAXQ"
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
                    <label className="form-label text-light">Fare</label>
                    <input
                      type="text"
                      placeholder="Fare"
                      className="form-control"
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
                    <label className="form-label text-light">Airline</label>
                    <input
                      type="text"
                      placeholder="Airline"
                      className="form-control"
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
                    <label className="form-label text-light">PNR</label>
                    <input
                      type="text"
                      placeholder="PNR"
                      className="form-control"
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

                  <div className="mb-2">
                    <label className="form-label text-light">Flight No</label>
                    <input
                      type="text"
                      placeholder="Flight No"
                      className="form-control"
                      name="flightno"
                      value={editData.flightno}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          flightno: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowModal1(false)}
                  >
                    Cancel
                  </button>
                  <button className="btn btn-success" onClick={handleUpdate}>
                    Update
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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

      <ToastContainer position="bottom-right" autoClose={1500} />
    </div>
  );
}

export default StockManagement;
