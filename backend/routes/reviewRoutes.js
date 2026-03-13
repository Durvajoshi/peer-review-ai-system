const express = require("express")
const router = express.Router()

const { verifyToken } = require("../middleware/authMiddleware")

const {
    submitReview,
    getEmployeeReviews,
    getPendingEmployees
} = require("../controllers/reviewController")

router.post("/submit", verifyToken, submitReview)
router.get("/employee/:id", verifyToken, getEmployeeReviews)
router.get("/pending-employees/:cycle_id", verifyToken, getPendingEmployees)

module.exports = router