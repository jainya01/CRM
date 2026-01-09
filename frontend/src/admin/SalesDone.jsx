import { useEffect, useState } from "react";
import axios from "axios";
import ExcelJS from "exceljs";

function SalesDone() {
  const API_URL = import.meta.env.VITE_API_URL;

  const [user, setUser] = useState([]);
  const itemsPerPage = 21;
  const [currentPage, setCurrentPage] = useState(1);

  const [search, setSearch] = useState({
    pnr: "",
    dot: "",
  });

  const [filteredData, setFilteredData] = useState([]);
  const [showDate1, setShowDate1] = useState(false);

  useEffect(() => {
    const allData = async () => {
      try {
        const response = await axios.get(`${API_URL}/allsalesdone`);
        setUser(response.data.data);
        setFilteredData(response.data.data);
      } catch (error) {
        console.error("error", error);
      }
    };
    allData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setSearch((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSearch = (e) => {
    e.preventDefault();

    let filtered = user;

    if (search.pnr) {
      filtered = filtered.filter((item) =>
        item.pnr?.toLowerCase().includes(search.pnr.toLowerCase())
      );
    }

    if (search.dot) {
      filtered = filtered.filter((item) => {
        const [dd, mm, yyyy] = item.dot.split("-");
        const formattedDot = `${yyyy}-${mm}-${dd}`;
        return formattedDot === search.dot;
      });
    }

    setFilteredData(filtered);
    setCurrentPage(1);
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = Array.isArray(filteredData)
    ? filteredData.slice(startIndex, endIndex)
    : [];

  const handleDownload = async () => {
    if (!paginatedData || paginatedData.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("EditSales");

    worksheet.addRow([
      "ID",
      "SECTOR",
      "PAX",
      "DOT",
      "DOTB",
      "AIRLINE",
      "AGENT",
      "FARE",
      "PNR",
    ]);

    paginatedData.forEach((item) => {
      worksheet.addRow([
        item.id,
        item.sector || "-",
        item.pax || "-",
        item.dot || "-",
        item.dotb || "-",
        item.airline || "-",
        item.agent || "-",
        item.fare || "-",
        item.pnr || "-",
      ]);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(blob, "Sales Done.xlsx");
  };

  return (
    <div className="content-wrapper">
      <div className="d-flex flex-wrap justify-content-between px-lg-4 px-0 mb-0 text-center gap-3 px-1 m-0 py-3 mt-0 header-color">
        <form
          className="d-flex flex-row gap-2 flex-wrap ms-2 ms-lg-0"
          onSubmit={handleSearch}
        >
          <input
            type="search"
            className="form-control sector-link1"
            placeholder="Search By PNR"
            name="pnr"
            value={search.pnr}
            onChange={handleChange}
          />

          <input
            type={showDate1 ? "date" : "text"}
            className="form-control sector-link1"
            placeholder="Search by DATE"
            name="dot"
            value={search.dot}
            onFocus={() => setShowDate1(true)}
            onBlur={(e) => {
              if (!e.target.value) setShowDate1(false);
            }}
            onChange={handleChange}
          />

          <button
            className="btn btn-light sector-link submit-btn"
            type="submit"
          >
            Search
          </button>
        </form>
      </div>

      <div className="container-fluid px-lg-1 px-xl-4 px-xxl-4 px-2">
        <div className="row mt-3">
          <div className="col-lg-12 col-md-12 col-12 mt-3 mt-lg-0">
            <h5 className="fw-bold">Sales Done</h5>
            <table className="table table-bordered table-striped table-sm text-center mb-0">
              <thead className="table-light">
                <tr>
                  <th>ID</th>
                  <th>Sector</th>
                  <th>PAX</th>
                  <th>Date</th>
                  <th>AIRLINE</th>
                  <th>PNR</th>
                </tr>
              </thead>

              <tbody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((data, index) => (
                    <tr key={data.id ?? index}>
                      <td>{startIndex + index + 1}</td>
                      <td>{data.sector || "-"}</td>
                      <td>{data.pax || "-"}</td>
                      <td>{data.dot || "-"}</td>
                      <td>{data.airline || "-"}</td>
                      <td>{data.pnr || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center text-danger fw-bold">
                      No records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="d-flex flex-row justify-content-center gap-3 mb-3">
              {filteredData.length > itemsPerPage && (
                <div className="d-flex justify-content-center mt-2 gap-2">
                  <button
                    className="btn btn-sm btn-success pagination-button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => prev - 1)}
                  >
                    Prev
                  </button>

                  <span className="align-self-center">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    className="btn btn-sm btn-success pagination-button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                  >
                    Next
                  </button>
                </div>
              )}

              {filteredData.length > 0 && (
                <div>
                  <button
                    className="btn btn-success mt-1 pagination-button"
                    onClick={handleDownload}
                  >
                    Download
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SalesDone;
