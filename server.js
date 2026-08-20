const express = require("express");
const db = require("./database/db");

const logRoutes = require("./routes/logRoutes");

const app = express();

const PORT = 3000;

app.use(express.json());

// Routes
app.use("/", logRoutes);

app.get("/", (req, res) => {
    res.send("Network Traffic Analyzer API is Running 🚀");
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});