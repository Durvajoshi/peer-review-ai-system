const pool = require("./db")
const bcrypt = require("bcrypt")

async function migrate() {
    console.log("Starting DB Migration...")

    try {
        // 1. Add password to employees if it doesn't exist
        console.log("Checking employees table...")
        const checkPassCol = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='employees' AND column_name='password';
        `)

        if (checkPassCol.rows.length === 0) {
            console.log("Adding password column to employees...")
            await pool.query(`ALTER TABLE employees ADD COLUMN password VARCHAR(255);`)

            // Set a default password 'password123' for existing employees
            const salt = await bcrypt.genSalt(10)
            const defaultHashedPassword = await bcrypt.hash("password123", salt)

            await pool.query(`UPDATE employees SET password = $1 WHERE password IS NULL;`, [defaultHashedPassword])
        } else {
            console.log("Password column already exists.")
        }

        // 2. Create review_cycles table if not exists
        console.log("Ensuring review_cycles table exists...")
        await pool.query(`
            CREATE TABLE IF NOT EXISTS review_cycles (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                is_active BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `)

        // 3. Update ai_analysis table structure
        console.log("Updating ai_analysis table schema...")

        const checkSentimentScore = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name='ai_analysis' AND column_name='sentiment_score';
        `)
        if (checkSentimentScore.rows.length === 0) {
            await pool.query(`ALTER TABLE ai_analysis ADD COLUMN sentiment_score NUMERIC(3,2);`)
        }

        const checkStrengths = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name='ai_analysis' AND column_name='strengths';
        `)
        if (checkStrengths.rows.length === 0) {
            await pool.query(`ALTER TABLE ai_analysis ADD COLUMN strengths JSONB;`)
        }

        const checkWeaknesses = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name='ai_analysis' AND column_name='weaknesses';
        `)
        if (checkWeaknesses.rows.length === 0) {
            await pool.query(`ALTER TABLE ai_analysis ADD COLUMN weaknesses JSONB;`)
        }

        const checkSkills = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name='ai_analysis' AND column_name='skills';
        `)
        if (checkSkills.rows.length === 0) {
            await pool.query(`ALTER TABLE ai_analysis ADD COLUMN skills JSONB;`)
        }

        // 4. Add unique constraints to collaboration_reviews to prevent duplicate reviews
        console.log("Adding unique constraint to collaboration_reviews...")

        // Check if constraint exists
        const checkConstraint = await pool.query(`
            SELECT conname
            FROM pg_constraint
            WHERE conrelid = 'collaboration_reviews'::regclass
            AND conname = 'unique_review_per_cycle';
        `)

        if (checkConstraint.rows.length === 0) {
            // we remove duplicate rows before setting unique constraint if there are any
            await pool.query(`
                DELETE FROM collaboration_reviews A USING collaboration_reviews B
                WHERE A.id < B.id AND A.cycle_id = B.cycle_id AND A.reviewer_id = B.reviewer_id AND A.reviewee_id = B.reviewee_id;
            `)
            await pool.query(`
                ALTER TABLE collaboration_reviews
                ADD CONSTRAINT unique_review_per_cycle UNIQUE (reviewer_id, reviewee_id, cycle_id);
            `)
        }

        // 5. Add unique constraint to ai_analysis to allow UPSERT
        console.log("Adding unique constraint to ai_analysis...")
        const checkAnalysisConstraint = await pool.query(`
            SELECT conname
            FROM pg_constraint
            WHERE conrelid = 'ai_analysis'::regclass
            AND conname = 'unique_analysis_per_cycle';
        `)

        if (checkAnalysisConstraint.rows.length === 0) {
            // Remove duplicates before setting unique constraint
            await pool.query(`
                DELETE FROM ai_analysis A USING ai_analysis B
                WHERE A.id < B.id AND A.employee_id = B.employee_id AND A.cycle_id = B.cycle_id;
            `)
            await pool.query(`
                ALTER TABLE ai_analysis
                ADD CONSTRAINT unique_analysis_per_cycle UNIQUE (employee_id, cycle_id);
            `)
        }

        console.log("Migration completed successfully!")
    } catch (error) {
        console.error("Migration failed:", error)
    } finally {
        pool.end()
    }
}

migrate()
