// server.js
import express from "express";
import cors from "cors";
// import morgan from "morgan";
import dotenv from "dotenv";
import v1BlogRoutes from "./routes/v1/routes.js";

// ✅ Import your startup actions
import { SIACTION } from "./actions/SIACTION.js";
import { TwitterAction } from "./actions/TwitterAction.js";


// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
// app.use(morgan("dev"));

// Health check route
app.get("/", (req, res) => {
  res.status(200).json({ message: "✅ API is running smoothly!" });
});

// API Routes
app.use("/api/v1", v1BlogRoutes);

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// 🔁 Function to start background actions
async function StartServer() {
  console.log("🚀 Server startup tasks initiated...");

  try {
    console.log("📰 Running SIAction...");

    let text ="Football Manager 2026"
    SIACTION();
   // let result = TwitterAction("FOOTBALL MANAGER",text,"https://sportsviewpoint.com/wp-content/uploads/2025/11/tmp_1763134656969_images2FvoltaxMediaLibrary2Fmmsport2Fsi2F01k9waedy27xwztgkjnp.jpg")

   
 
    console.log("✅ Initial background actions completed successfully!");
  } catch (error) {
    console.error("🔥 Error during startup actions:", error.message);
  }
}

// 🛑 Optional: Stop server tasks gracefully
async function StopServer() {
  console.log("🛑 Cleaning up before shutdown...");
  // Add cleanup logic here (e.g., close DB, stop queues, etc.)
}

// 🚀 Start Express server
const PORT = process.env.PORT || 8200;
app.listen(PORT, async () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  await StartServer(); // 🔥 Trigger action on startup
});

process.on("SIGINT", async () => {
  await StopServer();
  process.exit(0);
});
