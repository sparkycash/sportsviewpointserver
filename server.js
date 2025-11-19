// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import v1BlogRoutes from "./routes/v1/routes.js";



// Background thread

import { SIACTION } from "./actions/SIACTION.js";
import { TwitterAction } from "./actions/TwitterAction.js";

// Load .env
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health route
app.get("/", (req, res) => {
  res.status(200).json({ message: "✅ API is running smoothly!" });
});

// Routes
app.use("/api/v1", v1BlogRoutes);

// 404 handler
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

// Startup logic
async function StartServer() {
  console.log("🚀 Server startup tasks initiated...");

  
    // Start the background thread
   while (true) {
    try {
   
         let text ="Football Manager 2026"
  await  SIACTION();
   //let result = TwitterAction("FOOTBALL MANAGER",text,"https://sportsviewpoint.com/wp-content/uploads/2025/11/tmp_1763134656969_images2FvoltaxMediaLibrary2Fmmsport2Fsi2F01k9waedy27xwztgkjnp.jpg")


    } catch (err) {
      console.error("🔥 Error in scraper loop:", err.message);
    } 

    console.log("⏰ Waiting 10 minutes before next scrape cycle...");
    await new Promise((resolve) => setTimeout(resolve, 3 * 60 * 1000)); // 10 mins
    
    console.log("⏰ Waiting 10 minutes before next scrape cycle...");
    await new Promise((resolve) => setTimeout(resolve, 3 * 60 * 1000)); // 10 mins
  
  }
}
 


// Shutdown logic
async function StopServer() {
  console.log("🛑 Cleaning up before shutdown...");
 
}

// Start Express
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  await StartServer();
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await StopServer();
  process.exit(0);
});
