<template>
  <div class="container">
    
    <!-- Title Section -->
    <div class="header">
      <h1>FlexZone Fitness Scheduler</h1>
      <p>Easy class bookings and management</p>
    </div>

    <!-- Tab Navigation -->
    <div class="tabs">
      <button 
        @click="currentView = 'user'" 
        :class="{ active: currentView === 'user' }"
        class="tab-button"
      >
        User Booking Portal
      </button>
      <button 
        @click="currentView = 'admin'" 
        :class="{ active: currentView === 'admin' }"
        class="tab-button"
      >
        Admin Control Center
      </button>
    </div>

    <!-- Stats Panel -->
    <div class="stats-panel">
      <div class="stat-box">
        <h3>Total Classes</h3>
        <p class="stat-number">{{ totalSessions }}</p>
      </div>
      <div class="stat-box">
        <h3>Total Bookings</h3>
        <p class="stat-number">{{ totalBookings }}</p>
      </div>
      <div class="stat-box">
        <h3>Utilization</h3>
        <p class="stat-number">{{ capacityUtilization }}%</p>
      </div>
    </div>

    <!-- Alert Notices -->
    <div v-if="alertMessage" :class="alertType" class="alert-box">
      <p>{{ alertMessage }}</p>
      <button @click="alertMessage = null" class="close-alert-btn">Close</button>
    </div>

    <!-- USER VIEW -->
    <div v-if="currentView === 'user'">
      <h2>Available Sessions</h2>
      
      <div v-if="sessions.length === 0" class="no-data">
        <p>No classes scheduled yet. Please ask the administrator.</p>
      </div>

      <div v-else class="session-list">
        <div v-for="session in sessions" :key="session.id" class="session-card">
          <div class="card-top">
            <span class="class-time">{{ session.time }}</span>
            <span class="class-date">{{ formatDate(session.date) }}</span>
          </div>

          <h3 class="class-title">{{ session.name }}</h3>
          <p class="class-coach">Instructor: <strong>{{ session.coach }}</strong></p>

          <div class="spots-info">
            <p>Booked: {{ session.bookings.length }} / {{ session.capacity }} seats</p>
            <p v-if="session.capacity - session.bookings.length > 0" class="spots-left">
              {{ session.capacity - session.bookings.length }} spots remaining
            </p>
            <p v-else class="spots-full">Class is FULL</p>
          </div>

          <!-- Booking Form -->
          <div v-if="session.bookings.length < session.capacity" class="booking-form">
            <input 
              v-model="bookingNames[session.id]" 
              type="text" 
              placeholder="Your name" 
              class="input-field" 
            />
            <button @click="bookSession(session.id)" class="btn-pink">Book Class</button>
          </div>

          <!-- Roster of Attendees -->
          <div v-if="session.bookings.length > 0" class="roster">
            <h4>Registered Attendees:</h4>
            <ul>
              <li v-for="booking in session.bookings" :key="booking.id">
                {{ booking.name }}
                <button @click="cancelBooking(session.id, booking.id)" class="btn-cancel">
                  Cancel
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- ADMIN VIEW -->
    <div v-if="currentView === 'admin'">
      <div class="admin-layout">
        
        <!-- Add Class Form -->
        <div class="admin-card">
          <h3>Schedule New Class</h3>
          <div class="form-group">
            <label>Class Name</label>
            <input v-model="newSession.name" type="text" placeholder="e.g. Yoga" class="input-field" />
          </div>
          <div class="form-group">
            <label>Instructor</label>
            <input v-model="newSession.coach" type="text" placeholder="e.g. Coach Sarah" class="input-field" />
          </div>
          <div class="form-group">
            <label>Date</label>
            <input v-model="newSession.date" type="date" class="input-field" />
          </div>
          <div class="form-group">
            <label>Time</label>
            <input v-model="newSession.time" type="time" class="input-field" />
          </div>
          <div class="form-group">
            <label>Capacity</label>
            <input v-model="newSession.capacity" type="number" placeholder="e.g. 10" class="input-field" />
          </div>
          <button @click="createSession" class="btn-pink-full">Create Class</button>
        </div>

        <!-- Management List -->
        <div class="admin-card">
          <h3>Manage Classes</h3>
          
          <div v-if="sessions.length === 0" class="no-data">
            <p>No scheduled classes.</p>
          </div>

          <div v-else>
            <div v-for="session in sessions" :key="session.id" class="manage-item">
              <div>
                <strong>{{ session.name }}</strong> (Cap: {{ session.capacity }})<br />
                <span class="manage-meta">{{ session.coach }} | {{ formatDate(session.date) }} at {{ session.time }}</span>
              </div>
              <button @click="deleteSession(session.id)" class="btn-delete">Delete</button>
            </div>
          </div>
        </div>

      </div>
    </div>

  </div>
