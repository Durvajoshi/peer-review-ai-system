const db = require("../db/db")

exports.getEmployeeAnalysis = async (req, res) => {
    const { employeeId } = req.params

    try {
        const result = await db.query(
            `SELECT *
             FROM ai_analysis
             WHERE employee_id = $1
             ORDER BY created_at DESC
             LIMIT 1`,
            [employeeId]
        );

        if (result.rows.length === 0) {
            return res.json({ message: "No AI analysis found yet. Ensure at least one peer review has been submitted for this employee, then the AI worker will generate the analysis automatically." });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error("Analysis fetch error:", error)
        res.status(500).json({
            error: "Failed to fetch analysis",
            details: error.message
        })
    }
}
