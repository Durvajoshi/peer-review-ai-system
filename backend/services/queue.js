const { Queue } = require("bullmq")
const Redis = require("ioredis")

const connection = new Redis({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: process.env.REDIS_PORT || 6379,
    maxRetriesPerRequest: null
})

const reviewQueue = new Queue("review-analysis", {
    connection
})

exports.addAnalysisJob = async (employeeId, cycleId) => {

    await reviewQueue.add("analyze", {
        employeeId,
        cycleId
    })

}