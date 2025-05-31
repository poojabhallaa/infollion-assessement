
/**
 * @swagger
 * /register:
 *   post:
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered
 */

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Login user and receive JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: JWT token returned
 */

/**
 * @swagger
 * /wallet/deposit:
 *   post:
 *     summary: Deposit amount into wallet
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated balance
 */

/**
 * @swagger
 * /wallet/withdraw:
 *   post:
 *     summary: Withdraw amount from wallet
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated balance
 */

/**
 * @swagger
 * /wallet/transfer:
 *   post:
 *     summary: Transfer funds to another user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               to:
 *                 type: string
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *     responses:
 *       200:
 *         description: Transfer completed
 */


/**
 * @swagger
 * /wallet/delete-transaction:
 *   post:
 *     summary: Soft delete a transaction
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               index:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Transaction marked as deleted
 *       400:
 *         description: Invalid transaction index
 */

/**
 * @swagger
 * /wallet/history:
 *   get:
 *     summary: Get transaction history
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of transactions
 */

/**
 * @swagger
 * /account/delete:
 *   delete:
 *     summary: Soft delete a user account
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account marked as deleted
 */

/**
 * @swagger
 * /admin/flagged:
 *   get:
 *     summary: Get all flagged transactions for fraud
 *     responses:
 *       200:
 *         description: List of suspicious transactions
 */

/**
 * @swagger
 * /admin/balances:
 *   get:
 *     summary: Get balances of all users
 *     responses:
 *       200:
 *         description: Map of usernames to balances
 */

/**
 * @swagger
 * /admin/top-users:
 *   get:
 *     summary: Get top users by balance and transaction count
 *     responses:
 *       200:
 *         description: List of top users by balance and transactions
 */


// Fixed app.js - Key issues resolved:

const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const cron = require("node-cron");

const app = express();

app.use(bodyParser.json());

const SECRET_KEY = "7b9135540126c51b841f6116c3731c23d98b794f90fc5b4598921f1fd30f881fd756850e14eeddd419c6f4b0f6d8b5086f97d281e84bab9b282c1302aa7bf9c5";
const users = {}; // { username: { password, balance, transactions, deleted } }

app.use(express.static(path.join(__dirname, 'public')));

function authenticateToken(req, res, next) {
    const token = req.headers["authorization"]?.split(" ")[1];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();     
    });
}

function checkFraud(user, transaction) {
    const now = new Date();
    const recent = user.transactions.filter(t => !t.deleted && (now - new Date(t.date)) < 5 * 60 * 1000);
    const alerts = [];

    const recentTransfers = recent.filter(t => t.type === "transfer-out");
    if (recentTransfers.length > 3) {
        alerts.push("Multiple transfers in short period");
    }

    if (transaction.type === "withdraw" && transaction.amount > 1000) {
        alerts.push("Large withdrawal");
    }

    if (alerts.length > 0) {
        transaction.flagged = true;
        transaction.alerts = alerts;
        console.log(`Fraud Alert for ${user}:`, alerts);
    }
}

function sendEmailAlert(user, transaction) {
    console.log(`Email Alert to ${user.username}@gmail.com`);
    console.log(`Subject: Suspicious Transaction`);
    console.log(`Body: A suspicious transaction occurred on your wallet:\n${JSON.stringify(transaction, null, 2)}`);
}

// FIXED: Registration logic
app.post("/register", async (req, res) => {
    const { username, password } = req.body;
    
    // Check if user exists and is not deleted
    if (users[username] && users[username].deleted === false) {
        return res.status(400).json({ error: "User exists" });
    }
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        users[username] = {
            password: hashedPassword,
            balance: { USD: 0 },
            transactions: [],
            deleted: false
        };
        console.log(`User registered: ${username}`); // Debug log
        res.status(201).json({ message: "User registered" });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: "Registration failed" });
    }
});

// FIXED: Login logic with better error handling
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    
    console.log(`Login attempt for: ${username}`); // Debug log
    
    const user = users[username];
    if (!user) {
        console.log(`User not found: ${username}`);
        return res.status(400).json({ error: "User not found" });
    }
    
    if (user.deleted) {
        console.log(`Account deleted: ${username}`);
        return res.status(403).json({ error: "Account deleted" });
    }
    
    try {
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            console.log(`Invalid password for: ${username}`);
            return res.status(403).json({ error: "Invalid password" });
        }
        
        const token = jwt.sign({ username }, SECRET_KEY);
        console.log(`Login successful for: ${username}`); // Debug log
        res.json({ token });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: "Login failed" });
    }
});

app.post("/wallet/deposit", authenticateToken, (req, res) => {
    const { amount, currency = "USD" } = req.body;
    if (amount <= 0) return res.status(400).json({ error: "Invalid amount" });
    
    const user = users[req.user.username];
    user.balance[currency] = (user.balance[currency] || 0) + amount;
    
    const transaction = { 
        type: "deposit", 
        amount, 
        currency, 
        date: new Date(), 
        deleted: false 
    };
    
    checkFraud(user, transaction);
    if (transaction.flagged) {
        sendEmailAlert({ username: req.user.username }, transaction);
    }
    
    // FIXED: Always push transaction to history
    user.transactions.push(transaction);
    
    res.json({ balance: user.balance });
});

