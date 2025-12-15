import express from "express";
import dotenv from "dotenv";
import multer from "multer";
import jwt from "jsonwebtoken";
import { promises as fsp } from "fs";
import bcrypt from "bcrypt";
import path from "path";
import { fileURLToPath } from "url";
import XLSX from "xlsx";
import pool from "../config/db.js";

dotenv.config();
const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, "../uploads");
fsp.mkdir(uploadDir, { recursive: true }).catch(console.error);
await fsp.mkdir(uploadDir, { recursive: true }).catch(console.error);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

router.post("/adminlogin", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const [rows] = await pool.execute("SELECT * FROM admin WHERE email = ?", [
      email,
    ]);

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const admin = rows[0];

    let isMatch = false;

    if (admin.password && admin.password.length > 0) {
      try {
        isMatch = await bcrypt.compare(password, admin.password);
      } catch (err) {
        isMatch = false;
      }
    }

    if (!isMatch && admin.password === password) {
      isMatch = true;
    }

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    if (!["admin", "superadmin"].includes(admin.role)) {
      return res
        .status(403)
        .json({ message: "You do not have permission to login as admin." });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/postadminmail", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO admin (email, password)
      VALUES (?, ?)
    `;

    const [result] = await pool.execute(sql, [email, hashedPassword]);

    return res.status(200).json({
      success: true,
      message: "Admin created successfully",
      insertedId: result.insertId,
    });
  } catch (err) {
    console.error("❌ Admin Insert Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

router.delete("/admindelete/:id", async (req, res) => {
  let { id } = req.params;

  if (!id || id === "null" || isNaN(Number(id))) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid admin ID" });
  }

  id = Number(id);

  try {
    const [result] = await pool.execute("DELETE FROM admin WHERE id = ?", [id]);

    if (result.affectedRows > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, message: "Admin not found" });
    }
  } catch (err) {
    console.error("Error deleting admin:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.put("/editadmin/:id", async (req, res) => {
  const { id } = req.params;
  const { newEmail, newPassword } = req.body;

  if (!newEmail || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
    });
  }

  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    const query = `
      UPDATE admin 
      SET email = ?, password = ?
      WHERE id = ?
    `;

    const values = [newEmail, hashedPassword, id];

    const [result] = await pool.execute(query, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    res.json({
      success: true,
      message: "Admin updated successfully",
    });
  } catch (error) {
    console.error("UPDATE ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Database error while updating admin",
      error: error.message,
    });
  }
});

router.get("/alladmindata", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, email, role FROM admin ORDER BY id DESC"
    );

    return res.json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (err) {
    console.error("Error fetching admin data:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/agentlogin", async (req, res) => {
  try {
    const { agent_email, agent_password } = req.body;

    if (!agent_email || !agent_password) {
      return res
        .status(400)
        .json({ message: "Agent email and password are required." });
    }

    const [rows] = await pool.query(
      "SELECT * FROM agent WHERE agent_email = ? LIMIT 1",
      [agent_email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const agent = rows[0];

    let isMatch = false;

    if (agent.agent_password && agent.agent_password.length > 0) {
      try {
        isMatch = await bcrypt.compare(agent_password, agent.agent_password);
      } catch (err) {
        isMatch = false;
      }
    }

    if (!isMatch && agent.agent_password === agent_password) {
      isMatch = true;
    }

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error(
        "JWT_SECRET is not defined in your environment variables."
      );
    }

    const token = jwt.sign(
      {
        id: agent.id,
        email: agent.agent_email,
        role: "agent",
      },
      secret,
      { expiresIn: "8h" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      agent: {
        id: agent.id,
        email: agent.agent_email,
        name: agent.name,
        role: "agent",
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/stafflogin", async (req, res) => {
  try {
    const { staff_email, staff_password } = req.body;

    if (!staff_email || !staff_password) {
      return res
        .status(400)
        .json({ message: "Staff email and password are required." });
    }

    const [rows] = await pool.query(
      "SELECT * FROM staff WHERE staff_email = ? LIMIT 1",
      [staff_email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const staff = rows[0];

    let isMatch = false;

    if (staff.staff_password && staff.staff_password.length > 0) {
      try {
        isMatch = await bcrypt.compare(staff_password, staff.staff_password);
      } catch (err) {
        isMatch = false;
      }
    }

    if (!isMatch && staff.staff_password === staff_password) {
      isMatch = true;
    }

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error(
        "JWT_SECRET is not defined in your environment variables."
      );
    }

    const token = jwt.sign(
      {
        id: staff.id,
        email: staff.staff_email,
        role: "staff",
      },
      secret,
      { expiresIn: "8h" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      staff: {
        id: staff.id,
        email: staff.staff_email,
        name: staff.name,
        role: "staff",
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

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
      SELECT 
        id, sector, pax, sold, (pax - sold) AS seats_left, dot, fare, airline, pnr, created_at, updated_at
      FROM stock
      WHERE (pax - sold) > 0
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

    const incrementAmount = 1;

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
          "SELECT id, sector, pax, sold, dot, airline, fare, pnr FROM stock WHERE id = ? FOR UPDATE",
          [stockIdNum]
        );

        if (!selRows || selRows.length === 0) {
          await conn.rollback();
          return res
            .status(404)
            .json({ success: false, message: "Stock not found." });
        }

        const stockRow = selRows[0];

        if (Number(stockRow.sold) + incrementAmount > Number(stockRow.pax)) {
          await conn.rollback();
          return res.status(400).json({
            success: false,
            message: `Cannot sell more than available pax. Remaining: ${
              stockRow.pax - stockRow.sold
            }`,
          });
        }

        if (!sector) sector = stockRow.sector;
        if (!dot) dot = stockRow.dot;
        if (!airline) airline = stockRow.airline;
        if (!fare) fare = stockRow.fare;
        if (!pnr) pnr = stockRow.pnr;

        const [updResult] = await conn.execute(
          "UPDATE stock SET sold = sold + ? WHERE id = ?",
          [incrementAmount, stockIdNum]
        );

        const insertSql = `
          INSERT INTO sales (stock_id, sector, pax, dot, dotb, airline, agent, fare, pnr)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [insResult] = await conn.execute(insertSql, [
          stockIdNum,
          sector,
          pax,
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
          message: "Sale added and stock sold incremented by 1",
          insertedId: insResult.insertId,
        });
      } catch (txErr) {
        try {
          await conn.rollback();
        } catch (_) {}
        console.error("Transaction error:", txErr);
        return res
          .status(500)
          .json({ success: false, message: "Database error" });
      } finally {
        conn.release();
      }
    }

    try {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        const [selBySector] = await conn.execute(
          "SELECT id, pax, sold, fare, pnr, sector, dot, airline FROM stock WHERE sector = ? LIMIT 1 FOR UPDATE",
          [sector]
        );

        if (selBySector && selBySector.length > 0) {
          const stockRow = selBySector[0];

          if (Number(stockRow.sold) + incrementAmount > Number(stockRow.pax)) {
            await conn.rollback();
            return res.status(400).json({
              success: false,
              message: `Cannot sell more than available pax. Remaining: ${
                stockRow.pax - stockRow.sold
              }`,
            });
          }

          if (!fare) fare = stockRow.fare;
          if (!pnr) pnr = stockRow.pnr;
          if (!dot) dot = stockRow.dot;
          if (!airline) airline = stockRow.airline;

          const [updResult] = await conn.execute(
            "UPDATE stock SET sold = sold + ? WHERE id = ?",
            [incrementAmount, stockRow.id]
          );

          const insertSql = `
            INSERT INTO sales (stock_id, sector, pax, dot, dotb, airline, agent, fare, pnr)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          const [insResult] = await conn.execute(insertSql, [
            stockRow.id,
            sector,
            pax,
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
            message:
              "Sale added and stock sold incremented by 1 (matched by sector)",
            insertedId: insResult.insertId,
          });
        } else {
          await conn.commit();
        }
      } catch (txErr) {
        try {
          await conn.rollback();
        } catch (_) {}
        console.error("Transaction error (sector lookup):", txErr);
        conn.release();
        throw txErr;
      } finally {
        try {
          conn.release();
        } catch (_) {}
      }
    } catch (err) {
      console.error("Sector-lookup transaction error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Database error" });
    }

    try {
      const insertSql = `
        INSERT INTO sales (sector, pax, dot, dotb, airline, agent, fare, pnr)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const [result] = await pool.execute(insertSql, [
        sector,
        pax,
        dot,
        dotb,
        airline,
        agent,
        fare,
        pnr,
      ]);

      return res.status(200).json({
        success: true,
        message: "Sale added without stock linkage",
        insertedId: result.insertId,
      });
    } catch (insErr) {
      console.error("Insert sale without stock error:", insErr);
      return res
        .status(500)
        .json({ success: false, message: "Database error" });
    }
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
        message: "All fields are required.",
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

    const [result] = await pool.execute(sql, [name, email, hashed]);

    return res.status(200).json({
      success: true,
      message: "Agent added successfully",
      insertedId: result.insertId,
    });
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
      SELECT id, agent_name, agent_email,can_view_agents,can_view_fares, created_at, updated_at
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

router.put("/agent/toggle/:id", async (req, res) => {
  const agentId = req.params.id;
  const { field, value } = req.body;

  if (!["can_view_agents", "can_view_fares"].includes(field)) {
    return res.status(400).json({ message: "Invalid field" });
  }

  try {
    const [rows] = await pool.query(
      `UPDATE agent SET ${field} = ? WHERE id = ?`,
      [value, agentId]
    );

    if (rows.affectedRows === 0) {
      return res.status(404).json({ message: "Agent not found" });
    }

    res.json({
      message: "Updated successfully",
      newValue: value,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/editagent/:id", async (req, res) => {
  const id = req.params.id;
  const { agent_name, agent_email, agent_password } = req.body;

  if (!agent_name || !agent_email) {
    return res.status(400).json({
      success: false,
      message: "Agent name and email are required",
    });
  }

  try {
    const connection = await pool.getConnection();

    try {
      let query = "UPDATE agent SET agent_name = ?, agent_email = ?";
      const params = [agent_name, agent_email];

      if (agent_password && agent_password.trim() !== "") {
        const hashedPassword = await bcrypt.hash(agent_password, 10);
        query += ", agent_password = ?";
        params.push(hashedPassword);
      }

      query += " WHERE id = ?";
      params.push(id);

      const [result] = await connection.execute(query, params);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Agent not found",
        });
      }

      return res.json({
        success: true,
        message: "Agent credentials updated successfully",
      });
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("Error updating agent:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

router.put("/editstaff/:id", async (req, res) => {
  const id = req.params.id;
  const { staff_agent, staff_email, staff_password } = req.body;

  if (!staff_agent || !staff_email) {
    return res.status(400).json({
      success: false,
      message: "Staff name and email are required",
    });
  }

  try {
    const connection = await pool.getConnection();

    try {
      let query = "UPDATE staff SET staff_agent = ?, staff_email = ?";
      const params = [staff_agent, staff_email];

      if (staff_password && staff_password.trim() !== "") {
        const hashedPassword = await bcrypt.hash(staff_password, 10);
        query += ", staff_password = ?";
        params.push(hashedPassword);
      }

      query += " WHERE id = ?";
      params.push(id);

      const [result] = await connection.execute(query, params);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Staff record not found",
        });
      }

      return res.json({
        success: true,
        message: "Staff credentials updated successfully",
      });
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("Error updating staff:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

router.put("/staff/toggle/:id", async (req, res) => {
  const agentId = req.params.id;
  const { field, value } = req.body;

  const allowedFields = ["can_view_fares"];
  if (!allowedFields.includes(field)) {
    return res.status(400).json({ message: "Invalid field" });
  }

  try {
    const sql = `UPDATE staff SET ${field} = ? WHERE id = ?`;
    const [result] = await pool.query(sql, [value, agentId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Agent not found" });
    }

    res.json({
      message: "Updated successfully",
      newValue: value,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
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

    const hashedPassword = await bcrypt.hash(staff_password, 10);

    const sql = `
      INSERT INTO staff (staff_agent, staff_email, staff_password)
      VALUES (?, ?, ?)
    `;

    const [result] = await pool.execute(sql, [
      staff_agent,
      staff_email,
      hashedPassword,
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

    const [rows] = await pool.execute(
      "SELECT * FROM logo ORDER BY id ASC LIMIT 1"
    );
    const existing = rows.length > 0 ? rows[0] : null;

    if (existing) {
      if (existing.logo && existing.logo !== filename) {
        const oldFilePath = path.join(uploadsDir, existing.logo);
        try {
          await fsp.access(oldFilePath);
          await fsp.unlink(oldFilePath);
        } catch (unlinkErr) {}
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

function excelSerialToJSDate(serial) {
  const utcDays = serial - 25569;
  const utcValue = utcDays * 86400 * 1000;
  return new Date(utcValue);
}

function formatDateToDDMMYYYY(d) {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return null;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function parseDotValue(dot) {
  if (dot == null) return null;

  if (typeof dot === "number" && !Number.isNaN(dot)) {
    try {
      const jsDate = excelSerialToJSDate(dot);
      return formatDateToDDMMYYYY(jsDate);
    } catch (e) {
      return null;
    }
  }

  if (typeof dot === "string") {
    const s = dot.trim();
    const match = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (match) {
      let [, dd, mm, yyyy] = match;
      if (yyyy.length === 2) {
        yyyy = "20" + yyyy;
      }
      const day = parseInt(dd, 10);
      const month = parseInt(mm, 10);
      const year = parseInt(yyyy, 10);
      const jsDate = new Date(year, month - 1, day);
      return formatDateToDDMMYYYY(jsDate);
    }

    const isoTry = s.replace(" ", "T");
    const jsDate = new Date(isoTry);
    if (!isNaN(jsDate.getTime())) {
      return formatDateToDDMMYYYY(jsDate);
    }

    const jsDate2 = new Date(s);
    if (!isNaN(jsDate2.getTime())) {
      return formatDateToDDMMYYYY(jsDate2);
    }

    return s;
  }

  return null;
}

router.post("/upload-stock", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = path.join(uploadDir, req.file.filename);
    const workbook = XLSX.readFile(filePath, { raw: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const rawRows = XLSX.utils.sheet_to_json(sheet, {
      defval: null,
      raw: true,
    });

    if (!rawRows.length) {
      return res.status(400).json({ error: "Excel file is empty" });
    }

    const values = [];

    for (const row of rawRows) {
      const sector = row["Sector"] ?? row["sector"] ?? null;
      const pax = row["PAX"] ? Number(row["PAX"]) : null;
      const fare = row["Fare"] ? Number(row["Fare"]) : null;
      const airline = row["Airline"] ?? null;
      const pnr = row["PNR"] ?? null;
      const dot = parseDotValue(row["Dot"]);

      if (!sector || !dot) continue;

      values.push([sector, pax, dot, fare, airline, pnr]);
    }

    if (!values.length) {
      return res.status(400).json({ error: "No valid rows found" });
    }

    await pool.query(
      `INSERT INTO stock (sector, pax, dot, fare, airline, pnr)
       VALUES ?`,
      [values]
    );

    return res.status(200).json({
      message: "Bulk upload successful",
      rowsInserted: values.length,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({ error: "Upload failed" });
  }
});

export default router;
