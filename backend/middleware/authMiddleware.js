const jwt = require("jsonwebtoken")

const verifyToken = (req, res, next) => {
    const authHeader = req.headers["authorization"]

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(403).json({ message: "No token provided" })
    }

    const token = authHeader.split(" ")[1]

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret_key_seaneb")
        req.user = decoded
        next()
    } catch (err) {
        return res.status(401).json({ message: "Unauthorized" })
    }
}

const requireRole = (role) => {
    return (req, res, next) => {
        if (!req.user || req.user.role !== role) {
            return res.status(403).json({ message: "Forbidden: Requires specific role" })
        }
        next()
    }
}

module.exports = {
    verifyToken,
    requireRole
}
