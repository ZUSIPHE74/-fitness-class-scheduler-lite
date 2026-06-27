<template>
  <div class="app-wrapper">
    <header class="app-header">
      <div class="logo-area">
        <div class="logo-badge">FZ</div>
        <h1>FlexZone Fitness</h1>
      </div>
      <div class="view-toggle">
        <button 
          @click="currentView = 'user'" 
          :class="['toggle-btn', { active: currentView === 'user' }]"
        >
          User Booking Portal
        </button>
        <button 
          @click="currentView = 'admin'" 
          :class="['toggle-btn', { active: currentView === 'admin' }]"
        >
          Admin Control Center
        </button>
      </div>
    </header>

    <!-- Stats Dashboard -->
    <section class="stats-dashboard">
      <div class="stat-card">
        <span class="stat-label">Total Sessions</span>
        <span class="stat-value">{{ totalSessions }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Total Bookings</span>
        <span class="stat-value">{{ totalBookings }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Capacity Utilisation</span>
        <span class="stat-value">{{ capacityUtilization }}%</span>
        <div class="progress-bar-container mini">
          <div class="progress-bar" :style="{ width: capacityUtilization + '%' }"></div>
        </div>
      </div>
    </section>

    <!-- Error/Success Alerts -->
    <div v-if="alertMessage" :class="['alert-banner', alertType]">
      <span>{{ alertMessage }}</span>
      <button @click="alertMessage = null" class="close-alert">&times;</button>
    </div>

    <!-- Main Content Area -->
    <main class="main-content">
      
      <!-- USER PORTAL -->
      <section v-if="currentView === 'user'" class="portal-section">
        <div class="section-header">
          <h2>Available Fitness Sessions</h2>
          <p>Book your spot in our upcoming coach-led training classes.</p>
        </div>

        <div v-if="sessions.length === 0" class="empty-state">
          <p>No sessions scheduled. Check back later!</p>
        </div>

        <div v-else class="sessions-grid">
          <div 
            v-for="session in sessions" 
            :key="session.id" 
            class="session-card"
          >
            <div class="session-card-header">
              <span class="class-time">{{ session.time }}</span>
              <span class="class-date">{{ formatDate(session.date) }}</span>
            </div>

            <h3 class="class-title">{{ session.name }}</h3>
            <p class="class-coach">Led by <strong>{{ session.coach }}</strong></p>

            <div class="capacity-info">
              <div class="capacity-stats">
                <span>{{ session.bookings.length }} booked</span>
                <span>{{ session.capacity - session.bookings.length }} spots left</span>
              </div>
              <div class="progress-bar-container">
                <div 
                  :class="['progress-bar', { full: session.bookings.length >= session.capacity }]" 
                  :style="{ width: (session.bookings.length / session.capacity * 100) + '%' }"
                ></div>
              </div>
            </div>

            <!-- Booking form -->
            <div v-if="session.bookings.length < session.capacity" class="booking-box">
              <input 
                v-model="bookingNames[session.id]" 
                type="text" 
                placeholder="Enter your name" 
                class="booking-input"
                @keyup.enter="bookSession(session.id)"
              />
              <button @click="bookSession(session.id)" class="book-btn">Book Seat</button>
            </div>
            <div v-else class="fully-booked-tag">
              Fully Booked
            </div>

            <!-- Attendee roster for users (collapsible/expandable list) -->
            <div class="roster-section" v-if="session.bookings.length > 0">
              <details>
                <summary>Registered Attendees ({{ session.bookings.length }})</summary>
                <ul class="attendee-list">
                  <li v-for="booking in session.bookings" :key="booking.id" class="attendee-item">
                    <span>{{ booking.name }}</span>
                    <button 
                      @click="cancelBooking(session.id, booking.id)" 
                      class="cancel-booking-btn" 
                      title="Cancel Booking"
                    >
                      Cancel
                    </button>
                  </li>
                </ul>
              </details>
            </div>
          </div>
        </div>
      </section>

      <!-- ADMIN CONTROL CENTER -->
      <section v-if="currentView === 'admin'" class="portal-section admin-portal">
        <div class="admin-grid">
          
          <!-- Add new session form -->
          <div class="form-container">
            <div class="card-header">
              <h2>Schedule New Session</h2>
            </div>
            <div class="form-group">
              <label>Class Name</label>
              <input v-model="newSession.name" type="text" placeholder="e.g. Pilates Core Workout" />
            </div>
            <div class="form-group">
              <label>Coach / Instructor</label>
              <input v-model="newSession.coach" type="text" placeholder="e.g. Coach David" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Date</label>
                <input v-model="newSession.date" type="date" />
              </div>
              <div class="form-group">
                <label>Time</label>
                <input v-model="newSession.time" type="time" />
              </div>
            </div>
            <div class="form-group">
              <label>Maximum Capacity</label>
              <input v-model="newSession.capacity" type="number" min="1" placeholder="e.g. 15" />
            </div>
            <button @click="createSession" class="action-btn-primary">Publish Session</button>
          </div>

          <!-- Session management roster -->
          <div class="management-container">
            <div class="card-header">
              <h2>Manage Scheduled Sessions</h2>
            </div>

            <div v-if="sessions.length === 0" class="empty-state">
              <p>No active sessions. Create one on the left!</p>
            </div>

            <table v-else class="management-table">
              <thead>
                <tr>
                  <th>Class Details</th>
                  <th>Coach</th>
                  <th>Date & Time</th>
                  <th>Booked</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="session in sessions" :key="session.id">
                  <td>
                    <div class="table-class-title">{{ session.name }}</div>
                    <div class="table-class-cap">Cap: {{ session.capacity }}</div>
                  </td>
                  <td>{{ session.coach }}</td>
                  <td>
                    <div>{{ formatDate(session.date) }}</div>
                    <div class="table-class-time">{{ session.time }}</div>
                  </td>
                  <td>
                    <span class="table-booked-count" :class="{ 'at-capacity': session.bookings.length >= session.capacity }">
                      {{ session.bookings.length }} / {{ session.capacity }}
                    </span>
                  </td>
                  <td>
                    <button @click="deleteSession(session.id)" class="action-btn-danger">
                      Delete
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </section>

    </main>
  </div>
</template>

<script>
export default {
  data() {
    return {
      currentView: "user",
      sessions: [],
      bookingNames: {}, // stores typed input per session ID
      newSession: {
        name: "",
        coach: "",
        date: "",
        time: "",
        capacity: ""
      },
      alertMessage: null,
      alertType: "info", // "success", "error", "info"
      apiBase: "http://localhost:3001/api"
    };
  },

  computed: {
    totalSessions() {
      return this.sessions.length;
    },
    totalBookings() {
      return this.sessions.reduce((acc, s) => acc + s.bookings.length, 0);
    },
    capacityUtilization() {
      if (this.sessions.length === 0) return 0;
      const totalCapacity = this.sessions.reduce((acc, s) => acc + s.capacity, 0);
      if (totalCapacity === 0) return 0;
      return Math.round((this.totalBookings / totalCapacity) * 100);
    }
  },

  mounted() {
    this.fetchSessions();
  },

  methods: {
    // Utility to show alert notices
    showAlert(msg, type = "info") {
      this.alertMessage = msg;
      this.alertType = type;
      setTimeout(() => {
        if (this.alertMessage === msg) {
          this.alertMessage = null;
        }
      }, 5000);
    },

    // Format date string for nicer UI
    formatDate(dateStr) {
      if (!dateStr) return "";
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    },

    // GET: Fetch sessions
    async fetchSessions() {
      try {
        const response = await fetch(`${this.apiBase}/sessions`);
        if (!response.ok) throw new Error("Could not fetch sessions");
        this.sessions = await response.json();
      } catch (err) {
        console.error(err);
        this.showAlert("Failed to connect to the backend server. Make sure the server is running on port 3001.", "error");
      }
    },

    // POST: Book session
    async bookSession(sessionId) {
      const name = this.bookingNames[sessionId];
      if (!name || name.trim() === "") {
        this.showAlert("Please enter your name to book a session.", "error");
        return;
      }

      try {
        const response = await fetch(`${this.apiBase}/sessions/${sessionId}/book`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to book session");
        }

        // Clean up input field
        this.bookingNames[sessionId] = "";
        
        // Refresh local session object
        const index = this.sessions.findIndex(s => s.id === sessionId);
        if (index !== -1) {
          this.sessions[index] = result;
        }
        
        this.showAlert(`Seat booked successfully for ${name}!`, "success");
      } catch (err) {
        this.showAlert(err.message, "error");
      }
    },

    // POST: Cancel booking
    async cancelBooking(sessionId, bookingId) {
      try {
        const response = await fetch(`${this.apiBase}/sessions/${sessionId}/cancel-booking`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to cancel booking");
        }

        // Refresh local session object
        const index = this.sessions.findIndex(s => s.id === sessionId);
        if (index !== -1) {
          this.sessions[index] = result;
        }

        this.showAlert("Booking successfully cancelled.", "info");
      } catch (err) {
        this.showAlert(err.message, "error");
      }
    },

    // POST: Create session
    async createSession() {
      const { name, coach, date, time, capacity } = this.newSession;

      if (!name || !coach || !date || !time || !capacity) {
        this.showAlert("Please fill in all details for the new session.", "error");
        return;
      }

      try {
        const response = await fetch(`${this.apiBase}/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, coach, date, time, capacity })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to create session");
        }

        // Reset form
        this.newSession = { name: "", coach: "", date: "", time: "", capacity: "" };
        
        // Refresh list
        this.sessions.push(result);
        this.showAlert("New session published successfully!", "success");
      } catch (err) {
        this.showAlert(err.message, "error");
      }
    },

    // DELETE: Remove session
    async deleteSession(sessionId) {
      if (!confirm("Are you sure you want to delete this session? This will remove all bookings for it.")) {
        return;
      }

      try {
        const response = await fetch(`${this.apiBase}/sessions/${sessionId}`, {
          method: "DELETE"
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to delete session");
        }

        this.sessions = this.sessions.filter(s => s.id !== sessionId);
        this.showAlert("Session deleted successfully.", "info");
      } catch (err) {
        this.showAlert(err.message, "error");
      }
    }
  }
};
</script>

<style>
/* Reset & Modern Colors */
:root {
  --bg-primary: #0b0f19;
  --bg-secondary: #131b2e;
  --bg-tertiary: #1b2641;
  --text-main: #f3f4f6;
  --text-muted: #9ca3af;
  --accent-blue: #3b82f6;
  --accent-emerald: #10b981;
  --accent-rose: #f43f5e;
  --border-light: rgba(255, 255, 255, 0.08);
}

body {
  background-color: var(--bg-primary);
  color: var(--text-main);
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  margin: 0;
  padding: 0;
  cursor: default; /* disable portfolio none-cursor inside full-screen frames if any */
}

/* Container Wrapper */
.app-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
}

/* Header Area */
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-light);
  padding-bottom: 24px;
  margin-bottom: 32px;
  flex-wrap: wrap;
  gap: 16px;
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-badge {
  background: linear-gradient(135deg, var(--accent-blue), #8b5cf6);
  color: white;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 18px;
  border-radius: 12px;
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);
}

.logo-area h1 {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.5px;
  margin: 0;
}

/* Toggle Navigation */
.view-toggle {
  display: flex;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: 30px;
  padding: 4px;
}

.toggle-btn {
  background: transparent;
  color: var(--text-muted);
  border: none;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  padding: 10px 22px;
  border-radius: 25px;
  cursor: pointer;
  transition: all 0.25s ease;
}

.toggle-btn.active {
  background-color: var(--accent-blue);
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}

/* Stats Dashboard */
.stats-dashboard {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-label {
  font-size: 13px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 36px;
  font-weight: 700;
  color: var(--text-main);
  line-height: 1;
}

/* Alert Banner */
.alert-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 32px;
  font-size: 14px;
  animation: slideDown 0.3s ease;
}

.alert-banner.success {
  background-color: rgba(16, 185, 129, 0.12);
  border: 1px solid var(--accent-emerald);
  color: #a7f3d0;
}

.alert-banner.error {
  background-color: rgba(244, 63, 94, 0.12);
  border: 1px solid var(--accent-rose);
  color: #fecdd3;
}

.alert-banner.info {
  background-color: rgba(59, 130, 246, 0.12);
  border: 1px solid var(--accent-blue);
  color: #bfdbfe;
}

.close-alert {
  background: transparent;
  color: inherit;
  border: none;
  font-size: 20px;
  cursor: pointer;
}

/* Session Grid / Portal */
.portal-section .section-header {
  margin-bottom: 24px;
}

.portal-section .section-header h2 {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 6px 0;
}

.portal-section .section-header p {
  color: var(--text-muted);
  font-size: 14px;
  margin: 0;
}

.sessions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 24px;
}

.session-card {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.session-card:hover {
  border-color: var(--accent-blue);
  box-shadow: 0 12px 36px rgba(59, 130, 246, 0.1);
}

.session-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 16px;
  text-transform: uppercase;
}

.class-time {
  background-color: var(--bg-tertiary);
  color: var(--accent-blue);
  padding: 6px 12px;
  border-radius: 20px;
}

.class-date {
  color: var(--text-muted);
}

.class-title {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 6px 0;
}

.class-coach {
  font-size: 14px;
  color: var(--text-muted);
  margin: 0 0 24px 0;
}

.capacity-info {
  margin-bottom: 24px;
}

.capacity-stats {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 8px;
  font-weight: 500;
}

.progress-bar-container {
  background-color: var(--bg-tertiary);
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-container.mini {
  height: 4px;
  margin-top: 10px;
}

.progress-bar {
  background: linear-gradient(90deg, var(--accent-blue), #8b5cf6);
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s ease;
}

.progress-bar.full {
  background: var(--accent-rose);
}

/* Booking Box */
.booking-box {
  display: flex;
  gap: 10px;
  margin-top: auto;
}

.booking-input {
  flex: 1;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-light);
  color: var(--text-main);
  padding: 12px 16px;
  border-radius: 10px;
  font-family: inherit;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.booking-input:focus {
  border-color: var(--accent-blue);
}

.book-btn {
  background-color: var(--accent-blue);
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 10px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.book-btn:hover {
  background-color: #2563eb;
}

.fully-booked-tag {
  background-color: rgba(244, 63, 94, 0.1);
  border: 1px solid rgba(244, 63, 94, 0.2);
  color: var(--accent-rose);
  text-align: center;
  padding: 12px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 14px;
  margin-top: auto;
}

/* Collapsible Attendee Roster */
.roster-section {
  margin-top: 16px;
  border-top: 1px solid var(--border-light);
  padding-top: 14px;
}

.roster-section summary {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  outline: none;
}

.roster-section summary:hover {
  color: var(--text-main);
}

.attendee-list {
  list-style: none;
  padding: 8px 0 0 0;
  margin: 0;
}

.attendee-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  padding: 6px 8px;
  background-color: var(--bg-tertiary);
  margin-bottom: 4px;
  border-radius: 6px;
}

.cancel-booking-btn {
  background: transparent;
  color: var(--accent-rose);
  border: none;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  padding: 2px 6px;
}

.cancel-booking-btn:hover {
  text-decoration: underline;
}

/* Admin Grid Layout */
.admin-grid {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 32px;
  align-items: start;
}

@media (max-width: 960px) {
  .admin-grid {
    grid-template-columns: 1fr;
  }
}

.form-container, .management-container {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: 16px;
  padding: 28px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
}

.card-header h2 {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 20px 0;
  border-bottom: 1px solid var(--border-light);
  padding-bottom: 14px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 18px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-group input {
  background-color: var(--bg-primary);
  border: 1px solid var(--border-light);
  color: var(--text-main);
  padding: 12px 16px;
  border-radius: 10px;
  font-family: inherit;
  font-size: 14px;
  outline: none;
}

.form-group input:focus {
  border-color: var(--accent-blue);
}

.action-btn-primary {
  width: 100%;
  background: linear-gradient(135deg, var(--accent-blue), #8b5cf6);
  color: white;
  border: none;
  padding: 14px;
  border-radius: 10px;
  font-family: inherit;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.2);
  transition: all 0.2s ease;
}

.action-btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(59, 130, 246, 0.3);
}

/* Management Table */
.management-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.management-table th, .management-table td {
  padding: 14px;
  border-bottom: 1px solid var(--border-light);
  font-size: 14px;
}

.management-table th {
  color: var(--text-muted);
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
}

.table-class-title {
  font-weight: 700;
}

.table-class-cap {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}

.table-class-time {
  font-size: 12px;
  color: var(--accent-blue);
  margin-top: 2px;
}

.table-booked-count {
  background-color: rgba(16, 185, 129, 0.1);
  color: var(--accent-emerald);
  padding: 4px 8px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 13px;
}

.table-booked-count.at-capacity {
  background-color: rgba(244, 63, 94, 0.1);
  color: var(--accent-rose);
}

.action-btn-danger {
  background-color: rgba(244, 63, 94, 0.1);
  color: var(--accent-rose);
  border: 1px solid rgba(244, 63, 94, 0.2);
  padding: 8px 14px;
  border-radius: 8px;
  font-family: inherit;
  font-weight: 600;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn-danger:hover {
  background-color: var(--accent-rose);
  color: white;
}

.empty-state {
  text-align: center;
  padding: 48px;
  color: var(--text-muted);
}

/* Animations */
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>