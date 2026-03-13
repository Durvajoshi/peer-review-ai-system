const express = require("express")
const router = express.Router()

const { verifyToken, requireRole } = require("../middleware/authMiddleware")

const {
  getEmployees,
  addEmployee,
  resetPassword
} = require("../controllers/employeeController")

router.get("/", verifyToken, getEmployees)
router.post("/", verifyToken, requireRole("Admin"), addEmployee)
router.patch("/:id/password", verifyToken, requireRole("Admin"), resetPassword)

module.exports = router