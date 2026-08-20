const express = require("express");
const router = express.Router();

const db = require("../database/db");

// GET /all-logs
router.get("/all-logs", (req, res) => {

    const query = `
        SELECT
            source_ip,
            endpoint,
            method,
            status_code,
            timestamp
        FROM network_logs
        ORDER BY timestamp ASC
    `;

    db.all(query, [], (err, rows) => {

        if (err) {
            console.error("Error fetching logs:", err.message);

            return res.status(500).json({
                error: "Failed to fetch logs"
            });
        }

        res.json(rows);
    });
});

// GET /top-ips
router.get("/top-ips", (req, res) => {

    const query = `
        SELECT
            source_ip,
            COUNT(*) AS hit_count
        FROM network_logs
        GROUP BY source_ip
        ORDER BY hit_count DESC
        LIMIT 5
    `;

    db.all(query, [], (err, rows) => {

        if (err) {
            console.error("Error fetching top IPs:", err.message);

            return res.status(500).json({
                error: "Failed to fetch top IPs"
            });
        }

        res.json(rows);
    });
});

// GET /endpoints
router.get("/endpoints", (req, res) => {

    const query = `
        SELECT
            endpoint,
            COUNT(*) AS total_hits
        FROM network_logs
        GROUP BY endpoint
        ORDER BY total_hits DESC
        LIMIT 5
    `;

    db.all(query, [], (err, rows) => {

        if (err) {
            console.error("Error fetching endpoints:", err.message);

            return res.status(500).json({
                error: "Failed to fetch endpoints"
            });
        }

        res.json(rows);
    });
});

// GET /failed-logins
router.get("/failed-logins", (req, res) => {

    const query = `
        SELECT
            source_ip,
            COUNT(*) AS failed_attempts
        FROM network_logs
        WHERE status_code = 401
        GROUP BY source_ip
        HAVING COUNT(*) > 2
        ORDER BY failed_attempts DESC
    `;

    db.all(query, [], (err, rows) => {

        if (err) {
            console.error("Error fetching failed logins:", err.message);

            return res.status(500).json({
                error: "Failed to fetch failed logins"
            });
        }

        res.json(rows);
    });
});

// GET /server-errors
router.get("/server-errors", (req, res) => {

    const query = `
        SELECT
            endpoint,
            COUNT(*) AS errors
        FROM network_logs
        WHERE status_code = 500
        GROUP BY endpoint
        ORDER BY errors DESC
    `;

    db.all(query, [], (err, rows) => {

        if (err) {
            console.error("Error fetching server errors:", err.message);

            return res.status(500).json({
                error: "Failed to fetch server errors"
            });
        }

        res.json(rows);
    });
});

// GET /methods-usage
router.get("/methods-usage", (req, res) => {

    const query = `
        SELECT
            method,
            COUNT(*) AS usage_count
        FROM network_logs
        GROUP BY method
        ORDER BY usage_count DESC
    `;

    db.all(query, [], (err, rows) => {

        if (err) {
            console.error("Error fetching method usage:", err.message);

            return res.status(500).json({
                error: "Failed to fetch method usage"
            });
        }

        res.json(rows);
    });
});

// GET /status-summary
router.get("/status-summary", (req, res) => {

    const query = `
        SELECT
            status_code,
            COUNT(*) AS total_requests
        FROM network_logs
        GROUP BY status_code
        ORDER BY total_requests DESC
    `;

    db.all(query, [], (err, rows) => {

        if (err) {
            console.error("Error fetching status summary:", err.message);

            return res.status(500).json({
                error: "Failed to fetch status summary"
            });
        }

        res.json(rows);
    });
});

// GET /top-error-ips
router.get("/top-error-ips", (req, res) => {

    const query = `
        SELECT
            source_ip,
            COUNT(*) AS error_count
        FROM network_logs
        WHERE status_code >= 400
        GROUP BY source_ip
        ORDER BY error_count DESC
        LIMIT 5
    `;

    db.all(query, [], (err, rows) => {

        if (err) {
            console.error("Error fetching top error IPs:", err.message);

            return res.status(500).json({
                error: "Failed to fetch top error IPs"
            });
        }

        res.json(rows);
    });
});

// GET /traffic-by-hour
router.get("/traffic-by-hour", (req, res) => {

    const query = `
        SELECT
            strftime('%H', timestamp) AS hour,
            COUNT(*) AS request_count
        FROM network_logs
        GROUP BY hour
        ORDER BY hour ASC
    `;

    db.all(query, [], (err, rows) => {

        if (err) {
            console.error("Error fetching traffic by hour:", err.message);

            return res.status(500).json({
                error: "Failed to fetch traffic by hour"
            });
        }

        res.json(rows);
    });
});

