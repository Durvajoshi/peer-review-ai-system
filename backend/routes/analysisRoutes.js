const express = require("express")
const router = express.Router()

const { verifyToken, requireRole } = require("../middleware/authMiddleware")

const {
    getEmployeeAnalysis
} = require("../controllers/analysisController")

router.get("/:employeeId", verifyToken, requireRole("Admin"), getEmployeeAnalysis)

module.exports = router