app.post("/wallet/withdraw", authenticateToken, (req, res) => {
    const { amount, currency = "USD" } = req.body;
    const user = users[req.user.username];
    
    if (user.deleted) return res.status(403).json({ error: "Account is deactivated" });
    
    if (amount <= 0 || (user.balance[currency] || 0) < amount) {
        return res.status(400).json({ error: "Insufficient funds or invalid amount" });
    }
    
    user.balance[currency] -= amount;
    
    const transaction = {
        type: "withdraw",
        amount,
        currency,
        date: new Date(),
        deleted: false
    };
    
    checkFraud(user, transaction);
    if (transaction.flagged || amount > 1000) {
        sendEmailAlert({ username: req.user.username }, transaction);
    }
    
    user.transactions.push(transaction);
    res.json({ balance: user.balance });
});

app.post("/wallet/transfer", authenticateToken, (req, res) => {
    const { to, amount, currency = "USD" } = req.body;
    const sender = users[req.user.username];
    const recipient = users[to];
    
    if (sender.deleted || !recipient || recipient.deleted) {
        return res.status(400).json({ error: "Invalid recipient or account deactivated" });
    }
    
    if (amount <= 0 || (sender.balance[currency] || 0) < amount) {
        return res.status(400).json({ error: "Invalid amount or insufficient balance" });
    }
    
    sender.balance[currency] -= amount;
    recipient.balance[currency] = (recipient.balance[currency] || 0) + amount;
    
    const now = new Date();
    const senderTransaction = {
        type: "transfer-out",
        amount,
        currency,
        to,
        date: now,
        deleted: false
    };
    const recipientTransaction = {
        type: "transfer-in",
        amount,
        currency,
        from: req.user.username,
        date: now,
        deleted: false
    };
    
    checkFraud(sender, senderTransaction);
    checkFraud(recipient, recipientTransaction);
    
    if (senderTransaction.flagged || amount > 1000) {
        sendEmailAlert({ username: req.user.username }, senderTransaction);
    }
    if (recipientTransaction.flagged) {
        sendEmailAlert({ username: to }, recipientTransaction);
    }
    
    sender.transactions.push(senderTransaction);
    recipient.transactions.push(recipientTransaction);
    
    res.json({ balance: sender.balance });
});

// FIXED: Transaction history endpoint
app.get("/wallet/history", authenticateToken, (req, res) => {
    const user = users[req.user.username];
    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }
    
    console.log(`Fetching history for ${req.user.username}, transactions: ${user.transactions.length}`);
    res.json({ transactions: user.transactions });
});

app.delete("/account/delete", authenticateToken, (req, res) => {
    const user = users[req.user.username];
    user.deleted = true;
    res.json({ message: "Account marked as deleted" });
});

app.post("/wallet/delete-transaction", authenticateToken, (req, res) => {
    const { index } = req.body;
    const user = users[req.user.username];
    
    if (user.transactions[index]) {
        user.transactions[index].deleted = true;
        res.json({ message: "Transaction marked as deleted" });
    } else {
        res.status(400).json({ error: "Invalid transaction index" });
    }
});

app.get("/admin", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.get("/admin/flagged", (req, res) => {
    const flagged = [];
    for (const username in users) {
        const user = users[username];
        const suspicious = user.transactions.filter(t => t.flagged && !t.deleted);
        if (suspicious.length > 0) {
            flagged.push({ username, suspicious });
        }
    }
    res.json(flagged);
});

app.get("/admin/balances", (req, res) => {
    const summary = {};
    for (const username in users) {
        if (!users[username].deleted) {
            summary[username] = users[username].balance;
        }
    }
    res.json(summary);
});

app.get("/admin/top-users", (req, res) => {
    const sorted = Object.entries(users)
        .filter(([_, user]) => !user.deleted)
        .map(([username, user]) => ({
            username,
            totalBalance: Object.values(user.balance).reduce((a, b) => a + b, 0),
            transactionCount: user.transactions.filter(tx => !tx.deleted).length
        }));

    const topByBalance = [...sorted].sort((a, b) => b.totalBalance - a.totalBalance).slice(0, 5);
    const topByTransactionVolume = [...sorted].sort((a, b) => b.transactionCount - a.transactionCount).slice(0, 5);

    res.json({
        topByBalance,
        topByTransactionVolume
    });
});

// FIXED: Add CORS headers for development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    next();
});

// Swagger setup
const swaggerOptions = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Digital Wallet API",
            version: "1.0.0",
            description: "API documentation for the Digital Wallet System",
        },
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
    },
    apis: ["./app.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Start Server
app.listen(3000, () => {
    console.log("Server running on port 3000");
    console.log("Registered users:", Object.keys(users));
});

// FIXED: Add a test user for debugging
setTimeout(() => {
    if (Object.keys(users).length === 0) {
        console.log("Creating test user...");
        bcrypt.hash("password123", 10).then(hashedPassword => {
            users["testuser"] = {
                password: hashedPassword,
                balance: { USD: 100 },
                transactions: [{
                    type: "deposit",
                    amount: 100,
                    currency: "USD",
                    date: new Date(),
                    deleted: false
                }],
                deleted: false
            };
            console.log("Test user created: testuser / password123");
        });
    }
}, 1000);