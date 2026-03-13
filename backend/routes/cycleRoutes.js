const express = require("express")
const router = express.Router()
const { verifyToken, requireRole } = require("../middleware/authMiddleware")
const {
    getCycles,
    getActiveCycles,
    createCycle,
    toggleCycleStatus
} = require("../controllers/cycleController")

router.get("/", verifyToken, requireRole("Admin"), getCycles)
router.get("/active", verifyToken, getActiveCycles)
router.post("/", verifyToken, requireRole("Admin"), createCycle)
router.patch("/:id/status", verifyToken, requireRole("Admin"), toggleCycleStatus)

module.exports = router
