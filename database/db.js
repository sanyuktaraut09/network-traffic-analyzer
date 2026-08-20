const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Create/Open the database
const dbPath = path.join(__dirname, "network_logs.db");

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Error connecting to database:", err.message);
    } else {
        console.log("Connected to SQLite database.");

        db.serialize(() => {

            // Create Logs table
            db.run(`
                CREATE TABLE IF NOT EXISTS network_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source_ip TEXT NOT NULL,
                    endpoint TEXT NOT NULL,
                    method TEXT NOT NULL,
                    status_code INTEGER NOT NULL,
                    timestamp TEXT NOT NULL
                )
            `);

            // Check if table already contains data
            db.get(
                "SELECT COUNT(*) AS count FROM network_logs",
                (err, row) => {

                    if (row.count === 0) {

                        console.log("Inserting sample log data...");

                        const endpoints = [
                            "/login",
                            "/products",
                            "/orders",
                            "/profile",
                            "/checkout",
                            "/cart",
                            "/admin",
                            "/search"
                        ];

                        const methods = [
                            "GET",
                            "POST",
                            "PUT"
                        ];

                        const statusCodes = [
                            200,
                            200,
                            200,
                            200,
                            401,
                            404,
                            500
                        ];

                        const stmt = db.prepare(`
                            INSERT INTO network_logs
                            (source_ip, endpoint, method, status_code, timestamp)
                            VALUES (?, ?, ?, ?, ?)
                        `);

                        for (let i = 1; i <= 200; i++) {

                            const ip = `192.168.1.${Math.floor(Math.random() * 50) + 1}`;

                            const endpoint =
                                endpoints[Math.floor(Math.random() * endpoints.length)];

                            const method =
                                methods[Math.floor(Math.random() * methods.length)];

                            const status =
                                statusCodes[Math.floor(Math.random() * statusCodes.length)];

                            const time = new Date(
                                Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
                            ).toISOString();

                            stmt.run(
                                ip,
                                endpoint,
                                method,
                                status,
                                time
                            );
                        }

                        stmt.finalize();

                        console.log("200 sample logs inserted.");
                    }
                }
            );

        });
        // Database indexes for faster analytical queries
db.run(`
    CREATE INDEX IF NOT EXISTS idx_source_ip
    ON network_logs(source_ip)
`);

db.run(`
    CREATE INDEX IF NOT EXISTS idx_status_code
    ON network_logs(status_code)
`);

db.run(`
    CREATE INDEX IF NOT EXISTS idx_endpoint
    ON network_logs(endpoint)
`);

db.run(`
    CREATE INDEX IF NOT EXISTS idx_timestamp
    ON network_logs(timestamp)
`);

console.log("Database indexes created.");
        
    }
});

module.exports = db;