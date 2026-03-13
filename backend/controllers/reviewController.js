const db = require("../db/db")
const { addAnalysisJob } = require("../services/queue")

exports.submitReview = async (req, res) => {

    const {
        cycle_id,
        reviewee_id,
        collaboration_rating,
        communication_rating,
        technical_rating,
        learning_rating,
        review_text,
        improvement_text
    } = req.body

    const reviewer_id = req.user.id

    if (reviewer_id === reviewee_id) {
        return res.status(400).json({ message: "You cannot review yourself." })
    }

    try {
        // Check if a review already exists for this reviewer, reviewee, and cycle
        const existingReview = await db.query(
            "SELECT id FROM collaboration_reviews WHERE reviewer_id = $1 AND reviewee_id = $2 AND cycle_id = $3",
            [reviewer_id, reviewee_id, cycle_id]
        )

        if (existingReview.rows.length > 0) {
            return res.status(400).json({ message: "You have already submitted a review for this colleague in the current cycle." })
        }


        const result = await db.query(
            `INSERT INTO collaboration_reviews
    (cycle_id, reviewer_id, reviewee_id,
    collaboration_rating, communication_rating,
    technical_rating, learning_rating,
    review_text, improvement_text)

    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING *`,
            [
                cycle_id,
                reviewer_id,
                reviewee_id,
                collaboration_rating,
                communication_rating,
                technical_rating,
                learning_rating,
                review_text,
                improvement_text
            ]
        )
        console.log("Adding AI analysis job for:", reviewee_id)
        await addAnalysisJob(reviewee_id, cycle_id)

        res.json(result.rows[0])

    } catch (err) {
        if (err.constraint === 'unique_review_per_cycle') {
            return res.status(400).json({ message: "You have already submitted a review for this colleague in the current cycle." })
        }
        res.status(500).json({ message: "Server error", detail: err.message })
    }

}

exports.getEmployeeReviews = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(
            `SELECT cr.*, e.name as reviewer_name, rc.cycle_name 
             FROM collaboration_reviews cr
             JOIN employees e ON cr.reviewer_id = e.id
             JOIN review_cycles rc ON cr.cycle_id = rc.id
             WHERE cr.reviewee_id = $1
             ORDER BY cr.created_at DESC`,
            [id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Failed to fetch exact reviews:", err);
        res.status(500).json({ message: "Server error", detail: err.message });
    }
}

exports.getPendingEmployees = async (req, res) => {
    const { cycle_id } = req.params;
    const reviewer_id = req.user.id;

    if (!cycle_id) {
        return res.status(400).json({ message: "cycle_id is required" });
    }

    try {
        // Get all employees EXCEPT:
        // 1. The current user
        // 2. Employees the current user has already reviewed in this cycle
        const result = await db.query(
            `SELECT e.id, e.name, e.team 
             FROM employees e
             WHERE e.id != $1 
               AND e.id NOT IN (
                   SELECT reviewee_id 
                   FROM collaboration_reviews 
                   WHERE reviewer_id = $1 AND cycle_id = $2
               )`,
            [reviewer_id, cycle_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Failed to fetch pending employees:", err);
        res.status(500).json({ message: "Server error", detail: err.message });
    }
}
