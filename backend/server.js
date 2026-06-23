const http = require("http");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const authRoutes = require("./modules/auth/auth.route");
const driverRoutes = require("./modules/driver/driver.route");
const createRideRoutes = require("./modules/ride/ride.route");
const registerSocketHandlers = require("./sockets");

dotenv.config();

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173,http://localhost:5174,http://localhost:5175")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: allowedOrigins.length ? allowedOrigins : "*",
    credentials: true
  }
});

registerSocketHandlers(io);

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "PulseRoute backend" });
});

app.use("/api/auth", authRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/ride", createRideRoutes(io));

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error"
  });
});

const start = async () => {
  try {
    await connectDB();

    const port = process.env.PORT || 5000;
    server.on("error", (err) => {
      console.error("Server listen failed:", err.message);
      process.exit(1);
    });

    server.listen(port, () => {
      console.log(`PulseRoute backend running on port ${port}`);
    });
  } catch (err) {
    console.error("Backend startup failed:", err.message);
    process.exit(1);
  }
};

if (require.main === module) {
  start();
}

module.exports = { app, server, start };
