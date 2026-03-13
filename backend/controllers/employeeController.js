const db = require("../db/db")

exports.getEmployees = async (req, res) => {
    try {
        const result = await db.query("SELECT id, name, email, role, team FROM employees")
        res.json(result.rows)
    } catch (err) {
        res.status(500).json(err)
    }
}

const bcrypt = require("bcrypt")

exports.addEmployee = async (req, res) => {
    const { name, email, role, team, password } = req.body

    try {
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password || "password123", salt)

        const result = await db.query(
            `INSERT INTO employees(name,email,role,team,password)
    VALUES($1,$2,$3,$4,$5) RETURNING id, name, email, role, team`,
            [name, email, role, team, hashedPassword]
        )

        res.json(result.rows[0])

    } catch (err) {
        res.status(500).json(err)
    }
}

exports.resetPassword = async (req, res) => {
    const { id } = req.params;
    const { new_password } = req.body;

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(new_password, salt);

        const result = await db.query(
            "UPDATE employees SET password = $1 WHERE id = $2 RETURNING id, name, email",
            [hashedPassword, id]
        )

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Employee not found" });
        }

        res.json({ message: "Password updated successfully", employee: result.rows[0] });
    } catch (err) {
        res.status(500).json(err);
    }
}