// GET /logs
// Supports filtering and pagination
router.get("/logs", (req, res) => {

    const { ip, status, method, endpoint } = req.query;

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    // Validate pagination
    if (page < 1 || limit < 1 || limit > 100) {
        return res.status(400).json({
            error: "Page must be >= 1 and limit must be between 1 and 100"
        });
    }

    const offset = (page - 1) * limit;

    let whereClause = `WHERE 1 = 1`;
    const params = [];

    // Filter by IP
    if (ip) {
        whereClause += ` AND source_ip = ?`;
        params.push(ip);
    }

    // Filter by status
    if (status) {
        whereClause += ` AND status_code = ?`;
        params.push(status);
    }

    // Filter by method
    if (method) {
        whereClause += ` AND method = ?`;
        params.push(method.toUpperCase());
    }

    // Filter by endpoint
    if (endpoint) {
        whereClause += ` AND endpoint = ?`;
        params.push(endpoint);
    }

    // First count total matching records
    const countQuery = `
        SELECT COUNT(*) AS total
        FROM network_logs
        ${whereClause}
    `;

    db.get(countQuery, params, (err, countRow) => {

        if (err) {
            console.error("Error counting logs:", err.message);

            return res.status(500).json({
                error: "Failed to count logs"
            });
        }

        const total = countRow.total;

        // Fetch only the requested page
        const dataQuery = `
            SELECT
                source_ip,
                endpoint,
                method,
                status_code,
                timestamp
            FROM network_logs
            ${whereClause}
            ORDER BY timestamp DESC
            LIMIT ? OFFSET ?
        `;

        const dataParams = [...params, limit, offset];

        db.all(dataQuery, dataParams, (err, rows) => {

            if (err) {
                console.error("Error fetching paginated logs:", err.message);

                return res.status(500).json({
                    error: "Failed to fetch logs"
                });
            }

            res.json({
                page: page,
                limit: limit,
                total: total,
                totalPages: Math.ceil(total / limit),
                data: rows
            });
        });
    });
});

// GET /dashboard
router.get("/dashboard", (req, res) => {

    const query = `
        SELECT
            COUNT(*) AS total_requests,

            COUNT(DISTINCT source_ip) AS unique_ips,

            COUNT(DISTINCT endpoint) AS unique_endpoints,

            SUM(
                CASE
                    WHEN status_code >= 400 THEN 1
                    ELSE 0
                END
            ) AS error_requests,

            SUM(
                CASE
                    WHEN status_code = 401 THEN 1
                    ELSE 0
                END
            ) AS failed_login_attempts,

            SUM(
                CASE
                    WHEN status_code = 500 THEN 1
                    ELSE 0
                END
            ) AS server_errors

        FROM network_logs
    `;

    db.get(query, [], (err, row) => {

        if (err) {
            console.error("Error fetching dashboard:", err.message);

            return res.status(500).json({
                error: "Failed to fetch dashboard"
            });
        }

        const errorRate =
            row.total_requests > 0
                ? ((row.error_requests / row.total_requests) * 100).toFixed(2)
                : 0;

        res.json({
            total_requests: row.total_requests,
            unique_ips: row.unique_ips,
            unique_endpoints: row.unique_endpoints,
            error_requests: row.error_requests,
            error_rate: Number(errorRate),
            failed_login_attempts: row.failed_login_attempts,
            server_errors: row.server_errors
        });
    });
});

// GET /security/suspicious-ips
router.get("/security/suspicious-ips", (req, res) => {

    const query = `
        SELECT
            source_ip,

            COUNT(*) AS total_requests,

            SUM(
                CASE
                    WHEN status_code = 401 THEN 1
                    ELSE 0
                END
            ) AS failed_logins,

            SUM(
                CASE
                    WHEN status_code >= 400 AND status_code < 500 THEN 1
                    ELSE 0
                END
            ) AS client_errors,

            SUM(
                CASE
                    WHEN status_code >= 500 THEN 1
                    ELSE 0
                END
            ) AS server_errors

        FROM network_logs

        GROUP BY source_ip

        HAVING
            failed_logins > 2
            OR client_errors > 5
            OR server_errors > 2
            OR total_requests > 10

        ORDER BY total_requests DESC
    `;

    db.all(query, [], (err, rows) => {

        if (err) {
            console.error(
                "Error detecting suspicious IPs:",
                err.message
            );

            return res.status(500).json({
                error: "Failed to detect suspicious IPs"
            });
        }

        const results = rows.map((row) => {

            let riskLevel = "LOW";

            if (
                row.failed_logins > 5 ||
                row.client_errors > 10 ||
                row.server_errors > 5 ||
                row.total_requests > 30
            ) {
                riskLevel = "HIGH";
            }
            else if (
                row.failed_logins > 2 ||
                row.client_errors > 5 ||
                row.server_errors > 2 ||
                row.total_requests > 10
            ) {
                riskLevel = "MEDIUM";
            }

            return {
                source_ip: row.source_ip,
                total_requests: row.total_requests,
                failed_logins: row.failed_logins,
                client_errors: row.client_errors,
                server_errors: row.server_errors,
                risk_level: riskLevel
            };
        });

        res.json({
            suspicious_ips: results.length,
            data: results
        });
    });
});

// GET /query-plan
router.get("/query-plan", (req, res) => {

    const query = `
        EXPLAIN QUERY PLAN
        SELECT
            source_ip,
            COUNT(*) AS hit_count
        FROM network_logs
        GROUP BY source_ip
        ORDER BY hit_count DESC
        LIMIT 5
    `;

    db.all(query, [], (err, rows) => {

        if (err) {
            console.error("Error analyzing query:", err.message);

            return res.status(500).json({
                error: "Failed to analyze query"
            });
        }

        res.json(rows);
    });
});
module.exports = router;