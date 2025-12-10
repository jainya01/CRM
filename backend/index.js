import express from "express";
import router from "./routes/router.js";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: "Content-Type, Authorization",
    credentials: true,
  })
);

app.use("/api", router);
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

const PORT = process.env.PORT;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`server is running on port ${PORT}`);
});