</template>

<script>
export default {
  data() {
    return {
      currentView: "user",
      sessions: [],
      bookingNames: {}, // stores booking input name per session ID
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
      // Beginner-friendly loop
      let count = 0;
      for (let i = 0; i < this.sessions.length; i++) {
        count = count + this.sessions[i].bookings.length;
      }
      return count;
    },
    capacityUtilization() {
      if (this.sessions.length === 0) {
        return 0;
      }
      let totalCapacity = 0;
      let totalBooked = 0;
      for (let i = 0; i < this.sessions.length; i++) {
        totalCapacity = totalCapacity + this.sessions[i].capacity;
        totalBooked = totalBooked + this.sessions[i].bookings.length;
      }
      if (totalCapacity === 0) {
        return 0;
      }
      return Math.round((totalBooked / totalCapacity) * 100);
    }
  },

  mounted() {
    this.fetchSessions();
  },

  methods: {
    // Show alert messages
    showAlert(msg, type) {
      this.alertMessage = msg;
      this.alertType = type;
    },

    // Format date simply
    formatDate(dateStr) {
      if (!dateStr) return "";
      const date = new Date(dateStr);
      return date.toDateString();
    },

    // Fetch classes from backend
    fetchSessions() {
      fetch(this.apiBase + "/sessions")
        .then(response => {
          if (!response.ok) {
            throw new Error("Could not load sessions");
          }
          return response.json();
        })
        .then(data => {
          this.sessions = data;
        })
        .catch(err => {
          console.error(err);
          this.showAlert("Failed to connect to the backend server. Make sure it is running.", "error");
        });
    },

    // Book a class
    bookSession(sessionId) {
      const name = this.bookingNames[sessionId];
      if (!name || name.trim() === "") {
        this.showAlert("Please enter your name.", "error");
        return;
      }

      fetch(this.apiBase + "/sessions/" + sessionId + "/book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name: name })
      })
        .then(response => {
          return response.json().then(data => {
            if (!response.ok) {
              throw new Error(data.error || "Failed to book");
            }
            return data;
          });
        })
        .then(updatedSession => {
          this.bookingNames[sessionId] = "";
          this.fetchSessions(); // reload list
          this.showAlert("Success! Booked for " + name, "success");
        })
        .catch(err => {
          this.showAlert(err.message, "error");
        });
    },

    // Cancel booking
    cancelBooking(sessionId, bookingId) {
      fetch(this.apiBase + "/sessions/" + sessionId + "/cancel-booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ bookingId: bookingId })
      })
        .then(response => {
          return response.json().then(data => {
            if (!response.ok) {
              throw new Error(data.error || "Failed to cancel");
            }
            return data;
          });
        })
        .then(updatedSession => {
          this.fetchSessions(); // reload list
          this.showAlert("Booking cancelled successfully.", "info");
        })
        .catch(err => {
          this.showAlert(err.message, "error");
        });
    },

    // Create a new session
    createSession() {
      const name = this.newSession.name;
      const coach = this.newSession.coach;
      const date = this.newSession.date;
      const time = this.newSession.time;
      const capacity = this.newSession.capacity;

      if (!name || !coach || !date || !time || !capacity) {
        this.showAlert("Please fill in all inputs.", "error");
        return;
      }

      fetch(this.apiBase + "/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: name,
          coach: coach,
          date: date,
          time: time,
          capacity: capacity
        })
      })
        .then(response => {
          return response.json().then(data => {
            if (!response.ok) {
              throw new Error(data.error || "Failed to create class");
            }
            return data;
          });
        })
        .then(createdSession => {
          // Reset form inputs
          this.newSession.name = "";
          this.newSession.coach = "";
          this.newSession.date = "";
          this.newSession.time = "";
          this.newSession.capacity = "";
          
          this.fetchSessions(); // reload list
          this.showAlert("Class scheduled successfully!", "success");
        })
        .catch(err => {
          this.showAlert(err.message, "error");
        });
    },

    // Delete a session
    deleteSession(sessionId) {
      const confirmDelete = confirm("Are you sure you want to delete this class?");
      if (!confirmDelete) {
        return;
      }

      fetch(this.apiBase + "/sessions/" + sessionId, {
        method: "DELETE"
      })
        .then(response => {
          return response.json().then(data => {
            if (!response.ok) {
              throw new Error(data.error || "Failed to delete");
            }
            return data;
          });
        })
        .then(data => {
          this.fetchSessions(); // reload list
          this.showAlert("Class deleted successfully.", "info");
        })
        .catch(err => {
          this.showAlert(err.message, "error");
        });
    }
  }
};
</script>

