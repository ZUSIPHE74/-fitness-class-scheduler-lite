<template>
  <div class="container">
    
    <!-- Title Section -->
    <div class="header">
      <h1>FlexZone Fitness Scheduler</h1>
      <p>Easy class bookings and management</p>
      
      <!-- Logged In User Info -->
      <div v-if="token" class="user-badge">
        <span>Logged in as: <strong>{{ name }}</strong> ({{ role }})</span>
        <button @click="logout" class="btn-logout">Logout</button>
      </div>
    </div>

    <!-- Offline Fallback Banner -->
    <div v-if="offlineMode" class="offline-banner">
      <span>Offline Mode active (saving to LocalStorage). Start the Node.js server locally to enable database sync.</span>
    </div>

    <!-- Alert Notices (3-second auto-closing pop-up) -->
    <div v-if="alertMessage" :class="alertType" class="alert-box">
      <p>{{ alertMessage }}</p>
      <button @click="alertMessage = null" class="close-alert-btn">Close</button>
    </div>

    <!-- ================= AUTHENTICATION VIEW (Not Logged In) ================= -->
    <div v-if="!token" class="auth-wrapper">
      
      <!-- 1. LOGIN CARD -->
      <div v-if="!forgotPasswordMode" class="auth-card">
        <h2>Member Sign In</h2>
        
        <div class="form-group">
          <label>Username</label>
          <input v-model="loginUsername" type="text" placeholder="e.g. admin or user" class="input-field" />
        </div>
        
        <div class="form-group">
          <label>Password</label>
          <input 
            v-model="loginPassword" 
            type="password" 
            placeholder="e.g. admin123 or user123" 
            class="input-field" 
            @keyup.enter="login"
          />
        </div>
        
        <button @click="login" class="btn-pink-full">Sign In</button>
        
        <div class="auth-helper">
          <button @click="openForgotPassword" class="btn-link">Forgot Password?</button>
        </div>
      </div>

      <!-- 2. FORGOT PASSWORD RECOVERY CARD -->
      <div v-else class="auth-card">
        <h2>Password Recovery</h2>
        
        <!-- Step 1: Input Username -->
        <div v-if="!forgotQuestion">
          <p class="recovery-text">Enter your username to fetch your recovery security question.</p>
          <div class="form-group">
            <label>Username</label>
            <input v-model="forgotUsername" type="text" placeholder="e.g. admin" class="input-field" />
          </div>
          <button @click="getRecoveryQuestion" class="btn-pink-full">Get Question</button>
        </div>

        <!-- Step 2: Answer Security Question -->
        <div v-else-if="!recoveredPassword">
          <p class="recovery-text">Security Question:</p>
          <p class="security-question-prompt"><strong>{{ forgotQuestion }}</strong></p>
          
          <div class="form-group">
            <label>Your Answer</label>
            <input 
              v-model="forgotAnswer" 
              type="text" 
              placeholder="Type your answer" 
              class="input-field" 
              @keyup.enter="verifyRecoveryAnswer"
            />
          </div>
          <button @click="verifyRecoveryAnswer" class="btn-pink-full">Verify Answer</button>
        </div>

        <!-- Step 3: Reveal Password -->
        <div v-else class="recovery-result">
          <p>Security Answer Confirmed!</p>
          <p class="password-reveal">Your password is: <strong>{{ recoveredPassword }}</strong></p>
        </div>

        <!-- Back to Login option -->
        <div class="auth-helper">
          <button @click="closeForgotPassword" class="btn-link">Back to Sign In</button>
        </div>
      </div>

    </div>

    <!-- ================= SCHEDULER APPLICATION VIEW (Logged In) ================= -->
    <div v-else>
      
      <!-- Tab Navigation (Only Admins can toggle between Views) -->
      <div v-if="role === 'admin'" class="tabs">
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

      <!-- USER VIEW (Visible to both Roles, but regular users are locked to it) -->
      <div v-if="currentView === 'user' || role === 'user'">
        <h2>Available Sessions</h2>
        
        <div v-if="sessions.length === 0" class="no-data">
          <p>No classes scheduled yet. Check back later!</p>
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

            <!-- Booking Section (Disappears and toggles to "Booked Class / Cancel Booking" if already booked) -->
            <div v-if="hasBookedSession(session.id)" class="booked-status-container">
              <span class="booked-label">Booked Class</span>
              <button @click="cancelBooking(session.id, getBookingId(session.id))" class="btn-cancel-large">
                Cancel Booking
              </button>
            </div>
            
            <div v-else-if="session.bookings.length < session.capacity" class="booking-form">
              <input 
                v-model="bookingNames[session.id]" 
                type="text" 
                placeholder="Your name" 
                class="input-field" 
              />
              <button @click="bookSession(session.id)" class="btn-pink">Book Class</button>
            </div>
            
            <div v-else class="spots-full-box">
              Class is Full
            </div>
          </div>
        </div>
      </div>

      <!-- ADMIN VIEW (Admin role only) -->
      <div v-if="currentView === 'admin' && role === 'admin'">
        <div class="admin-layout">
          
          <!-- Add Class Form -->
          <div class="admin-card">
            <h3>Schedule New Class</h3>
            <div class="form-group">
              <label>Class Name</label>
              <input v-model="newSession.name" type="text" placeholder="e.g. Yoga Flow" class="input-field" />
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
                  
                  <!-- Registered Trainees (Shown ONLY on Admin Side) -->
                  <div v-if="session.bookings.length > 0" class="admin-trainees">
                    <span class="trainee-title">Registered Trainees:</span>
                    <span v-for="(booking, idx) in session.bookings" :key="booking.id" class="trainee-name">
                      {{ booking.name }}{{ idx &lt; session.bookings.length - 1 ? ', ' : '' }}
                    </span>
                  </div>
                </div>
                <button @click="deleteSession(session.id)" class="btn-delete">Delete</button>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>

  </div>
