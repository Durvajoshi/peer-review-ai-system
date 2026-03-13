require("dotenv").config()

const express = require("express")
const cors = require("cors")
const bodyParser = require("body-parser")

const reviewRoutes = require("./routes/reviewRoutes")
const employeeRoutes = require("./routes/employeeRoutes")
const analysisRoutes = require("./routes/analysisRoutes")
const authRoutes = require("./routes/authRoutes")
const cycleRoutes = require("./routes/cycleRoutes")

const app = express()

app.use(cors())
app.use(bodyParser.json())

app.use("/api/auth", authRoutes)
app.use("/api/reviews", reviewRoutes)
app.use("/api/employees", employeeRoutes)
app.use("/api/analysis", analysisRoutes)
app.use("/api/cycles", cycleRoutes)

const cron = require("node-cron")
const db = require("./db/db")

// Automatically generate a review cycle on the 1st of each month for the current month.
cron.schedule("0 0 1 * *", async () => {
    try {
        const now = new Date();
        const year = now.getFullYear();
        const monthIndex = now.getMonth(); 
        const monthName = now.toLocaleString('default', { month: 'long' });
        
        const cycleName = `${monthName} ${year}`;
        const startDate = new Date(year, monthIndex, 1).toISOString().split('T')[0];
        const endDate = new Date(year, monthIndex, 7).toISOString().split('T')[0];
        
        console.log(`[Cron] Automatically generating cycle: ${cycleName} from ${startDate} to ${endDate}`);
        
        await db.query(
            "INSERT INTO review_cycles (cycle_name, start_date, end_date, status) VALUES ($1, $2, $3, 'active')",
            [cycleName, startDate, endDate]
        );
        console.log(`[Cron] Cycle ${cycleName} created successfully.`);
    } catch (err) {
        console.error("[Cron] Failed to generate automatic cycle:", err);
    }
});

const PORT = 5000

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})