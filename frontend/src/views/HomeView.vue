<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Welcome to TimeSlot</h1>
        <p class="page-subtitle">Reserve time on shared tools and equipment</p>
      </div>
    </div>

    <div class="grid-3" style="margin-bottom: 1.5rem">
      <div class="card">
        <div class="card-body" style="text-align:center; padding: 1.5rem">
          <div style="font-size:2rem; margin-bottom:0.5rem">🔧</div>
          <div style="font-size:1.75rem; font-weight:700; color:var(--primary)">{{ stats.tools }}</div>
          <div class="text-muted text-sm">Available Tools</div>
        </div>
      </div>
      <div class="card">
        <div class="card-body" style="text-align:center; padding: 1.5rem">
          <div style="font-size:2rem; margin-bottom:0.5rem">📅</div>
          <div style="font-size:1.75rem; font-weight:700; color:var(--success)">{{ stats.todayReservations }}</div>
          <div class="text-muted text-sm">Reservations Today</div>
        </div>
      </div>
      <div class="card">
        <div class="card-body" style="text-align:center; padding: 1.5rem">
          <div style="font-size:2rem; margin-bottom:0.5rem">🗓️</div>
          <div style="font-size:1.75rem; font-weight:700; color:var(--warning)">{{ stats.upcomingReservations }}</div>
          <div class="text-muted text-sm">Upcoming (7 days)</div>
        </div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Today's Schedule</span>
          <router-link to="/reservations" class="btn btn-sm btn-outline">View All</router-link>
        </div>
        <div class="card-body" style="padding:0">
          <div v-if="loading" class="loading-center"><div class="spinner"></div></div>
          <div v-else-if="todayReservations.length === 0" class="empty-state">
            <div class="empty-state-icon">✅</div>
            <div class="empty-state-text">No reservations today</div>
          </div>
          <table v-else>
            <thead>
              <tr>
                <th>Tool</th>
                <th>User</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in todayReservations" :key="r.id">
                <td class="font-medium">{{ r.tool_name }}</td>
                <td>{{ r.display_name }}</td>
                <td class="text-sm text-muted">{{ formatTime(r.start_time) }} – {{ formatTime(r.end_time) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Quick Reserve</span>
        </div>
        <div class="card-body">
          <ReservationForm :tools="tools" compact @created="onCreated" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { api } from '../api';
import ReservationForm from '../components/ReservationForm.vue';

const tools = ref([]);
const todayReservations = ref([]);
const allUpcoming = ref([]);
const loading = ref(true);

const today = new Date().toISOString().slice(0, 10);

const stats = computed(() => ({
  tools: tools.value.length,
  todayReservations: todayReservations.value.length,
  upcomingReservations: allUpcoming.value.length
}));

async function load() {
  loading.value = true;
  try {
    const [t, r, upcoming] = await Promise.all([
      api.getTools(),
      api.getReservations({ date: today }),
      api.getReservations()
    ]);
    tools.value = t;
    todayReservations.value = r;
    // Count reservations in the next 7 days
    const now = new Date();
    const week = new Date(now.getTime() + 7 * 86400000);
    allUpcoming.value = upcoming.filter(r => {
      const d = new Date(r.start_time);
      return d >= now && d <= week;
    });
  } finally {
    loading.value = false;
  }
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function onCreated() { load(); }

onMounted(load);
</script>
