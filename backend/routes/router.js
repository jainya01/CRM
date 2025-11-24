import express from "express";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../config/db.js";

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

    const [result] = await pool.execute(sql, [
      sector,
      pax,
      dot,
      fare,
      airline,
      pnr,
    ]);

    return res.status(200).json({
      success: true,
      message: "Stock added successfully",
      insertedId: result.insertId,
    });
  } catch (error) {
    console.error("MySQL or Server error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

router.get("/allstocks", async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page || "1", 10), 1);
    let limit = Math.min(
      Math.max(Number.parseInt(req.query.limit || "100", 10), 1),
      1000
    );
    const offset = (page - 1) * limit;

    const sql = `
      SELECT id, sector, pax, dot, fare, airline, pnr, created_at, updated_at
      FROM stock
      WHERE pax > 0
      ORDER BY id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [rows] = await pool.execute(sql);

    return res.status(200).json({
      success: true,
      count: rows.length,
      page,
      limit,
      data: rows,
    });
  } catch (error) {
    console.error("❌ Server error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
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
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        const [selRows] = await conn.execute(
          "SELECT id, sector, pax, dot, airline, fare, pnr FROM stock WHERE id = ? FOR UPDATE",
          [stockIdNum]
        );

        if (!selRows || selRows.length === 0) {
          await conn.rollback();
          return res
            .status(404)
            .json({ success: false, message: "Stock not found." });
        }

        const stockRow = selRows[0];
        const availablePax = Number(stockRow.pax);
        if (isNaN(availablePax)) {
          console.error("Invalid pax type in DB for stock id:", stockIdNum);
          await conn.rollback();
          return res.status(500).json({
            success: false,
            message: "Invalid stock pax value in DB.",
          });
        }

        if (availablePax < paxSold) {
          await conn.rollback();
          return res.status(400).json({
            success: false,
            message: `Not enough pax in stock. Available: ${availablePax}, requested: ${paxSold}`,
          });
        }

        if (!sector) sector = stockRow.sector;
        if (!dot) dot = stockRow.dot;
        if (!airline) airline = stockRow.airline;
        if (!fare) fare = stockRow.fare;
        if (!pnr) pnr = stockRow.pnr;

        const [updResult] = await conn.execute(
          "UPDATE stock SET pax = pax - ? WHERE id = ?",
          [paxSold, stockIdNum]
        );

        if (!updResult || updResult.affectedRows === 0) {
          await conn.rollback();
          return res.status(400).json({
            success: false,
            message: "Failed to update stock pax.",
          });
        }

        const insertSql = `
          INSERT INTO sales (stock_id, sector, pax, dot, dotb, airline, agent, fare, pnr)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [insResult] = await conn.execute(insertSql, [
          stockIdNum,
          sector,
          paxSold,
          dot,
          dotb,
          airline,
          agent,
          fare,
          pnr,
        ]);

        await conn.commit();

        return res.status(200).json({
          success: true,
          message: "Sale added and stock pax decreased successfully",
          insertedId: insResult.insertId,
        });
      } catch (txErr) {
        try {
          await conn.rollback();
        } catch (rbErr) {
          console.error("Rollback error:", rbErr);
        }
        console.error("Transaction error:", txErr);
        return res
          .status(500)
          .json({ success: false, message: "Database error" });
      } finally {
        conn.release();
      }
    }

    try {
      const [selBySector] = await pool.execute(
        "SELECT id, fare, pnr FROM stock WHERE sector = ? LIMIT 1",
        [sector]
      );
      if (selBySector && selBySector.length > 0) {
        const stockRow = selBySector[0];
        if (!fare) fare = stockRow.fare;
        if (!pnr) pnr = stockRow.pnr;
      }
    } catch (selErr) {
      console.error("DB select by sector error:", selErr);
    }

    const insertSql = `
      INSERT INTO sales (sector, pax, dot, dotb, airline, agent, fare, pnr)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.execute(insertSql, [
      sector,
      paxSold,
      dot,
      dotb,
      airline,
      agent,
      fare,
      pnr,
    ]);

    return res.status(200).json({
      success: true,
      message: "Sale added without stock linkage (no stock_id provided)",
      insertedId: result.insertId,
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/allsales", async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page || "1", 10), 1);
    let limit = Math.min(
      Math.max(Number.parseInt(req.query.limit || "100", 10), 1),
      1000
    );
    const offset = (page - 1) * limit;

    const sql = `
      SELECT
        id,
        stock_id,
        sector,
        pax,
        dot,
        dotb,
        airline,
        agent,
        created_at,
        updated_at,
        fare,
        pnr
      FROM sales
      ORDER BY id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [rows] = await pool.execute(sql);

    return res.status(200).json({
      success: true,
      count: rows.length,
      page,
      limit,
      data: rows,
    });
  } catch (error) {
    console.error("❌ Server error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

function isValidEmail(email) {
  return typeof email === "string" && /\S+@\S+\.\S+/.test(email);
}

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

    const name = String(agent_name).trim();
    const email = String(agent_email).trim().toLowerCase();
    const pass = String(agent_password);

    if (!isValidEmail(email)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email." });
    }

    if (pass.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long.",
      });
    }

    const hashed = await bcrypt.hash(pass, 10);

    const sql = `
      INSERT INTO agent (agent_name, agent_email, agent_password)
      VALUES (?, ?, ?)
    `;

    try {
      const [result] = await pool.execute(sql, [name, email, hashed]);

      return res.status(200).json({
        success: true,
        message: "Agent added successfully",
        insertedId: result.insertId,
      });
    } catch (dbErr) {
      if (dbErr && dbErr.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          success: false,
          message: "This email is already registered.",
        });
      }
      console.error("MySQL insert error:", dbErr);
      return res
        .status(500)
        .json({ success: false, message: "Database error" });
    }
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/allagents", async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page || "1", 10), 1);
    let limit = Math.min(
      Math.max(Number.parseInt(req.query.limit || "100", 10), 1),
      1000
    );
    const offset = (page - 1) * limit;

    const sql = `
      SELECT id, agent_name, agent_email, created_at, updated_at
      FROM agent
      ORDER BY id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [rows] = await pool.execute(sql);

    return res.status(200).json({
      success: true,
      count: rows.length,
      page,
      limit,
      data: rows,
    });
  } catch (error) {
    console.error("❌ Server error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.delete("/agentdelete/:id", async (req, res) => {
  try {
    const id = req.params.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Agent ID is required.",
      });
    }

    const sql = "DELETE FROM agent WHERE id = ?";

    const [result] = await pool.execute(sql, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Agent not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Agent deleted successfully.",
    });
  } catch (err) {
    console.error("❌ Delete error:", err);
    return res.status(500).json({
      success: false,
      message: "Database error.",
    });
  }
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

    const [result] = await pool.execute(sql, [
      staff_agent,
      staff_email,
      staff_password,
    ]);

    return res.status(200).json({
      success: true,
      message: "Staff added successfully",
      insertedId: result.insertId,
    });
  } catch (error) {
    console.error("❌ Server error:", error);
    return res.status(500).json({
      success: false,
      message: "Database error",
    });
  }
});

router.get("/allstaffs", async (req, res) => {
  try {
    const sql = "SELECT * FROM staff ORDER BY id DESC LIMIT 1000";

    const [results] = await pool.query(sql);

    return res.status(200).json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    console.error("❌ Server error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
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

    const [result] = await pool.query(sql, [agent_name, mail]);

    return res.status(200).json({
      success: true,
      message: "OTB send successfully",
      insertedId: result.insertId,
    });
  } catch (error) {
    console.error("❌ Server error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/allotbs", async (req, res) => {
  try {
    const sql = "SELECT * FROM otb ORDER BY id DESC LIMIT 1000";

    const [results] = await pool.query(sql);

    return res.status(200).json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    console.error("❌ Server error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.delete("/otbdelete/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid id",
      });
    }

    const sql = "DELETE FROM otb WHERE id = ?";
    const [result] = await pool.query(sql, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Record not found",
      });
    }

    return res.json({
      success: true,
      message: "Record deleted",
    });
  } catch (error) {
    console.error("❌ Server error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

router.post("/change-logo", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    const filename = req.file.filename;
    const uploadsDir = path.join(process.cwd(), "uploads");
    const filePath = path.join(uploadsDir, filename);

    const [rows] = await pool.execute(
      "SELECT * FROM logo ORDER BY id ASC LIMIT 1"
    );

    const existing = rows.length > 0 ? rows[0] : null;

    if (existing) {
      if (existing.logo && existing.logo !== filename) {
        const oldFilePath = path.join(uploadsDir, existing.logo);
        try {
          await fs.promises.unlink(oldFilePath);
        } catch (unlinkErr) {
          console.warn("Could not delete old logo file:", unlinkErr);
        }
      }

      await pool.execute(
        "UPDATE logo SET logo = ?, updated_at = NOW() WHERE id = ?",
        [filename, existing.id]
      );

      return res.status(200).json({
        success: true,
        message: "Logo updated successfully",
        file: { filename, path: `/uploads/${filename}` },
      });
    } else {
      await pool.execute(
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
    const [rows] = await pool.execute(
      "SELECT id, logo FROM logo ORDER BY id DESC LIMIT 1"
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "No logo found" });
    }

    return res.json({
      success: true,
      logo: rows[0],
    });
  } catch (err) {
    console.error("Error fetching logo:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/postmail", async (req, res) => {
  try {
    const { email, description } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    const descValue = description || null;

    const sql = `
      INSERT INTO company (email, description)
      VALUES (?, ?)
    `;

    const [result] = await pool.execute(sql, [email, descValue]);

    return res.status(200).json({
      success: true,
      message: "Email submitted successfully",
      insertedId: result.insertId,
    });
  } catch (err) {
    console.error("❌ Database error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/allemails", async (req, res) => {
  try {
    const sql = "SELECT * FROM company ORDER BY id DESC";

    const [rows] = await pool.execute(sql);

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (err) {
    console.error("❌ Database error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.delete("/emaildelete/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const sql = "DELETE FROM company WHERE id = ?";

    const [result] = await pool.execute(sql, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Record not found",
      });
    }

    return res.json({
      success: true,
      message: "Email deleted successfully",
    });
  } catch (err) {
    console.error("❌ Database error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

export default router;