</template>

<script>
// Mock accounts for offline fallback
const OFFLINE_ACCOUNTS = {
  admin: { password: "admin123", role: "admin", name: "System Admin", token: "token-admin-123", question: "What is our fitness brand name?", answer: "flexzone" },
  user: { password: "user123", role: "user", name: "Regular Member", token: "token-user-123", question: "What is the primary color of our theme?", answer: "pink" }
};

export default {
  data() {
    return {
      // Session/Role Authentication states
      token: sessionStorage.getItem("token") || null,
      role: sessionStorage.getItem("role") || null,
      name: sessionStorage.getItem("name") || null,
      
      // Track session-specific user bookings locally to handle UI toggle
      userBookings: JSON.parse(sessionStorage.getItem("user_bookings")) || {},

      // Connection states
      offlineMode: false,

      // Login Inputs
      loginUsername: "",
      loginPassword: "",

      // Forgot Password State
      forgotPasswordMode: false,
      forgotUsername: "",
      forgotQuestion: null,
      forgotAnswer: "",
      recoveredPassword: null,

      // App states
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
      alertTimeout: null,
      apiBase: "http://localhost:3001/api"
    };
  },

  computed: {
    totalSessions() {
      return this.sessions.length;
    },
    totalBookings() {
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
    this.checkConnection();
  },

  methods: {
    // Check if Express server is online; otherwise fallback to offline mode
    checkConnection() {
      fetch(this.apiBase + "/sessions")
        .then(() => {
          this.offlineMode = false;
          if (this.token) {
            this.fetchSessions();
          }
        })
        .catch(() => {
          this.offlineMode = true;
          this.loadOfflineSessions();
        });
    },

    // Return standard authorization headers
    authHeaders() {
      return {
        "Authorization": "Bearer " + this.token,
        "Content-Type": "application/json"
      };
    },

    // Show alert messages (closes automatically in 3 seconds)
    showAlert(msg, type) {
      this.alertMessage = msg;
      this.alertType = type;

      if (this.alertTimeout) {
        clearTimeout(this.alertTimeout);
      }

      this.alertTimeout = setTimeout(() => {
        this.alertMessage = null;
      }, 3000);
    },

    // Format date simply
    formatDate(dateStr) {
      if (!dateStr) return "";
      const date = new Date(dateStr);
      return date.toDateString();
    },

    // Check if the current browser session has booked a specific class
    hasBookedSession(sessionId) {
      const booking = this.userBookings[sessionId];
      if (!booking) return false;

      // Verify that the booking actually still exists in the session payload
      const session = this.sessions.find(s => s.id === sessionId);
      if (!session) return false;

      for (let i = 0; i < session.bookings.length; i++) {
        if (session.bookings[i].id === booking.id) {
          return true;
        }
      }
      return false;
    },

    // Get the booking ID associated with this session's booking
    getBookingId(sessionId) {
      const booking = this.userBookings[sessionId];
      return booking ? booking.id : null;
    },

    // ================= OFFLINE STORAGE HELPERS =================
    loadOfflineSessions() {
      let data = localStorage.getItem("offline_sessions");
      if (!data) {
        const defaults = [
          { id: 1719220000000, name: "Yoga Flow", coach: "Sarah Jenkins", date: "2026-07-01", time: "08:30", capacity: 15, bookings: [{ id: 1, name: "Alice Smith" }] },
          { id: 1719220000001, name: "HIIT Cardio Strength", coach: "Mike Peterson", date: "2026-07-02", time: "17:00", capacity: 20, bookings: [] }
        ];
        localStorage.setItem("offline_sessions", JSON.stringify(defaults));
        this.sessions = defaults;
      } else {
        this.sessions = JSON.parse(data);
      }
    },

    saveOfflineSessions() {
      localStorage.setItem("offline_sessions", JSON.stringify(this.sessions));
    },

    // ================= AUTHENTICATION METHODS =================
    login() {
      if (!this.loginUsername || !this.loginPassword) {
        this.showAlert("Please fill in both fields.", "error");
        return;
      }

      if (this.offlineMode) {
        const account = OFFLINE_ACCOUNTS[this.loginUsername.toLowerCase().trim()];
        if (account && account.password === this.loginPassword) {
          sessionStorage.setItem("token", account.token);
          sessionStorage.setItem("role", account.role);
          sessionStorage.setItem("name", account.name);

          this.token = account.token;
          this.role = account.role;
          this.name = account.name;

          this.loginUsername = "";
          this.loginPassword = "";

          this.loadOfflineSessions();
          this.showAlert("Welcome back, " + this.name + "!", "success");
        } else {
          this.showAlert("Invalid username or password", "error");
        }
        return;
      }

      fetch(this.apiBase + "/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: this.loginUsername,
          password: this.loginPassword
        })
      })
        .then(response => {
          return response.json().then(data => {
            if (!response.ok) {
              throw new Error(data.error || "Login failed");
            }
            return data;
          });
        })
        .then(data => {
          sessionStorage.setItem("token", data.token);
          sessionStorage.setItem("role", data.role);
          sessionStorage.setItem("name", data.name);
          
          this.token = data.token;
          this.role = data.role;
          this.name = data.name;

          this.loginUsername = "";
          this.loginPassword = "";

          this.fetchSessions();
          this.showAlert("Welcome back, " + this.name + "!", "success");
        })
        .catch(err => {
          this.showAlert(err.message, "error");
        });
    },

    logout() {
      sessionStorage.clear();
      this.token = null;
      this.role = null;
      this.name = null;
      this.sessions = [];
      this.userBookings = {};
      this.currentView = "user";
      this.showAlert("Logged out successfully.", "info");
    },

    openForgotPassword() {
      this.forgotPasswordMode = true;
      this.forgotUsername = "";
      this.forgotQuestion = null;
      this.forgotAnswer = "";
      this.recoveredPassword = null;
    },

    closeForgotPassword() {
      this.forgotPasswordMode = false;
    },

    getRecoveryQuestion() {
      if (!this.forgotUsername || this.forgotUsername.trim() === "") {
        this.showAlert("Please enter your username.", "error");
        return;
      }

      if (this.offlineMode) {
        const account = OFFLINE_ACCOUNTS[this.forgotUsername.toLowerCase().trim()];
        if (!account) {
          this.showAlert("Username not found", "error");
        } else {
          this.forgotQuestion = account.question;
          this.forgotAnswer = "";
        }
        return;
      }

      fetch(this.apiBase + "/forgot-password/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: this.forgotUsername })
      })
        .then(response => {
          return response.json().then(data => {
            if (!response.ok) {
              throw new Error(data.error || "Failed to fetch question");
            }
            return data;
          });
        })
        .then(data => {
          this.forgotQuestion = data.question;
          this.forgotAnswer = "";
        })
        .catch(err => {
          this.showAlert(err.message, "error");
        });
    },

    verifyRecoveryAnswer() {
      if (!this.forgotAnswer || this.forgotAnswer.trim() === "") {
        this.showAlert("Please type your answer.", "error");
        return;
      }

      if (this.offlineMode) {
        const account = OFFLINE_ACCOUNTS[this.forgotUsername.toLowerCase().trim()];
        if (account && account.answer === this.forgotAnswer.toLowerCase().trim()) {
          this.recoveredPassword = account.password;
        } else {
          this.showAlert("Incorrect answer to security question", "error");
        }
        return;
      }

      fetch(this.apiBase + "/forgot-password/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: this.forgotUsername,
          answer: this.forgotAnswer
        })
      })
        .then(response => {
          return response.json().then(data => {
            if (!response.ok) {
              throw new Error(data.error || "Incorrect answer");
            }
            return data;
          });
        })
        .then(data => {
          this.recoveredPassword = data.password;
        })
        .catch(err => {
          this.showAlert(err.message, "error");
        });
    },

    // ================= DATA MANIPULATION METHODS =================
    fetchSessions() {
      fetch(this.apiBase + "/sessions", {
        headers: this.authHeaders()
      })
        .then(response => {
          return response.json().then(data => {
            if (!response.ok) {
              throw new Error(data.error || "Failed to load sessions");
            }
            return data;
          });
        })
        .then(data => {
          this.sessions = data;
        })
        .catch(err => {
          console.error(err);
          this.offlineMode = true;
          this.loadOfflineSessions();
        });
    },

    bookSession(sessionId) {
      const name = this.bookingNames[sessionId];
      if (!name || name.trim() === "") {
        this.showAlert("Please enter your name.", "error");
        return;
      }

      const session = this.sessions.find(s => s.id === sessionId);
      if (!session) return;

      // Offline Booking Logic
      if (this.offlineMode) {
        if (session.bookings.length >= session.capacity) {
          this.showAlert("Class is fully booked!", "error");
          return;
        }

        const duplicate = session.bookings.some(b => b.name.toLowerCase() === name.trim().toLowerCase());
        if (duplicate) {
          this.showAlert("Already booked into this session.", "error");
          return;
        }

        const newBookingId = Date.now();
        session.bookings.push({ id: newBookingId, name: name.trim() });
        this.saveOfflineSessions();
        
        // Track the booking for UI toggle
        this.userBookings[sessionId] = { id: newBookingId, name: name.trim() };
        sessionStorage.setItem("user_bookings", JSON.stringify(this.userBookings));

        this.bookingNames[sessionId] = "";
        this.showAlert("Success! Booked for " + name + " in " + session.name + " class.", "success");
        return;
      }

      // Online Booking
      fetch(this.apiBase + "/sessions/" + sessionId + "/book", {
        method: "POST",
        headers: this.authHeaders(),
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
          // Find the new booking in the list
          const latestBooking = updatedSession.bookings.find(b => b.name.toLowerCase() === name.trim().toLowerCase());
          
          // Track the booking locally
          this.userBookings[sessionId] = { id: latestBooking.id, name: name.trim() };
          sessionStorage.setItem("user_bookings", JSON.stringify(this.userBookings));

          this.bookingNames[sessionId] = "";
          this.fetchSessions();
          this.showAlert("Success! Booked for " + name + " in " + session.name + " class.", "success");
        })
        .catch(err => {
          this.showAlert(err.message, "error");
        });
    },

    cancelBooking(sessionId, bookingId) {
      const session = this.sessions.find(s => s.id === sessionId);
      if (!session) return;

      // Offline Cancel Logic
      if (this.offlineMode) {
        session.bookings = session.bookings.filter(b => b.id !== bookingId);
        this.saveOfflineSessions();
        
        // Clear local tracking
        delete this.userBookings[sessionId];
        sessionStorage.setItem("user_bookings", JSON.stringify(this.userBookings));

        this.showAlert("Booking cancelled successfully.", "info");
        return;
      }

      // Online Cancel
      fetch(this.apiBase + "/sessions/" + sessionId + "/cancel-booking", {
        method: "POST",
        headers: this.authHeaders(),
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
          // Clear local tracking
          delete this.userBookings[sessionId];
          sessionStorage.setItem("user_bookings", JSON.stringify(this.userBookings));

          this.fetchSessions();
          this.showAlert("Booking cancelled successfully.", "info");
        })
        .catch(err => {
          this.showAlert(err.message, "error");
        });
    },

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

      const numericCapacity = parseInt(capacity, 10);

      // Offline Creation
      if (this.offlineMode) {
        const newSession = {
          id: Date.now(),
          name: name,
          coach: coach,
          date: date,
          time: time,
          capacity: numericCapacity,
          bookings: []
        };
        this.sessions.push(newSession);
        this.saveOfflineSessions();

        this.newSession.name = "";
        this.newSession.coach = "";
        this.newSession.date = "";
        this.newSession.time = "";
        this.newSession.capacity = "";

        this.showAlert("Class scheduled successfully!", "success");
        return;
      }

      // Online Creation
      fetch(this.apiBase + "/sessions", {
        method: "POST",
        headers: this.authHeaders(),
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
          this.newSession.name = "";
          this.newSession.coach = "";
          this.newSession.date = "";
          this.newSession.time = "";
          this.newSession.capacity = "";
          
          this.fetchSessions();
          this.showAlert("Class scheduled successfully!", "success");
        })
        .catch(err => {
          this.showAlert(err.message, "error");
        });
    },

    deleteSession(sessionId) {
      const confirmDelete = confirm("Are you sure you want to delete this class?");
      if (!confirmDelete) {
        return;
      }

      // Offline Deletion
      if (this.offlineMode) {
        this.sessions = this.sessions.filter(s => s.id !== sessionId);
        this.saveOfflineSessions();
        this.showAlert("Class deleted successfully.", "info");
        return;
      }

      // Online Deletion
      fetch(this.apiBase + "/sessions/" + sessionId, {
        method: "DELETE",
        headers: this.authHeaders()
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
          this.fetchSessions();
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
/* Global styles using only named colors (black, white, pink, hotpink, gray, red, green, blue) */
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

/* Calendar & Clock Input Indicators Fix (WebKit browser dark-mode visibility) */
input[type="date"]::-webkit-calendar-picker-indicator,
input[type="time"]::-webkit-calendar-picker-indicator {
  filter: invert(1);
  cursor: pointer;
}

/* Offline Mode Warning Banner */
.offline-banner {
  background-color: yellow;
  color: black;
  text-align: center;
  padding: 10px;
  font-weight: bold;
  font-size: 13px;
  margin-bottom: 20px;
  border: 2px solid white;
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

/* User Badge Header Info */
.user-badge {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 15px;
  padding: 8px 15px;
  background-color: black;
  border: 1px solid pink;
  font-size: 13px;
}

.btn-logout {
  background-color: red;
  color: white;
  border: none;
  padding: 4px 10px;
  cursor: pointer;
  font-weight: bold;
}

.btn-logout:hover {
  background-color: white;
  color: black;
}

/* Auth Cards (Login & Forgot Password) */
.auth-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 40px;
}

.auth-card {
  width: 100%;
  max-width: 400px;
  border: 2px solid pink;
  padding: 30px 20px;
  background-color: black;
}

.auth-card h2 {
  color: hotpink;
  margin-top: 0;
  margin-bottom: 25px;
  text-align: center;
  border-bottom: 1px solid pink;
  padding-bottom: 10px;
}

.auth-helper {
  margin-top: 20px;
  text-align: center;
}

.btn-link {
  background: transparent;
  color: pink;
  border: none;
  cursor: pointer;
  text-decoration: underline;
  font-size: 13px;
}

.btn-link:hover {
  color: hotpink;
}

.recovery-text {
  font-size: 13px;
  color: lightgray;
  margin-bottom: 15px;
}

.security-question-prompt {
  color: hotpink;
  font-size: 16px;
  margin: 10px 0 20px 0;
  border-left: 3px solid pink;
  padding-left: 10px;
}

.recovery-result {
  text-align: center;
  padding: 15px;
  background-color: black;
  border: 1px dashed pink;
  margin-bottom: 20px;
}

.password-reveal {
  font-size: 16px;
  margin-top: 10px;
}

.password-reveal strong {
  color: hotpink;
  font-size: 18px;
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

/* Booked Status Styling */
.booked-status-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 2px dashed hotpink;
  padding: 10px 15px;
  margin-top: 10px;
  background-color: black;
}

.booked-label {
  color: hotpink;
  font-weight: bold;
  font-size: 14px;
}

.btn-cancel-large {
  background-color: red;
  color: white;
  border: none;
  padding: 8px 15px;
  font-weight: bold;
  cursor: pointer;
}

.btn-cancel-large:hover {
  background-color: white;
  color: black;
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

.spots-full-box {
  background-color: black;
  border: 2px solid red;
  color: red;
  font-weight: bold;
  text-align: center;
  padding: 10px;
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
  display: block;
  margin-bottom: 4px;
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

/* Admin Trainees List (Shown ONLY on Admin Side) */
.admin-trainees {
  margin-top: 6px;
  font-size: 12px;
}

.trainee-title {
  color: hotpink;
  font-weight: bold;
  margin-right: 5px;
}

.trainee-name {
  color: white;
}
</style>