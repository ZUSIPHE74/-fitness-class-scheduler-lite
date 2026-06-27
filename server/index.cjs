const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const DB_PATH = path.join(__dirname, 'database.json');

app.use(cors());
app.use(express.json());

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

// 1. Get all sessions
app.get('/api/sessions', (req, res) => {
  const db = readDB();
  res.json(db.sessions);
});

// 2. Add a new session (Admin Panel feature)
app.post('/api/sessions', (req, res) => {
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

// 3. Delete a session (Admin Panel feature)
app.delete('/api/sessions/:id', (req, res) => {
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

// 4. Book a slot in a session (Logical Feature - Capacity Checking)
app.post('/api/sessions/:id/book', (req, res) => {
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

  // LOGICAL CAPACITY CHECK
  if (session.bookings.length >= session.capacity) {
    return res.status(400).json({ error: 'Class is fully booked! Cannot exceed capacity.' });
  }

  // Prevent duplicate booking for the same person in the same class
  const alreadyBooked = session.bookings.some(b => b.name.toLowerCase() === name.trim().toLowerCase());
  if (alreadyBooked) {
    return res.status(400).json({ error: 'This person is already booked into this session.' });
  }

  const newBooking = {
    id: Date.now(),
    name: name.trim()
  };

  session.bookings.push(newBooking);
  writeDB(db);

  res.json(session);
});

// 5. Cancel a booking
app.post('/api/sessions/:id/cancel-booking', (req, res) => {
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
