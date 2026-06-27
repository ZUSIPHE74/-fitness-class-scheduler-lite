<template>
  <div class="app-container">
    <h1>FlexZone Fitness Scheduler</h1>

    <div class="form-card">
      <h2>Add New Session</h2>

      <input v-model="name" type="text" placeholder="Class Name" />
      <input v-model="coach" type="text" placeholder="Coach Name" />
      <input v-model="date" type="date" />
      <input v-model="time" type="time" />
      <input v-model="capacity" type="number" placeholder="Capacity" />
      <button @click="saveInputs" class="save-btn">Save Session</button>
      <div v-if="inputSaved" class="saved-msg">Inputs Saved!</div>
      <button @click="addSession" class="add-btn">Add Session</button>
    </div>

    <h3>Total Sessions: {{ totalSessions }}</h3>

    <div v-if="sessions.length === 0" class="empty-state">
      No sessions scheduled.
    </div>

    <ul class="session-list" v-else>
      <transition-group name="fade" tag="div">
        <li
          v-for="(session, index) in sessions"
          :key="session.id"
          class="session-item"
        >
          <div>
            <strong>{{ session.name }}</strong> — {{ session.coach }} <br />
            {{ session.date }} at {{ session.time }} | Capacity: {{ session.capacity }}
          </div>

          <button @click="deleteSession(index)" class="delete-btn">
            Delete
          </button>
        </li>
      </transition-group>
    </ul>
  </div>
</template>

<script>
export default {
  data() {
    return {
      name: "",
      coach: "",
      date: "",
      time: "",
      capacity: "",
      inputSaved: false,
      sessions: JSON.parse(localStorage.getItem("sessions")) || [],
    };
  },

  computed: {
    totalSessions() {
      return this.sessions.length;
    },
  },

  methods: {
    saveInputs() {
      if (
        !this.name ||
        !this.coach ||
        !this.date ||
        !this.time ||
        !this.capacity
      ) {
        alert("Please fill in all fields before saving.");
        return;
      }

      this.inputSaved = true;
    },

    addSession() {
      if (!this.inputSaved) {
        alert("Please click 'Save Inputs' first.");
        return;
      }

      this.sessions.push({
        id: Date.now(),
        name: this.name,
        coach: this.coach,
        date: this.date,
        time: this.time,
        capacity: this.capacity,
      });

      this.updateStorage();

      this.name = "";
      this.coach = "";
      this.date = "";
      this.time = "";
      this.capacity = "";
      this.inputSaved = false;
    },

    deleteSession(index) {
      this.sessions.splice(index, 1);
      this.updateStorage();
    },

    updateStorage() {
      localStorage.setItem("sessions", JSON.stringify(this.sessions));
    },
  },
};
</script>

<style>
.app-container {
  max-width: 700px;
  margin: auto;
  padding: 20px;
  text-align: center;
  background: linear-gradient(135deg, lightblue, purple);
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  color: white;
}

.form-card {
  background: white;
  color: black;
  padding: 20px;
  border-radius: 15px;
  margin-bottom: 20px;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.1);
}

input {
  width: 90%;
  padding: 10px;
  margin: 8px 0;
  border-radius: 8px;
  border: 1px solid #ccc;
}


.saved-msg {
  color: green;
  font-weight: bold;
  margin-top: 5px;
}

.add-btn {
  background: green ;
  color: white;
  padding: 10px 15px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 10px;
}

.session-list {
  padding: 0;
}

.session-item {
  background: white;
  color:black;
  padding: 15px;
  margin: 10px 0;
  border-radius: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 3px 8px black;
}
.save-btn {
  background: #007bff;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 10px;
}

.delete-btn {
  background: #ff4444;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
}

.empty-state {
  font-size: 18px;
  margin-top: 20px;
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.5s;
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>