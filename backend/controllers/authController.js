const db = require("../db/db")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")

exports.login = async (req, res) => {
    const { email, password } = req.body

    try {
        const result = await db.query("SELECT * FROM employees WHERE email = $1", [email])

        if (result.rows.length === 0) {
            return res.status(401).json({ message: "Invalid credentials" })
        }

        const employee = result.rows[0]

        // Check password
        const isMatch = await bcrypt.compare(password, employee.password)
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" })
        }

        // Create JWT
        const token = jwt.sign(
            { id: employee.id, name: employee.name, role: employee.role, email: employee.email, team: employee.team },
            process.env.JWT_SECRET || "fallback_secret_key_seaneb",
            { expiresIn: "1d" }
        )

        // return user data (without password) and token
        const { password: _, ...userData } = employee
        res.json({ token, user: userData })
    } catch (err) {
        console.error("Login error:", err)
        res.status(500).json({ message: "Server error during login" })
    }
}
