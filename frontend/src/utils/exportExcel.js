import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const AIRLINE_TEMPLATE_MAP = {
  INDIGO: "Indigo.xlsx",
  OMAN: "Oman.xlsx",
  "OMAN AIR": "Oman.xlsx",
  SAUDIA: "Saudia.xlsx",
  "SAUDIA AIRLINES": "Saudia_Airlines.xlsx",
  "AIR INDIA EXP": "Air_india_Exp.xlsx",
  "AIR INDIA": "Air_India.xlsx",
  "AKASA AIR": "Akasa_Air.xlsx",
  "AIR ARABIA": "Air_Arabia.xlsx",
  FLYNAS: "Flynas.xlsx",
  "SALAM AIR": "Salam_Air.xlsx",
};

export const exportAirlineExcel = async (data, airlineName) => {
  try {
    const normalizeAirline = (name = "") =>
      name.toUpperCase().replace(/\s+/g, " ").trim();

    const input = normalizeAirline(airlineName);
    let templateKey = null;

    if (input === "SAUDIA AIRLINES") {
      templateKey = "SAUDIA AIRLINES";
    } else if (input === "SAUDIA") {
      templateKey = "SAUDIA";
    } else {
      templateKey = Object.keys(AIRLINE_TEMPLATE_MAP).find(
        (key) => normalizeAirline(key) === input
      );
    }

    if (!templateKey) {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet1");

      const headers = ["Title", "First Name", "Last Name", "DOB", "Gender"];
      worksheet.addRow(headers);
      headers.forEach((_, i) => {
        worksheet.getColumn(i + 1).width = 20;
        worksheet.getRow(1).getCell(i + 1).font = { bold: true };
        worksheet.getRow(1).getCell(i + 1).alignment = { horizontal: "center" };
      });

      data.forEach((item) => {
        const pax = (item.pax || "").trim();
        const paxParts = pax.split(/\s+/);
        const firstName = paxParts[0] || pax;
        const lastName = paxParts.slice(1).join(" ") || pax;
        const gender =
          item.gender?.toLowerCase() === "female" ? "FEMALE" : "MALE";
        const title = gender === "FEMALE" ? "Ms" : "Mr";
        const dob = item.dob || "01/01/1990";

        worksheet.addRow([title, firstName, lastName, dob, gender]);
      });

      worksheet.eachRow((row) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });
      });

      const fileName = `${airlineName.replace(/\s+/g, "_")}.xlsx`;
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        fileName
      );

      return;
    }

    const normalizedInput = normalizeAirline(airlineName);

    if (!templateKey && normalizedInput.includes("SAUDIA")) {
      templateKey = "SAUDIA";
    }

    if (!templateKey) {
      alert("Airline template not found");
      return;
    }

    const fileName = AIRLINE_TEMPLATE_MAP[templateKey];
    const response = await fetch(`/excel-templates/${fileName}`);
    if (!response.ok) throw new Error("Template fetch failed");
    const arrayBuffer = await response.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    const worksheet = workbook.worksheets[0];

    if (!templateKey) {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet1");

      const headers = ["Title", "First Name", "Last Name", "DOB", "Gender"];
      worksheet.addRow(headers);

      headers.forEach((_, i) => {
        worksheet.getColumn(i + 1).width = 20;
        worksheet.getRow(1).getCell(i + 1).font = { bold: true };
        worksheet.getRow(1).getCell(i + 1).alignment = { horizontal: "center" };
      });

      data.forEach((item) => {
        const pax = (item.pax || "").trim();
        const paxParts = pax.split(/\s+/);
        const firstName = paxParts[0] || pax;
        const lastName = paxParts.slice(1).join(" ") || pax;
        const gender =
          item.gender?.toLowerCase() === "female" ? "FEMALE" : "MALE";
        const title = gender === "FEMALE" ? "Ms" : "Mr";
        const dob = item.dob || "01/01/1990";

        worksheet.addRow([title, firstName, lastName, dob, gender]);
      });

      worksheet.eachRow((row) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });
      });

      const fileName = `${airlineName.replace(/\s+/g, "_")}.xlsx`;
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        fileName
      );

      return;
    }

    if (templateKey === "INDIGO") {
      const formatDate = () => "01/01/1990";

      const DATA_START_ROW = 2;
      const templateRow = worksheet.getRow(DATA_START_ROW);

      data.forEach((item, index) => {
        const rowNumber = DATA_START_ROW + index;
        const row =
          index === 0 ? templateRow : worksheet.insertRow(rowNumber, []);

        row.height = templateRow.height || 22;

        templateRow.eachCell({ includeEmpty: true }, (cell, col) => {
          const newCell = row.getCell(col);

          newCell.value = "";

          if (cell.font) newCell.font = { ...cell.font };
          if (cell.alignment) newCell.alignment = { ...cell.alignment };
          if (cell.fill) newCell.fill = { ...cell.fill };

          newCell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });

        const pax = (item.pax || "").trim();
        const paxParts = pax.split(" ");
        const firstName = paxParts[0] || pax;
        const lastName = paxParts.slice(1).join(" ") || pax;

        const gender =
          item.gender?.toLowerCase() === "female" ? "FEMALE" : "MALE";
        const title = gender === "FEMALE" ? "Ms" : "Mr";

        row.getCell("A").value = "Adult";
        row.getCell("B").value = title;
        row.getCell("C").value = firstName;
        row.getCell("D").value = lastName;
        row.getCell("E").value = formatDate();
        row.getCell("F").value = gender;

        row.commit();
      });

      ["A", "B", "C", "D", "E", "F"].forEach((c) => {
        worksheet.getColumn(c).width = 22;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        fileName
      );
    }

    if (templateKey === "SALAM AIR") {
      try {
        const DATA_START_ROW = 2;
        let currentRow = DATA_START_ROW;

        const headerRow = worksheet.getRow(1);

        const dummyDOB = new Date(1989, 11, 30);
        const dummyDOE = new Date(2029, 11, 30);
        const dummyPassport = "P1234567";

        data.forEach((item, index) => {
          const row = worksheet.insertRow(currentRow, []);

          headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
            const newCell = row.getCell(col);

            newCell.font = cell.font;
            newCell.alignment = cell.alignment;
            newCell.border = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" },
            };
          });

          const paxRaw = (item.pax || "").toUpperCase().trim();
          const cleanName = paxRaw.replace(/^(MR|MRS|MS|MISS)\s+/, "");
          const parts = cleanName.split(/\s+/).filter(Boolean);

          const firstName = parts[0] || "PAX";
          const lastName = parts[1] || firstName;

          const title = item.gender?.toLowerCase() === "female" ? "Mrs" : "Mr";

          row.getCell("A").value = index + 1;
          row.getCell("B").value = firstName;
          row.getCell("C").value = lastName;
          row.getCell("D").value = title;
          row.getCell("E").value = dummyPassport;

          row.getCell("F").value = dummyDOB;
          row.getCell("F").numFmt = "DD-MMM-YY";

          row.getCell("G").value = dummyDOE;
          row.getCell("G").numFmt = "DD-MMM-YY";

          row.getCell("H").value = item.originPnr || item.pnr || "";

          currentRow++;
        });

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(
          new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }),
          fileName || "Salam_Air.xlsx"
        );
      } catch (error) {
        console.error("SALAM AIR Excel generation failed:", error);
        alert("Salam Air file download failed.");
      }
    }

    if (templateKey === "FLYNAS") {
      try {
        const DATA_START_ROW = 2;
        const templateRow = worksheet.getRow(DATA_START_ROW);

        const dotDate = (val) =>
          typeof val === "string" && val.trim() ? val : ".";

        data.forEach((item, index) => {
          let row;

          if (index === 0) {
            row = templateRow;
          } else {
            row = worksheet.insertRow(DATA_START_ROW + index, [], "i+");

            templateRow.eachCell({ includeEmpty: true }, (cell, col) => {
              const newCell = row.getCell(col);
              newCell.font = cell.font;
              newCell.border = cell.border;
              newCell.alignment = cell.alignment;
              newCell.fill = cell.fill;
            });
          }

          const paxRaw = (item.pax || "").toUpperCase().trim();
          const cleanName = paxRaw.replace(/^(MR|MRS|MS|MISS)\s+/, "");
          const parts = cleanName.split(/\s+/).filter(Boolean);

          const firstName = parts[0] || "";
          const lastName =
            parts.length > 1 ? parts.slice(1).join(" ") : firstName;

          const isFemale = item.gender?.toLowerCase() === "female";
          const title = isFemale ? "Mrs" : "Mr";
          const gender = isFemale ? "Female" : "Male";

          row.getCell("A").value = item.pnr || "";
          row.getCell("B").value = "Adult";
          row.getCell("C").value = title;
          row.getCell("D").value = firstName;
          row.getCell("E").value = lastName;
          row.getCell("F").value = dotDate(item.dob);
          row.getCell("G").value = gender;
          row.getCell("H").value = "IN";
          row.getCell("I").value = "Passport no";
          row.getCell("J").value = item.passportNo || "";
          row.getCell("K").value = "INDIA";
          row.getCell("L").value = "IN";
          row.getCell("M").value = dotDate(item.passportIssueDate);
          row.getCell("N").value = dotDate(item.passportExpiryDate);
        });

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(
          new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }),
          fileName || "Flynas.xlsx"
        );
      } catch (error) {
        console.error("FLYNAS Excel generation failed:", error);
        alert("Flynas file download failed. Please try again.");
      }
    }

    if (templateKey === "AIR ARABIA") {
      const DATA_START_ROW = 2;
      const templateRow = worksheet.getRow(DATA_START_ROW);

      const dummyVisaNo = "VISA123456";
      const dummyVisaType = "TOURIST";
      const dummyVisaDate = "01-Jan-2026";

      data.forEach((item, index) => {
        let row;
        if (index === 0) {
          row = templateRow;
        } else {
          row = worksheet.insertRow(DATA_START_ROW + index, [], "i+");
          templateRow.eachCell({ includeEmpty: true }, (cell, col) => {
            const newCell = row.getCell(col);
            newCell.font = cell.font;
            newCell.border = cell.border;
            newCell.alignment = cell.alignment;
            newCell.fill = cell.fill;
          });
        }

        const paxRaw = (item.pax || "").toUpperCase().trim();
        const cleanName = paxRaw.replace(/^(MR|MRS|MS|MISS)\s+/, "");
        const parts = cleanName.split(/\s+/);

        let firstName = "";
        let lastName = "";

        if (parts.length === 1) {
          firstName = parts[0];
          lastName = "";
        } else {
          firstName = parts[0];
          lastName = parts.slice(1).join(" ");
        }

        const gender = item.gender?.toLowerCase() === "female" ? "MRS" : "MR";

        row.getCell("A").value = index + 1;
        row.getCell("B").value = item.pnr || "";
        row.getCell("C").value = item.dot || ".";
        row.getCell("D").value = gender;
        row.getCell("E").value = firstName;
        row.getCell("F").value = lastName || firstName;
        row.getCell("G").value = dummyVisaNo;
        row.getCell("G").font = { ...row.getCell("G").font, bold: true };

        row.getCell("H").value = dummyVisaType;
        row.getCell("H").font = { ...row.getCell("H").font, bold: true };

        row.getCell("I").value = dummyVisaDate;
        row.getCell("I").font = { ...row.getCell("I").font, bold: true };
      });

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        fileName
      );
    }

    if (templateKey === "AKASA AIR") {
      const formatDate = (value) => {
        if (!value) return "";
        const dt = new Date(value);
        if (!isNaN(dt)) {
          const day = String(dt.getDate()).padStart(2, "0");
          const month = dt.toLocaleString("en-US", { month: "short" });
          const year = dt.getFullYear();
          return `${day}-${month}-${year}`;
        }
        return value;
      };

      const DATA_START_ROW = 2;
      const templateRow = worksheet.getRow(DATA_START_ROW);

      const dummyDOB = "1990-01-01";

      data.forEach((item, index) => {
        let row;
        if (index === 0) {
          row = templateRow;
        } else {
          row = worksheet.insertRow(DATA_START_ROW + index, [], "i+");
          templateRow.eachCell({ includeEmpty: true }, (cell, col) => {
            const newCell = row.getCell(col);
            newCell.font = cell.font;
            newCell.border = cell.border;
            newCell.alignment = cell.alignment;
            newCell.fill = cell.fill;
          });
        }

        const paxRaw = (item.pax || "").toUpperCase().trim();
        const cleanName = paxRaw.replace(/^(MR|MRS|MS|MISS)\s+/, "");
        const parts = cleanName.split(/\s+/);

        let firstName = "";
        let lastName = "";

        if (parts.length === 1) {
          firstName = parts[0];
          lastName = parts[0];
        } else {
          firstName = parts[0];
          lastName = parts.slice(1).join(" ");
        }

        const gender =
          item.gender?.toLowerCase() === "female" ? "FEMALE" : "MALE";
        const title = gender === "FEMALE" ? "MRS" : "MR";

        let paxType = "ADT";
        if (item.ageCategory?.toUpperCase() === "CHILD") paxType = "CHD";
        if (item.ageCategory?.toUpperCase() === "INFANT") paxType = "INF";

        row.getCell("A").value = index + 1;
        row.getCell("B").value = title;
        row.getCell("C").value = firstName;
        row.getCell("D").value = lastName;
        row.getCell("E").value = paxType;

        row.getCell("F").value = formatDate(dummyDOB);
      });

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        fileName
      );
    }

    if (templateKey === "AIR INDIA") {
      const formatDate = (value) => {
        if (!value) return "";
        const dt = new Date(value);
        if (!isNaN(dt)) {
          const dd = String(dt.getDate()).padStart(2, "0");
          const mm = String(dt.getMonth() + 1).padStart(2, "0");
          const yyyy = dt.getFullYear();
          return `${dd}/${mm}/${yyyy}`;
        }
        return value;
      };

      const DATA_START_ROW = 2;
      const templateRow = worksheet.getRow(DATA_START_ROW);

      data.forEach((item, index) => {
        let row;
        if (index === 0) {
          row = templateRow;
        } else {
          row = worksheet.insertRow(DATA_START_ROW + index, [], "i+");
          templateRow.eachCell({ includeEmpty: true }, (cell, col) => {
            const newCell = row.getCell(col);
            newCell.font = cell.font;
            newCell.border = cell.border;
            newCell.alignment = cell.alignment;
            newCell.fill = cell.fill;
          });
        }

        const paxRaw = (item.pax || "").toUpperCase().trim();
        const cleanName = paxRaw.replace(/^(MR|MRS|MS|MISS)\s+/, "");
        const parts = cleanName.split(/\s+/);

        let firstName = "";
        let middleName = "";
        let lastName = "";

        if (parts.length === 1) {
          firstName = parts[0];
          lastName = parts[0];
        } else if (parts.length === 2) {
          firstName = parts[0];
          lastName = parts[1];
        } else if (parts.length > 2) {
          firstName = parts[0];
          middleName = parts.slice(1, parts.length - 1).join(" ");
          lastName = parts[parts.length - 1];
        }

        let gender = "MALE";
        if (
          item.gender?.toLowerCase() === "female" ||
          paxRaw.startsWith("MRS") ||
          paxRaw.startsWith("MS") ||
          paxRaw.startsWith("MISS")
        ) {
          gender = "FEMALE";
        }

        const title = gender === "FEMALE" ? "MRS" : "MR";

        row.getCell("A").value = "ADT";
        row.getCell("B").value = title;
        row.getCell("C").value = firstName;
        row.getCell("D").value = middleName;
        row.getCell("E").value = lastName;
        row.getCell("F").value = formatDate(item.dob || "1990-01-01");
        row.getCell("G").value = gender;
        row.getCell("H").value = item.ppt || "AB297345";
        row.getCell("I").value = formatDate(item.exp || "2030-12-31");

        row.commit();
      });

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        fileName
      );
    }

    if (templateKey === "AIR INDIA EXP") {
      const formatDate = (value) => {
        if (!value) return "";
        const dt = new Date(value);
        if (!isNaN(dt)) {
          const dd = String(dt.getDate()).padStart(2, "0");
          const mm = String(dt.getMonth() + 1).padStart(2, "0");
          const yyyy = dt.getFullYear();
          return `${dd}/${mm}/${yyyy}`;
        }
        return value;
      };

      const DATA_START_ROW = 2;

      const templateRow = worksheet.getRow(DATA_START_ROW);

      data.forEach((item, index) => {
        let row;
        if (index === 0) {
          row = templateRow;
        } else {
          row = worksheet.insertRow(DATA_START_ROW + index, [], "i+");
          templateRow.eachCell({ includeEmpty: true }, (cell, col) => {
            const newCell = row.getCell(col);
            newCell.font = cell.font;
            newCell.border = cell.border;
            newCell.alignment = cell.alignment;
            newCell.fill = cell.fill;
          });
        }

        const paxRaw = (item.pax || "").toUpperCase().trim();
        const cleanName = paxRaw.replace(/^(MR|MRS|MS|MISS)\s+/, "");
        const parts = cleanName.split(/\s+/);

        const firstName = parts[0] || "";
        const lastName =
          parts.length > 1 ? parts.slice(1).join(" ") : firstName;

        let gender = "MALE";
        if (
          item.gender?.toLowerCase() === "female" ||
          paxRaw.startsWith("MRS") ||
          paxRaw.startsWith("MS") ||
          paxRaw.startsWith("MISS")
        ) {
          gender = "FEMALE";
        }

        const title = gender === "FEMALE" ? "MRS" : "MR";

        row.getCell("A").value = "ADT";
        row.getCell("B").value = title;
        row.getCell("C").value = firstName;
        row.getCell("D").value = lastName;
        row.getCell("E").value = formatDate(item.dob || "1990-01-01");
        row.getCell("F").value = gender;
        row.getCell("G").value = item.mobile || "7007710154";
        row.getCell("H").value = item.country_code || "India-IN";
        row.getCell("I").value = item.ppt || "B7490046";
        row.getCell("J").value = formatDate(item.exp || "2030-12-31");

        row.commit();
      });

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        fileName
      );
    }

    if (templateKey === "SAUDIA AIRLINES") {
      const formatDate = (value) => {
        if (!value) return "";
        const dt = new Date(value);
        if (!isNaN(dt)) {
          const dd = String(dt.getDate()).padStart(2, "0");
          const mm = String(dt.getMonth() + 1).padStart(2, "0");
          const yyyy = dt.getFullYear();
          return `${dd}-${mm}-${yyyy}`;
        }
        return value;
      };

      const blackBorder = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };

      const DATA_START_ROW = 6;

      ["A", "B", "C", "D", "E", "F", "G", "H"].forEach((col) => {
        for (
          let r = DATA_START_ROW;
          r <= DATA_START_ROW + data.length + 10;
          r++
        ) {
          const cell = worksheet.getCell(`${col}${r}`);
          if (cell.isMerged) {
            worksheet.unMergeCells(cell._mergeRange);
          }
        }
      });

      data.forEach((item, index) => {
        const rowNumber = DATA_START_ROW + index;
        const row = worksheet.getRow(rowNumber);

        const sector =
          item.sector ||
          (item.origin && item.destination
            ? `${item.origin}-${item.destination}`
            : "");

        row.getCell("A").value = item.pax || "";
        row.getCell("B").value = item.ppt || "R1061380";
        row.getCell("C").value = formatDate(item.dob || "1990-01-01");
        row.getCell("D").value = formatDate(item.exp || "2030-12-31");
        row.getCell("E").value = item.pnr || "";
        row.getCell("F").value = sector;
        row.getCell("G").value = formatDate(
          item.dot || item.travel_date || item.date_of_travel
        );
        row.getCell("H").value = item.visa_type || "TOURIST";

        ["A", "B", "C", "D", "E", "F", "G", "H"].forEach((col) => {
          row.getCell(col).border = blackBorder;
        });

        row.commit();
      });

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        fileName
      );
    }

    if (templateKey === "SAUDIA") {
      const formatDate = (value) => {
        if (!value) return "";
        const dt = new Date(value);
        if (!isNaN(dt)) {
          const dd = String(dt.getDate()).padStart(2, "0");
          const mm = String(dt.getMonth() + 1).padStart(2, "0");
          const yyyy = dt.getFullYear();
          return `${dd}-${mm}-${yyyy}`;
        }
        return value;
      };

      const blackBorder = {
        top: { style: "thin", color: { argb: "FF000000" } },
        left: { style: "thin", color: { argb: "FF000000" } },
        bottom: { style: "thin", color: { argb: "FF000000" } },
        right: { style: "thin", color: { argb: "FF000000" } },
      };

      const firstItem = data[0] || {};
      const travelDate =
        firstItem.dot ||
        firstItem.travel_date ||
        firstItem.date_of_travel ||
        firstItem.dot_date;

      worksheet.getCell("D2").value = firstItem.pnr || "";

      const DATA_START_ROW = 3;
      const templateRow = worksheet.getRow(DATA_START_ROW);

      data.forEach((item, index) => {
        let row;

        if (index === 0) {
          row = templateRow;
        } else {
          row = worksheet.insertRow(DATA_START_ROW + index, [], "i+");

          templateRow.eachCell({ includeEmpty: true }, (cell, col) => {
            const newCell = row.getCell(col);
            newCell.font = cell.font;
            newCell.alignment = cell.alignment;
          });
        }

        row.getCell("A").value = index + 1;
        row.getCell("B").value = item.pax || "";
        row.getCell("C").value = item.ppt || "R1061380";
        row.getCell("D").value = item.dob || "01-01-1990";
        row.getCell("E").value = item.exp || "31-12-2030";
        row.getCell("F").value = formatDate(travelDate);

        ["A", "B", "C", "D", "E", "F"].forEach((col) => {
          row.getCell(col).border = blackBorder;
        });

        row.commit();
      });

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        fileName
      );
    }

    if (templateKey === "OMAN" || templateKey === "OMAN AIR") {
      const firstItem = data[0] || {};

      worksheet.getCell("D5").value = firstItem.pnr || "";

      const formatDOT = (value) => {
        if (!value) return "";
        if (/^\d{2}-\d{2}-\d{4}$/.test(value)) return value;
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          const [y, m, d] = value.split("-");
          return `${d}-${m}-${y}`;
        }
        const dt = new Date(value);
        if (!isNaN(dt)) {
          const dd = String(dt.getDate()).padStart(2, "0");
          const mm = String(dt.getMonth() + 1).padStart(2, "0");
          const yyyy = dt.getFullYear();
          return `${dd}-${mm}-${yyyy}`;
        }
        return "";
      };

      const dotValue =
        firstItem.dot ||
        firstItem.travel_date ||
        firstItem.date_of_travel ||
        firstItem.dot_date;

      worksheet.getCell("D6").value = formatDOT(dotValue);
      worksheet.getCell("D7").value = firstItem.group_type || "EMPLOYMENT";

      const DATA_START_ROW = 10;
      const templateRow = worksheet.getRow(DATA_START_ROW);

      data.forEach((item, index) => {
        let row;

        if (index === 0) {
          row = templateRow;
        } else {
          row = worksheet.insertRow(DATA_START_ROW + index, [], "i+");

          templateRow.eachCell({ includeEmpty: true }, (cell, col) => {
            const newCell = row.getCell(col);
            newCell.style = { ...cell.style };
            newCell.font = cell.font;
            newCell.border = cell.border;
            newCell.alignment = cell.alignment;
          });
        }

        const paxRaw = (item.pax || "").toUpperCase().trim();
        const cleanName = paxRaw.replace(/^(MR|MRS|MS|MISS)\s+/, "");
        const parts = cleanName.split(/\s+/);

        const firstName = parts[0] || "";
        const lastName =
          parts.length > 1 ? parts.slice(1).join(" ") : firstName;

        let gender = "MALE";
        if (
          item.gender?.toLowerCase() === "female" ||
          paxRaw.startsWith("MRS") ||
          paxRaw.startsWith("MS") ||
          paxRaw.startsWith("MISS")
        ) {
          gender = "FEMALE";
        }

        row.getCell("B").value = index + 1;
        row.getCell("C").value = gender === "FEMALE" ? "MRS" : "MR";
        row.getCell("D").value = firstName;
        row.getCell("E").value = lastName;
        row.getCell("F").value = "01-01-1990";
        row.getCell("G").value = gender;

        row.commit();
      });

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        fileName
      );
    }
  } catch (err) {
    console.error("Excel export error:", err);
    alert("Excel export failed");
  }
};
