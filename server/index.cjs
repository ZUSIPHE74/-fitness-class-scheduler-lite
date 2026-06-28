const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const DB_PATH = path.join(__dirname, 'database.json');

app.use(cors());
app.use(express.json());

// Helper function to read database and guarantee schema structure
function readDB() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    const db = JSON.parse(data);
    if (!db.sessions) db.sessions = [];
    if (!db.users || db.users.length === 0) {
      db.users = [
        { username: "admin", password: "admin123", name: "System", surname: "Admin", role: "admin", token: "token-admin-123", question: "What is our fitness brand name?", answer: "flexzone" },
        { username: "user", password: "user123", name: "Regular", surname: "Member", role: "user", token: "token-user-123", question: "What is the primary color of our theme?", answer: "pink" }
      ];
    }
    if (!db.history) db.history = [];
    return db;
  } catch (err) {
    const defaults = {
      sessions: [
        { id: 1719220000000, name: "Yoga Flow", coach: "Sarah Jenkins", date: "2026-07-01", time: "08:30", capacity: 15, bookings: [] },
        { id: 1719220000001, name: "HIIT Cardio Strength", coach: "Mike Peterson", date: "2026-07-02", time: "17:00", capacity: 20, bookings: [] }
      ],
      users: [
        { username: "admin", password: "admin123", name: "System", surname: "Admin", role: "admin", token: "token-admin-123", question: "What is our fitness brand name?", answer: "flexzone" },
        { username: "user", password: "user123", name: "Regular", surname: "Member", role: "user", token: "token-user-123", question: "What is the primary color of our theme?", answer: "pink" }
      ],
      history: []
    };
    writeDB(defaults);
    return defaults;
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

// Middleware: Verify Token (User or Admin)
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
  const db = readDB();
  const user = db.users.find(u => u.token === token);
  
  if (!user) {
    return res.status(403).json({ error: 'Access denied: Session expired or invalid.' });
  }

  req.user = user; // Attach user context to request
  next();
}

// Middleware: Verify Admin Token
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
  const db = readDB();
  const user = db.users.find(u => u.token === token);

  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admin credentials required.' });
  }

  req.user = user;
  next();
}

// 1. Authentication Endpoint: Register/Create Account
app.post('/api/register', (req, res) => {
  const { username, password, name, surname, question, answer } = req.body;

  if (!username || !password || !name || !surname || !question || !answer) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const db = readDB();
  
  // Check if username exists
  const exists = db.users.some(u => u.username.toLowerCase() === username.toLowerCase().trim());
  if (exists) {
    return res.status(400).json({ error: 'Username is already taken.' });
  }

  const newUser = {
    username: username.toLowerCase().trim(),
    password: password,
    name: name.trim(),
    surname: surname.trim(),
    role: "user",
    token: "token-user-" + Date.now(),
    question: question,
    answer: answer.toLowerCase().trim()
  };

  db.users.push(newUser);
  writeDB(db);

  res.status(201).json({
    token: newUser.token,
    role: newUser.role,
    name: newUser.name + " " + newUser.surname
  });
});

// 2. Authentication Endpoint: Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const db = readDB();
  const account = db.users.find(u => u.username === username.toLowerCase().trim());
  
  if (account && account.password === password) {
    res.json({
      token: account.token,
      role: account.role,
      name: account.name + " " + account.surname
    });
  } else {
    res.status(400).json({ error: 'Invalid username or password' });
  }
});

// 3. Authentication Endpoint: Forgot Password - Question
app.post('/api/forgot-password/question', (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  const db = readDB();
  const account = db.users.find(u => u.username === username.toLowerCase().trim());
  
  if (!account) {
    return res.status(404).json({ error: 'Username not found' });
  }

  res.json({ question: account.question });
});

