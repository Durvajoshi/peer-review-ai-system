const pool = require("./db")
const bcrypt = require("bcrypt")

async function seed() {
    console.log("Starting DB Seeder...")

    try {
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash("password123", salt)

        console.log("Adding dummy employees...")
        await pool.query(`
            INSERT INTO employees (name, email, role, team, password)
            VALUES 
                ('Alice Admin', 'admin@seaneb.com', 'Admin', 'Management', $1),
                ('Bob Employee', 'bob@seaneb.com', 'Employee', 'Engineering', $1),
                ('Charlie Engineer', 'charlie@seaneb.com', 'Employee', 'Engineering', $1)
            ON CONFLICT DO NOTHING;
        `, [hashedPassword])

        console.log("Seeding completed successfully! Login with password: password123")
    } catch (error) {
        console.error("Seeding failed:", error)
    } finally {
        pool.end()
    }
}

seed()
