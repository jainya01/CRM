import express from "express";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import db from "../config/db.js";

dotenv.config();
const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// stock management

router.post("/stockpost", async (req, res) => {
  try {
    const { sector, pax, dot, fare, airline, pnr } = req.body;

    if (!sector || !pax || !dot || !fare || !airline || !pnr) {
      return res.status(400).json({
        success: false,
        message:
          "All fields (sector, pax, dot, fare, airline, pnr) are required.",
      });
    }

    const sql = `
      INSERT INTO stock (sector, pax, dot, fare, airline, pnr)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [sector, pax, dot, fare, airline, pnr], (err, result) => {
      if (err) {
        console.error("MySQL insert error:", err);
        return res
          .status(500)
          .json({ success: false, message: "Database error" });
      }

      return res.status(200).json({
        success: true,
        message: "Stock added successfully",
        insertedId: result.insertId,
      });
    });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/allstocks", async (req, res) => {
  try {
    const sql =
      "SELECT * FROM stock WHERE (pax + 0) > 0 ORDER BY id DESC LIMIT 1000";
    db.query(sql, (err, results) => {
      if (err) {
        console.error("❌ Database error:", err);
        return res
          .status(500)
          .json({ success: false, message: "Database error" });
      }

      res.status(200).json({
        success: true,
        count: results.length,
        data: results,
      });
    });
  } catch (error) {
    console.error("❌ Server error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// sales

router.post("/salespost", async (req, res) => {
  try {
    let { stock_id, sector, pax, dot, dotb, airline, agent, fare, pnr } =
      req.body;

    if (!pax || !dot || !dotb || !airline || !agent) {
      return res.status(400).json({
        success: false,
        message: "Fields pax, dot, dotb, airline and agent are required.",
      });
    }

    const paxSold = parseInt(pax, 10);
    if (isNaN(paxSold) || paxSold <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid pax value. Must be a positive integer.",
      });
    }

    const hasStockId =
      stock_id !== undefined && stock_id !== null && stock_id !== "";
    let stockIdNum = null;
    if (hasStockId) {
      stockIdNum = parseInt(stock_id, 10);
      if (isNaN(stockIdNum) || stockIdNum <= 0) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid stock_id." });
      }
    }

    if (hasStockId) {
      db.beginTransaction((beginErr) => {
        if (beginErr) {
          console.error("Transaction begin error:", beginErr);
          return res
            .status(500)
            .json({ success: false, message: "Database error" });
        }

        const selectSql =
          "SELECT id, sector, pax, dot, airline, fare, pnr FROM stock WHERE id = ? FOR UPDATE";
        db.query(selectSql, [stockIdNum], (selErr, selRes) => {
          if (selErr) {
            console.error("DB select error:", selErr);
            return db.rollback(() => {
              return res
                .status(500)
                .json({ success: false, message: "Database error" });
            });
          }

          if (!selRes || selRes.length === 0) {
            return db.rollback(() => {
              return res
                .status(404)
                .json({ success: false, message: "Stock not found." });
            });
          }

          const stockRow = selRes[0];
          const availablePax = Number(stockRow.pax);
          if (isNaN(availablePax)) {
            console.error("Invalid pax type in DB for stock id:", stockIdNum);
            return db.rollback(() => {
              return res.status(500).json({
                success: false,
                message: "Invalid stock pax value in DB.",
              });
            });
          }

          if (availablePax < paxSold) {
            return db.rollback(() => {
              return res.status(400).json({
                success: false,
                message: `Not enough pax in stock. Available: ${availablePax}, requested: ${paxSold}`,
              });
            });
          }

          if (!sector) sector = stockRow.sector;
          if (!dot) dot = stockRow.dot;
          if (!airline) airline = stockRow.airline;
          if (!fare) fare = stockRow.fare;
          if (!pnr) pnr = stockRow.pnr;

          const updSql = "UPDATE stock SET pax = pax - ? WHERE id = ?";
          db.query(updSql, [paxSold, stockIdNum], (updErr, updRes) => {
            if (updErr) {
              console.error("DB update error:", updErr);
              return db.rollback(() => {
                return res
                  .status(500)
                  .json({ success: false, message: "Database error" });
              });
            }

            if (!updRes || updRes.affectedRows === 0) {
              return db.rollback(() => {
                return res.status(400).json({
                  success: false,
                  message: "Failed to update stock pax.",
                });
              });
            }

            const insertSql = `
              INSERT INTO sales (stock_id, sector, pax, dot, dotb, airline, agent, fare, pnr)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            db.query(
              insertSql,
              [
                stockIdNum,
                sector,
                paxSold,
                dot,
                dotb,
                airline,
                agent,
                fare,
                pnr,
              ],
              (insErr, insRes) => {
                if (insErr) {
                  console.error("MySQL insert error (sales):", insErr);
                  return db.rollback(() => {
                    return res
                      .status(500)
                      .json({ success: false, message: "Database error" });
                  });
                }

                db.commit((commitErr) => {
                  if (commitErr) {
                    console.error("Transaction commit error:", commitErr);
                    return db.rollback(() => {
                      return res
                        .status(500)
                        .json({ success: false, message: "Database error" });
                    });
                  }

                  return res.status(200).json({
                    success: true,
                    message: "Sale added and stock pax decreased successfully",
                    insertedId: insRes.insertId,
                  });
                });
              }
            );
          });
        });
      });

      return;
    }

    const selectBySectorSql =
      "SELECT id, fare, pnr FROM stock WHERE sector = ? LIMIT 1";
    db.query(selectBySectorSql, [sector], (selErr, selRes) => {
      if (selErr) {
        console.error("DB select by sector error:", selErr);
        insertSaleWithoutStock();
        return;
      }

      if (selRes && selRes.length > 0) {
        const stockRow = selRes[0];
        if (!fare) fare = stockRow.fare;
        if (!pnr) pnr = stockRow.pnr;
      }

      const insertSql = `
        INSERT INTO sales (sector, pax, dot, dotb, airline, agent, fare, pnr)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      db.query(
        insertSql,
        [sector, paxSold, dot, dotb, airline, agent, fare, pnr],
        (err, result) => {
          if (err) {
            console.error("MySQL insert error (sales):", err);
            return res
              .status(500)
              .json({ success: false, message: "Database error" });
          }

          return res.status(200).json({
            success: true,
            message: "Sale added without stock linkage (no stock_id provided)",
            insertedId: result.insertId,
          });
        }
      );
    });

    function insertSaleWithoutStock() {
      const insertSql = `
        INSERT INTO sales (sector, pax, dot, dotb, airline, agent, fare, pnr)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      db.query(
        insertSql,
        [sector, paxSold, dot, dotb, airline, agent, fare, pnr],
        (err, result) => {
          if (err) {
            console.error("MySQL insert error (sales fallback):", err);
            return res
              .status(500)
              .json({ success: false, message: "Database error" });
          }

          return res.status(200).json({
            success: true,
            message: "Sale added without stock linkage (no stock_id provided)",
            insertedId: result.insertId,
          });
        }
      );
    }
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/allsales", async (req, res) => {
  try {
    const sql = "SELECT * FROM sales ORDER BY id DESC LIMIT 1000";
    db.query(sql, (err, results) => {
      if (err) {
        console.error("❌ Database error:", err);
        return res
          .status(500)
          .json({ success: false, message: "Database error" });
      }

      res.status(200).json({
        success: true,
        count: results.length,
        data: results,
      });
    });
  } catch (error) {
    console.error("❌ Server error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/agentpost", async (req, res) => {
  try {
    const { agent_name, agent_email, agent_password } = req.body;

    if (!agent_name || !agent_email || !agent_password) {
      return res.status(400).json({
        success: false,
        message:
          "All fields (agent_name, agent_email, agent_password) are required.",
      });
    }

    const sql = `
      INSERT INTO agent (agent_name, agent_email, agent_password)
      VALUES (?, ?, ?)
    `;

    db.query(sql, [agent_name, agent_email, agent_password], (err, result) => {
      if (err) {
        console.error("❌ MySQL insert error:", err);
        return res
          .status(500)
          .json({ success: false, message: "Database error" });
      }

      return res.status(200).json({
        success: true,
        message: "Agent added successfully",
        insertedId: result.insertId,
      });
    });
  } catch (error) {
    console.error("❌ Server error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/allagents", async (req, res) => {
  try {
    const sql = "SELECT * FROM agent ORDER BY id DESC LIMIT 1000";
    db.query(sql, (err, results) => {
      if (err) {
        console.error("❌ Database error:", err);
        return res
          .status(500)
          .json({ success: false, message: "Database error" });
      }

      res.status(200).json({
        success: true,
        count: results.length,
        data: results,
      });
    });
  } catch (error) {
    console.error("❌ Server error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.delete("/agentdelete/:id", async (req, res) => {
  let id = req.params;
  const sql = "delete from agent where id=?";
  db.query(sql, [id], (err, result) => {
    if (err) throw err;
    else {
      res.send("data deleted");
    }
  });
});

router.post("/staffpost", async (req, res) => {
  try {
    const { staff_agent, staff_email, staff_password } = req.body;

    if (!staff_agent || !staff_email || !staff_password) {
      return res.status(400).json({
        success: false,
        message:
          "All fields (staff_agent, staff_email, staff_password) are required.",
      });
    }

    const sql = `
      INSERT INTO staff (staff_agent, staff_email, staff_password)
      VALUES (?, ?, ?)
    `;

    db.query(sql, [staff_agent, staff_email, staff_password], (err, result) => {
      if (err) {
        console.error("❌ MySQL insert error:", err);
        return res
          .status(500)
          .json({ success: false, message: "Database error" });
      }

      return res.status(200).json({
        success: true,
        message: "Agent added successfully",
        insertedId: result.insertId,
      });
    });
  } catch (error) {
    console.error("❌ Server error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/allstaffs", async (req, res) => {
  try {
    const sql = "SELECT * FROM staff ORDER BY id DESC LIMIT 1000";
    db.query(sql, (err, results) => {
      if (err) {
        console.error("❌ Database error:", err);
        return res
          .status(500)
          .json({ success: false, message: "Database error" });
      }

      res.status(200).json({
        success: true,
        count: results.length,
        data: results,
      });
    });
  } catch (error) {
    console.error("❌ Server error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/otbpost", async (req, res) => {
  try {
    const { agent_name, mail } = req.body;

    if (!agent_name || !mail) {
      return res.status(400).json({
        success: false,
        message: "All fields (agent_name, mail) are required.",
      });
    }

    const sql = `
      INSERT INTO otb (agent_name, mail)
      VALUES (?, ?)
    `;

    db.query(sql, [agent_name, mail], (err, result) => {
      if (err) {
        console.error("MySQL insert error:", err);
        return res
          .status(500)
          .json({ success: false, message: "Database error" });
      }

      return res.status(200).json({
        success: true,
        message: "OTB send successfully",
        insertedId: result.insertId,
      });
    });
  } catch (error) {
    console.error("❌ Server error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/allotbs", async (req, res) => {
  try {
    const sql = "SELECT * FROM otb ORDER BY id DESC LIMIT 1000";
    db.query(sql, (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res
          .status(500)
          .json({ success: false, message: "Database error" });
      }

      res.status(200).json({
        success: true,
        count: results.length,
        data: results,
      });
    });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.delete("/otbdelete/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ success: false, message: "Invalid id" });
  }

  const sql = "DELETE FROM otb WHERE id = ?";
  db.query(sql, [id], (err, result) => {
    if (err)
      return res
        .status(500)
        .json({ success: false, message: "Database error" });
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Record not found" });
    }
    res.json({ success: true, message: "Record deleted" });
  });
});

router.post("/change-logo", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    const filename = req.file.filename;
    const filePath = path.join(__dirname, "uploads", filename);

    const [rows] = await db
      .promise()
      .query("SELECT * FROM logo ORDER BY id ASC LIMIT 1");

    const existing = rows.length > 0 ? rows[0] : null;

    if (existing) {
      try {
        if (existing.logo && existing.logo !== filename) {
          const oldFilePath = path.join(__dirname, "uploads", existing.logo);
          await fs.unlink(oldFilePath).catch(() => {});
        }
      } catch (fsErr) {
        console.warn("Could not delete old logo file:", fsErr);
      }

      await db
        .promise()
        .query("UPDATE logo SET logo = ?, updated_at = NOW() WHERE id = ?", [
          filename,
          existing.id,
        ]);

      return res.status(200).json({
        success: true,
        message: "Logo updated successfully",
        file: { filename, path: `/uploads/${filename}` },
      });
    } else {
      await db
        .promise()
        .query(
          "INSERT INTO logo (id, logo, created_at, updated_at) VALUES (1, ?, NOW(), NOW())",
          [filename]
        );

      return res.status(201).json({
        success: true,
        message: "Logo uploaded successfully",
        file: { filename, path: `/uploads/${filename}` },
      });
    }
  } catch (err) {
    console.error("Error in /change-logo:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/get-logo", async (req, res) => {
  try {
    const [rows] = await db
      .promise()
      .query("SELECT id, logo FROM logo ORDER BY id DESC LIMIT 1");

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "No logo found" });
    }

    res.json({ success: true, logo: rows[0] });
  } catch (err) {
    console.error("Error fetching logo:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/postmail", async (req, res) => {
  const { email, description } = req.body;
  const descValue = description ? description : null;
  const sql = "INSERT INTO company (email, description) VALUES (?, ?)";
  db.query(sql, [email, descValue], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Database error");
    }
    res.send("Email submitted");
  });
});

router.get("/allemails", async (req, res) => {
  const sql = "select *from company";
  db.query(sql, (err, result) => {
    if (err) throw err;
    else {
      res.json(result);
    }
  });
});

router.delete("/emaildelete/:id", async (req, res) => {
  const { id } = req.params;
  const sql = "delete from company where id=?";
  db.query(sql, [id], (err, result) => {
    if (err) throw err;
    else {
      res.send("data deleted");
    }
  });
});

export default router;
