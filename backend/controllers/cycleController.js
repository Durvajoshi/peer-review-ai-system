const db = require("../db/db")

exports.getCycles = async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM review_cycles ORDER BY id DESC")
        res.json(result.rows)
    } catch (err) {
        res.status(500).json(err)
    }
}

exports.getActiveCycles = async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM review_cycles WHERE status = 'active' ORDER BY id DESC")
        res.json(result.rows)
    } catch (err) {
        res.status(500).json(err)
    }
}

exports.createCycle = async (req, res) => {
    const { name, start_date, end_date } = req.body

    if (!name || !start_date || !end_date) {
        return res.status(400).json({ message: "Missing required fields: name, start_date, end_date" })
    }

    try {
        const result = await db.query(
            "INSERT INTO review_cycles (cycle_name, start_date, end_date, status) VALUES ($1, $2, $3, 'inactive') RETURNING *",
            [name, start_date, end_date]
        )
        res.json(result.rows[0])
    } catch (err) {
        console.error("Cycle creation error:", err.message)
        res.status(500).json({ message: "Failed to create cycle", error: err.message })
    }
}

exports.toggleCycleStatus = async (req, res) => {
    const { id } = req.params
    const { is_active } = req.body
    try {
        const newStatus = is_active ? 'active' : 'inactive'
        const result = await db.query(
            "UPDATE review_cycles SET status = $1 WHERE id = $2 RETURNING *",
            [newStatus, id]
        )
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Cycle not found" })
        }
        res.json(result.rows[0])
    } catch (err) {
        console.error("Toggle status error:", err.message)
        res.status(500).json(err)
    }
}
