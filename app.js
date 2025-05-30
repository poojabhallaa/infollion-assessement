// Required Modules
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();

// Middleware
app.use(bodyParser.json());

const SECRET_KEY = "fwgfwftwewihhegckwefcku";
const users = {}; // { username: { password, balance, transactions } }

// Middleware for Auth
function authenticateToken(req, res, next) {
    const token = req.headers["authorization"]?.split(" ")[1];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();     
    });
}

app.use(express.static(path.join(__dirname, 'public')));

// Register
app.post("/register", async (req, res) => {
    const { username, password } = req.body;
    if (users[username]) return res.status(400).json({ error: "User exists" });
    const hashedPassword = await bcrypt.hash(password, 10);
    users[username] = {
        password: hashedPassword,
        balance: { USD: 0 },
        transactions: []
    };
    res.status(201).json({ message: "User registered" });
});

// Login
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const user = users[username];
    if (!user) return res.status(400).json({ error: "User not found" });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(403).json({ error: "Invalid password" });
    const token = jwt.sign({ username }, SECRET_KEY);
    res.json({ token });
});

// Deposit
app.post("/wallet/deposit", authenticateToken, (req, res) => {
    const { amount, currency = "USD" } = req.body;
    if (amount <= 0) return res.status(400).json({ error: "Invalid amount" });
    const user = users[req.user.username];
    user.balance[currency] = (user.balance[currency] || 0) + amount;
    user.transactions.push({ type: "deposit", amount, currency, date: new Date() });
    res.json({ balance: user.balance });
});

// Withdraw
app.post("/wallet/withdraw", authenticateToken, (req, res) => {
    const { amount, currency = "USD" } = req.body;
    const user = users[req.user.username];
    if (amount <= 0 || (user.balance[currency] || 0) < amount) {
        return res.status(400).json({ error: "Insufficient funds or invalid amount" });
    }
    user.balance[currency] -= amount;
    user.transactions.push({ type: "withdraw", amount, currency, date: new Date() });
    res.json({ balance: user.balance });
});

// Transfer
app.post("/wallet/transfer", authenticateToken, (req, res) => {
    const { to, amount, currency = "USD" } = req.body;
    const sender = users[req.user.username];
    const recipient = users[to];
    if (!recipient) return res.status(400).json({ error: "Recipient not found" });
    if (amount <= 0 || (sender.balance[currency] || 0) < amount) {
        return res.status(400).json({ error: "Invalid amount or insufficient balance" });
    }
    sender.balance[currency] -= amount;
    recipient.balance[currency] = (recipient.balance[currency] || 0) + amount;
    const now = new Date();
    sender.transactions.push({ type: "transfer-out", amount, currency, to, date: now });
    recipient.transactions.push({ type: "transfer-in", amount, currency, from: req.user.username, date: now });
    res.json({ balance: sender.balance });
});

// Transaction History
app.get("/wallet/history", authenticateToken, (req, res) => {
    const user = users[req.user.username];
    res.json({ transactions: user.transactions });
});

// Start Server
app.listen(3000, () => console.log("Server running on port 3000"));