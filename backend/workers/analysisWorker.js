require("dotenv").config()

const { Worker } = require("bullmq")
const Redis = require("ioredis")
const db = require("../db/db")
const https = require("https")

const connection = new Redis({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: process.env.REDIS_PORT || 6379,
    maxRetriesPerRequest: null
})

function callOpenRouter(prompt) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            model: "anthropic/claude-3-haiku",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 1000
        })

        const options = {
            hostname: "openrouter.ai",
            path: "/api/v1/chat/completions",
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:5000",
                "X-Title": "SeaNeb Peer Review AI"
            }
        }

        const req = https.request(options, (res) => {
            let data = ""
            res.on("data", chunk => data += chunk)
            res.on("end", () => {
                try {
                    const parsed = JSON.parse(data)
                    if (parsed.error) {
                        return reject(new Error(`OpenRouter error: ${parsed.error.message}`))
                    }
                    const text = parsed.choices?.[0]?.message?.content
                    if (!text) return reject(new Error("Empty response from OpenRouter"))
                    resolve(text)
                } catch (e) {
                    reject(new Error(`Failed to parse OpenRouter response: ${e.message}`))
                }
            })
        })

        req.on("error", reject)
        req.write(body)
        req.end()
    })
}

const worker = new Worker(
    "review-analysis",

    async job => {
        console.log("[analysisWorker] Processing job:", job.data)
        const { employeeId, cycleId } = job.data

        const reviews = await db.query(
            `SELECT review_text, improvement_text, 
                    collaboration_rating, communication_rating, 
                    technical_rating, learning_rating 
             FROM collaboration_reviews 
             WHERE reviewee_id=$1 AND cycle_id=$2`,
            [employeeId, cycleId]
        )

        if (reviews.rows.length === 0) {
            console.log(`[analysisWorker] No reviews found for employee ${employeeId}, cycle ${cycleId}. Skipping.`)
            return
        }

        const reviewData = reviews.rows.map((r, i) => `
### Review #${i + 1}
- Ratings: Collab: ${r.collaboration_rating}/5, Comm: ${r.communication_rating}/5, Tech: ${r.technical_rating}/5, Learn: ${r.learning_rating}/5
- Feedback: ${r.review_text}
- Improvements: ${r.improvement_text}
`).join("\n")

        const prompt = `Analyze the following peer reviews for an employee in the current cycle. There are ${reviews.rows.length} separate reviews. 
Generate a comprehensive, synthesized analysis based on ALL of these reviews combined.

Ensure the JSON strictly follows the specified format and contains no additional text. Focus on extracting actionable insights, identifying patterns in strengths and weaknesses across all feedback, assessing skills, and providing a concise overall summary. Use sentiment analysis to determine the sentimentScore, where -1.0 indicates extremely negative, 0 is neutral, and 1.0 is extremely positive.

The JSON object must have exactly these keys:
- "sentimentScore" (number between -1.0 and 1.0)
- "strengths" (array of strings, synthesized from all reviews)
- "weaknesses" (array of strings, synthesized from all reviews)
- "skills" (array of strings, synthesized from all reviews)
- "summary" (string, a brief overall summary synthesizing the collective feedback)

Collected Reviews Data:
${reviewData}`

        let retries = 3
        while (retries > 0) {
            try {
                console.log(`[analysisWorker] Calling OpenRouter... (attempt ${4 - retries})`)
                let resultText = await callOpenRouter(prompt)

                // Strip markdown code fences if present
                if (resultText.includes("```json")) {
                    resultText = resultText.split("```json")[1].split("```")[0]
                } else if (resultText.includes("```")) {
                    resultText = resultText.split("```")[1].split("```")[0]
                }

                const parsedResult = JSON.parse(resultText.trim())

                // UPSERT the analysis: Update if exists for this employee/cycle, otherwise insert.
                // We'll use a manual check/delete/insert if a unique constraint isn't guaranteed, 
                // but better approach is to add a unique constraint and use ON CONFLICT.
                await db.query(`
                    INSERT INTO ai_analysis 
                        (employee_id, cycle_id, summary, sentiment_score, strengths, weaknesses, skills, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
                    ON CONFLICT (employee_id, cycle_id) 
                    DO UPDATE SET 
                        summary = EXCLUDED.summary,
                        sentiment_score = EXCLUDED.sentiment_score,
                        strengths = EXCLUDED.strengths,
                        weaknesses = EXCLUDED.weaknesses,
                        skills = EXCLUDED.skills,
                        created_at = CURRENT_TIMESTAMP
                `, [
                    employeeId,
                    cycleId,
                    parsedResult.summary,
                    parsedResult.sentimentScore,
                    JSON.stringify(parsedResult.strengths || []),
                    JSON.stringify(parsedResult.weaknesses || []),
                    JSON.stringify(parsedResult.skills || [])
                ])
                console.log(`[analysisWorker] Analysis saved for employee ${employeeId}`)
                break

            } catch (err) {
                console.error(`[analysisWorker] Attempt failed. Retries left: ${retries - 1}. Error: ${err.message}`)
                retries--
                if (retries === 0) throw err
            }
        }
    },

    { connection }
)

worker.on("failed", (job, err) => {
    console.error(`[analysisWorker] Job ${job.id} failed permanently:`, err.message)
})

console.log("[analysisWorker] AI Worker running with OpenRouter")