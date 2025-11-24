import React, { useEffect, useState } from "react";
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

  const [openIndex, setOpenIndex] = useState(null);
  const [staff, setStaff] = useState([]);
  const [showDate, setShowDate] = useState(false);

  const toggleDropdown = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  useEffect(() => {
    const allStaff = async () => {
      try {
        const response = await axios.get(`${API_URL}/allstocks`);
        const payload = response.data?.data ?? response.data;
        if (Array.isArray(payload)) setStaff(payload);
        else setStaff([]);
      } catch (error) {
        console.error("error fetching allstocks:", error);
        setStaff([]);
      }
    };

    allStaff();

    const interval = setInterval(allStaff, 100);

    return () => clearInterval(interval);
  }, [API_URL]);

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

          <button className="btn btn-light sector-link" type="submit">
            Submit
          </button>

          <Link className="btn btn-light sector-link" to="/admin/sales">
            Add Sales
          </Link>
        </form>
      </div>

      <div className="row p-3">
        {groupedByHeader.map((group, index) => {
          const first = group.items[0] ?? {};
          const pnr = first.pnr ?? "-";
          const fare = first.fare ?? "-";

          const headerText = `${group.sector} ${group.dot} ${group.airline} ${
            group.agent !== "-" ? group.agent : "-"
          }`;

          return (
            <div
              key={group.key ?? index}
              className="col-12 col-sm-6 col-md-6 col-lg-4 mb-3"
            >
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
            No stocks available.
          </div>
        )}
      </div>

      <ToastContainer position="bottom-right" autoClose={1000} />
    </div>
  );
}

export default StockManagement;