// 4. Authentication Endpoint: Forgot Password - Answer
app.post('/api/forgot-password/answer', (req, res) => {
  const { username, answer } = req.body;

  if (!username || !answer) {
    return res.status(400).json({ error: 'Username and answer are required' });
  }

  const db = readDB();
  const account = db.users.find(u => u.username === username.toLowerCase().trim());
  
  if (!account) {
    return res.status(404).json({ error: 'Username not found' });
  }

  if (account.answer === answer.toLowerCase().trim()) {
    res.json({ password: account.password });
  } else {
    res.status(400).json({ error: 'Incorrect answer to security question' });
  }
});

// 5. Get all sessions (requires login)
app.get('/api/sessions', verifyToken, (req, res) => {
  const db = readDB();
  res.json(db.sessions);
});

// 6. Add a new session (Admin only)
app.post('/api/sessions', verifyAdmin, (req, res) => {
  const { name, coach, date, startTime, endTime, duration, capacity } = req.body;

  if (!name || !coach || !date || !startTime || !endTime || !capacity) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const numericCapacity = parseInt(capacity, 10);
  if (isNaN(numericCapacity) || numericCapacity <= 0) {
    return res.status(400).json({ error: 'Capacity must be a positive number' });
  }

  const numericDuration = parseInt(duration, 10) || 60;

  const db = readDB();
  const newSession = {
    id: Date.now(),
    name,
    coach,
    date,
    startTime,
    endTime,
    duration: numericDuration,
    capacity: numericCapacity,
    bookings: []
  };

  db.sessions.push(newSession);
  writeDB(db);

  res.status(201).json(newSession);
});

// 7. Delete a session (Admin only)
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

// 8. Book a slot in a session (requires login)
app.post('/api/sessions/:id/book', verifyToken, (req, res) => {
  const sessionId = parseInt(req.params.id, 10);
  
  // Use the name + surname of the authenticated logged-in user context
  const name = req.user.name + " " + req.user.surname;

  const db = readDB();
  const session = db.sessions.find(s => s.id === sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  // Capacity validation check
  if (session.bookings.length >= session.capacity) {
    return res.status(400).json({ error: 'Class is fully booked! Cannot exceed capacity.' });
  }

  // Prevent duplicate booking
  const alreadyBooked = session.bookings.some(b => b.name.toLowerCase() === name.toLowerCase());
  if (alreadyBooked) {
    return res.status(400).json({ error: 'already booked' });
  }

  const newBooking = {
    id: Date.now(),
    name: name
  };

  session.bookings.push(newBooking);

  // LOG ACTIVITY HISTORY
  const historyLog = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    user: name,
    action: "Booked class: " + session.name
  };
  db.history.push(historyLog);

  writeDB(db);
  res.json(session);
});

// 9. Cancel a booking (requires login)
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
  
  // Find booking to extract member name for history logging
  const bookingObj = session.bookings.find(b => b.id === parseInt(bookingId, 10));
  if (!bookingObj) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  session.bookings = session.bookings.filter(b => b.id !== parseInt(bookingId, 10));

  // LOG ACTIVITY HISTORY
  const historyLog = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    user: bookingObj.name,
    action: "Cancelled booking in class: " + session.name
  };
  db.history.push(historyLog);

  writeDB(db);
  res.json(session);
});

// 10. Get Activity History (requires login)
app.get('/api/history', verifyToken, (req, res) => {
  const db = readDB();
  res.json(db.history);
});

// 11. Complete a Session (Admin only)
app.post('/api/sessions/:id/complete', verifyAdmin, (req, res) => {
  const sessionId = parseInt(req.params.id, 10);
  const db = readDB();
  const sessionIndex = db.sessions.findIndex(s => s.id === sessionId);

  if (sessionIndex === -1) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const session = db.sessions[sessionIndex];

  // Log to session history
  const historyItem = {
    id: Date.now(),
    name: session.name,
    coach: session.coach,
    date: session.date,
    startTime: session.startTime,
    endTime: session.endTime,
    duration: session.duration,
    status: 'Completed',
    timestamp: new Date().toISOString()
  };

  db.sessionHistory.push(historyItem);
  db.sessions.splice(sessionIndex, 1);
  writeDB(db);

  res.json({ success: true, historyItem });
});