<style>
/* Global styles using only named colors (black, white, pink, hotpink, gray, red, green) */
body {
  background-color: black;
  color: white;
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 0;
}

.container {
  max-width: 800px;
  margin: 20px auto;
  padding: 20px;
  background-color: black;
}

/* Header */
.header {
  text-align: center;
  border-bottom: 3px solid pink;
  padding-bottom: 20px;
  margin-bottom: 20px;
}

.header h1 {
  color: hotpink;
  margin: 0;
}

.header p {
  color: white;
  margin-top: 5px;
}

/* Tab Navigation */
.tabs {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.tab-button {
  background-color: black;
  color: pink;
  border: 2px solid pink;
  padding: 10px 20px;
  margin: 0 5px;
  cursor: pointer;
  font-weight: bold;
}

.tab-button:hover {
  background-color: hotpink;
  color: black;
}

.tab-button.active {
  background-color: hotpink;
  color: black;
  border-color: hotpink;
}

/* Stats Panel */
.stats-panel {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.stat-box {
  flex: 1;
  text-align: center;
  border: 2px solid pink;
  padding: 15px;
  margin: 0 5px;
}

.stat-box h3 {
  color: hotpink;
  margin: 0;
  font-size: 14px;
}

.stat-number {
  font-size: 28px;
  font-weight: bold;
  margin: 10px 0 0 0;
}

/* Alert Boxes */
.alert-box {
  padding: 10px;
  margin-bottom: 20px;
  border: 2px solid pink;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.alert-box.success {
  background-color: green;
  color: white;
  border-color: white;
}

.alert-box.error {
  background-color: red;
  color: white;
  border-color: white;
}

.alert-box.info {
  background-color: blue;
  color: white;
  border-color: white;
}

.close-alert-btn {
  background-color: white;
  color: black;
  border: none;
  padding: 5px 10px;
  cursor: pointer;
  font-weight: bold;
}

/* Session Cards */
.session-card {
  border: 2px solid pink;
  padding: 20px;
  margin-bottom: 20px;
  background-color: black;
}

.card-top {
  display: flex;
  justify-content: space-between;
  color: hotpink;
  font-weight: bold;
  margin-bottom: 10px;
}

.class-title {
  color: white;
  margin: 0 0 5px 0;
  font-size: 22px;
}

.class-coach {
  color: lightgray;
  margin: 0 0 15px 0;
}

.spots-info {
  margin-bottom: 15px;
}

.spots-left {
  color: hotpink;
  font-weight: bold;
}

.spots-full {
  color: red;
  font-weight: bold;
}

/* Forms and Inputs */
.booking-form {
  display: flex;
  margin-bottom: 15px;
}

.input-field {
  flex: 1;
  padding: 10px;
  border: 2px solid pink;
  background-color: black;
  color: white;
  margin-right: 10px;
}

.input-field::placeholder {
  color: gray;
}

.btn-pink {
  background-color: hotpink;
  color: black;
  border: none;
  padding: 10px 20px;
  font-weight: bold;
  cursor: pointer;
}

.btn-pink:hover {
  background-color: white;
  color: black;
}

.btn-pink-full {
  background-color: hotpink;
  color: black;
  border: none;
  padding: 10px;
  font-weight: bold;
  cursor: pointer;
  width: 100%;
  margin-top: 10px;
}

.btn-pink-full:hover {
  background-color: white;
  color: black;
}

/* Attendee List Roster */
.roster {
  border-top: 1px solid pink;
  padding-top: 10px;
}

.roster h4 {
  margin: 0 0 5px 0;
  color: hotpink;
}

.roster ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.roster li {
  padding: 5px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid gray;
}

.btn-cancel {
  background-color: black;
  color: red;
  border: 1px solid red;
  padding: 2px 5px;
  cursor: pointer;
}

.btn-cancel:hover {
  background-color: red;
  color: white;
}

/* Admin Panel Layout */
.admin-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.admin-card {
  border: 2px solid pink;
  padding: 20px;
  background-color: black;
}

.admin-card h3 {
  color: hotpink;
  margin-top: 0;
  border-bottom: 1px solid pink;
  padding-bottom: 10px;
}

.form-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 10px;
}

.form-group label {
  color: white;
  margin-bottom: 5px;
  font-size: 12px;
}

.manage-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid pink;
}

.manage-meta {
  font-size: 12px;
  color: lightgray;
}

.btn-delete {
  background-color: red;
  color: white;
  border: none;
  padding: 5px 10px;
  cursor: pointer;
  font-weight: bold;
}

.btn-delete:hover {
  background-color: white;
  color: black;
}

.no-data {
  text-align: center;
  color: gray;
}
</style>