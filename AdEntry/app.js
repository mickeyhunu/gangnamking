// app.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import storeRoutes from "./routes/storeRoutes.js";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 라우트
app.use("/entry", storeRoutes);

app.get("/", (_, res) => {
  res.redirect("/home");
});

app.get("/health", (_, res) => res.send("ok"));

// (선택) 최소 에러 핸들러 — 페이지 렌더 없음
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ ok: false, message: err.message || "Internal Server Error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on :${PORT}`));