// 12. Cancel a Session (Admin only)
app.post('/api/sessions/:id/cancel-session', verifyAdmin, (req, res) => {
  const sessionId = parseInt(req.params.id, 10);
  const db = readDB();
  const sessionIndex = db.sessions.findIndex(s => s.id === sessionId);

  if (sessionIndex === -1) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const session = db.sessions[sessionIndex];

  // Log to session history
  const historyItem = {
    id: Date.now(),
    name: session.name,
    coach: session.coach,
    date: session.date,
    startTime: session.startTime,
    endTime: session.endTime,
    duration: session.duration,
    status: 'Cancelled',
    timestamp: new Date().toISOString()
  };

  db.sessionHistory.push(historyItem);
  db.sessions.splice(sessionIndex, 1);
  writeDB(db);

  res.json({ success: true, historyItem });
});

// 13. Get Instructors List (Admin only)
app.get('/api/instructors', verifyAdmin, (req, res) => {
  const db = readDB();
  res.json(db.instructors || []);
});

// 14. Add new Instructor (Admin only)
app.post('/api/instructors', verifyAdmin, (req, res) => {
  const { name, specialty } = req.body;
  if (!name || !specialty) {
    return res.status(400).json({ error: 'Name and specialty are required' });
  }

  const db = readDB();
  const newInstructor = {
    id: Date.now(),
    name,
    specialty,
    clockedIn: false,
    lastClockIn: null,
    lastClockOut: null
  };

  db.instructors.push(newInstructor);
  writeDB(db);
  res.status(201).json(newInstructor);
});

// 15. Clock In Instructor (Admin only)
app.post('/api/instructors/:id/clock-in', verifyAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const db = readDB();
  const instructor = db.instructors.find(i => i.id === id);

  if (!instructor) {
    return res.status(404).json({ error: 'Instructor not found' });
  }

  if (instructor.clockedIn) {
    return res.status(400).json({ error: 'Instructor is already clocked in' });
  }

  instructor.clockedIn = true;
  instructor.lastClockIn = new Date().toISOString();

  // Log clocking action
  const clockLog = {
    id: Date.now(),
    name: instructor.name,
    specialty: instructor.specialty,
    action: 'Clocked In',
    timestamp: new Date().toISOString()
  };
  if (!db.clockingHistory) db.clockingHistory = [];
  db.clockingHistory.push(clockLog);

  writeDB(db);
  res.json(instructor);
});

// 16. Clock Out Instructor (Admin only)
app.post('/api/instructors/:id/clock-out', verifyAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const db = readDB();
  const instructor = db.instructors.find(i => i.id === id);

  if (!instructor) {
    return res.status(404).json({ error: 'Instructor not found' });
  }

  if (!instructor.clockedIn) {
    return res.status(400).json({ error: 'Instructor is already clocked out' });
  }

  instructor.clockedIn = false;
  instructor.lastClockOut = new Date().toISOString();

  // Log clocking action
  const clockLog = {
    id: Date.now(),
    name: instructor.name,
    specialty: instructor.specialty,
    action: 'Clocked Out',
    timestamp: new Date().toISOString()
  };
  if (!db.clockingHistory) db.clockingHistory = [];
  db.clockingHistory.push(clockLog);

  writeDB(db);
  res.json(instructor);
});

// 17. Get Session Execution History (Admin only)
app.get('/api/session-history', verifyAdmin, (req, res) => {
  const db = readDB();
  res.json(db.sessionHistory || []);
});

// 18. Get Instructor Clocking History (Admin only)
app.get('/api/clocking-history', verifyAdmin, (req, res) => {
  const db = readDB();
  res.json(db.clockingHistory || []);
});

app.listen(PORT, () => {
  console.log(`Express API Server running on port ${PORT}`);
});
