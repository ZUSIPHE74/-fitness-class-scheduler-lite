const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const DB_PATH = path.join(__dirname, 'database.json');

app.use(cors());
app.use(express.json());

// Hardcoded Accounts with Security Questions for Password Recovery
const ACCOUNTS = {
  admin: {
    password: "admin123",
    role: "admin",
    name: "System Admin",
    token: "token-admin-123",
    question: "What is our fitness brand name?",
    answer: "flexzone"
  },
  user: {
    password: "user123",
    role: "user",
    name: "Regular Member",
    token: "token-user-123",
    question: "What is the primary color of our theme?",
    answer: "pink"
  }
};

// Helper function to read database
function readDB() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading database file, returning empty state:', err);
    return { sessions: [] };
  }
}

// Helper function to write database
function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing to database file:', err);
  }
}

// Middleware: Verify Token (User or Admin) for general features
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Access denied: Please log in first.' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Access denied: Invalid session format.' });
  }

  const token = parts[1];
  if (token !== 'token-user-123' && token !== 'token-admin-123') {
    return res.status(403).json({ error: 'Access denied: Session expired or invalid.' });
  }

  next();
}

// Middleware: Verify Admin Token for administrative features (add/delete)
function verifyAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Access denied: Admin login required.' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Access denied: Invalid session format.' });
  }

  const token = parts[1];
  if (token !== 'token-admin-123') {
    return res.status(403).json({ error: 'Access denied: Admin credentials required.' });
  }

  next();
}

// 1. Authentication Endpoint: Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const account = ACCOUNTS[username.toLowerCase().trim()];
  if (account && account.password === password) {
    res.json({
      token: account.token,
      role: account.role,
      name: account.name
    });
  } else {
    res.status(400).json({ error: 'Invalid username or password' });
  }
});

// 2. Authentication Endpoint: Get Security Question for Forgot Password
app.post('/api/forgot-password/question', (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  const account = ACCOUNTS[username.toLowerCase().trim()];
  if (!account) {
    return res.status(404).json({ error: 'Username not found' });
  }

  res.json({ question: account.question });
});

// 3. Authentication Endpoint: Verify Answer and Recover Password
app.post('/api/forgot-password/answer', (req, res) => {
  const { username, answer } = req.body;

  if (!username || !answer) {
    return res.status(400).json({ error: 'Username and answer are required' });
  }

  const account = ACCOUNTS[username.toLowerCase().trim()];
  if (!account) {
    return res.status(404).json({ error: 'Username not found' });
  }

  if (account.answer === answer.toLowerCase().trim()) {
    res.json({ password: account.password });
  } else {
    res.status(400).json({ error: 'Incorrect answer to security question' });
  }
});

// 4. Get all sessions (requires login)
app.get('/api/sessions', verifyToken, (req, res) => {
  const db = readDB();
  res.json(db.sessions);
});

// 5. Add a new session (Admin only)
app.post('/api/sessions', verifyAdmin, (req, res) => {
  const { name, coach, date, time, capacity } = req.body;

  if (!name || !coach || !date || !time || !capacity) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const numericCapacity = parseInt(capacity, 10);
  if (isNaN(numericCapacity) || numericCapacity <= 0) {
    return res.status(400).json({ error: 'Capacity must be a positive number' });
  }

  const db = readDB();
  const newSession = {
    id: Date.now(),
    name,
    coach,
    date,
    time,
    capacity: numericCapacity,
    bookings: []
  };

  db.sessions.push(newSession);
  writeDB(db);

  res.status(201).json(newSession);
});

// 6. Delete a session (Admin only)
app.delete('/api/sessions/:id', verifyAdmin, (req, res) => {
  const sessionId = parseInt(req.params.id, 10);
  const db = readDB();

  const originalLength = db.sessions.length;
  db.sessions = db.sessions.filter(s => s.id !== sessionId);

  if (db.sessions.length === originalLength) {
    return res.status(404).json({ error: 'Session not found' });
  }

  writeDB(db);
  res.json({ success: true, message: 'Session deleted successfully' });
});

// 7. Book a slot in a session (requires login + capacity logic validation)
app.post('/api/sessions/:id/book', verifyToken, (req, res) => {
  const sessionId = parseInt(req.params.id, 10);
  const { name } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Attendee name is required for booking' });
  }

  const db = readDB();
  const session = db.sessions.find(s => s.id === sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  // Require both name and surname (at least two words)
  const trimmedName = name.trim();
  const nameParts = trimmedName.split(/\s+/);
  if (nameParts.length < 2 || nameParts[0] === "" || nameParts[1] === "") {
    return res.status(400).json({ error: 'Please enter both your name and surname.' });
  }

  // Capacity validation check
  if (session.bookings.length >= session.capacity) {
    return res.status(400).json({ error: 'Class is fully booked! Cannot exceed capacity.' });
  }

  // Prevent duplicate booking
  const alreadyBooked = session.bookings.some(b => b.name.toLowerCase() === trimmedName.toLowerCase());
  if (alreadyBooked) {
    return res.status(400).json({ error: 'already booked' });
  }

  const newBooking = {
    id: Date.now(),
    name: name.trim()
  };

  session.bookings.push(newBooking);
  writeDB(db);

  res.json(session);
});

// 8. Cancel a booking (requires login)
app.post('/api/sessions/:id/cancel-booking', verifyToken, (req, res) => {
  const sessionId = parseInt(req.params.id, 10);
  const { bookingId } = req.body;

  if (!bookingId) {
    return res.status(400).json({ error: 'Booking ID is required' });
  }

  const db = readDB();
  const session = db.sessions.find(s => s.id === sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const originalLength = session.bookings.length;
  session.bookings = session.bookings.filter(b => b.id !== parseInt(bookingId, 10));

  if (session.bookings.length === originalLength) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  writeDB(db);
  res.json(session);
});

app.listen(PORT, () => {
  console.log(`Express API Server running on port ${PORT}`);
});
