<template>
  <div>
    <div v-if="loading" class="loading-center"><div class="spinner"></div></div>
    <div v-else-if="!tool">
      <div class="alert alert-error">Tool not found.</div>
    </div>
    <div v-else>
      <div class="page-header">
        <div>
          <div class="flex items-center gap-2" style="margin-bottom:0.25rem">
            <router-link to="/tools" class="btn btn-sm btn-ghost" style="padding:0.2rem 0.5rem">← Tools</router-link>
          </div>
          <h1 class="page-title">{{ tool.name }}</h1>
          <p v-if="tool.location" class="page-subtitle">📍 {{ tool.location }}</p>
        </div>
        <button class="btn btn-primary" @click="showForm = true">+ New Reservation</button>
      </div>

      <p v-if="tool.description" class="text-sm" style="color:var(--gray-600); margin-bottom:1.5rem">{{ tool.description }}</p>

      <!-- Date picker -->
      <div class="card" style="margin-bottom:1.25rem">
        <div class="card-header">
          <span class="card-title">Browse Schedule</span>
          <div class="flex items-center gap-2">
            <button class="btn btn-sm btn-outline" @click="shiftWeek(-1)">← Prev</button>
            <span class="text-sm font-medium">{{ weekLabel }}</span>
            <button class="btn btn-sm btn-outline" @click="shiftWeek(1)">Next →</button>
          </div>
        </div>
        <div class="card-body" style="padding:0; overflow-x:auto">
          <div class="week-grid">
            <div
              v-for="day in weekDays"
              :key="day.iso"
              class="day-col"
              :class="{ today: day.iso === todayIso, selected: day.iso === selectedDate }"
              @click="selectedDate = day.iso"
            >
              <div class="day-label">
                <span class="day-name">{{ day.name }}</span>
                <span class="day-num" :class="{ today: day.iso === todayIso }">{{ day.num }}</span>
              </div>
              <div class="day-slots">
                <div
                  v-for="r in reservationsByDate[day.iso] || []"
                  :key="r.id"
                  class="slot-block"
                  :title="`${r.display_name}: ${formatTime(r.start_time)}–${formatTime(r.end_time)}`"
                >
                  <span class="slot-time">{{ formatTime(r.start_time) }}–{{ formatTime(r.end_time) }}</span>
                  <span class="slot-user">{{ r.display_name }}</span>
                </div>
                <div v-if="!reservationsByDate[day.iso]?.length" class="slot-empty">Free</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Reservations for selected date -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Reservations — {{ formatDate(selectedDate) }}</span>
          <span class="badge badge-gray">{{ (reservationsByDate[selectedDate] || []).length }} bookings</span>
        </div>
        <div class="card-body" style="padding:0">
          <div v-if="!(reservationsByDate[selectedDate] || []).length" class="empty-state">
            <div class="empty-state-icon">✅</div>
            <div class="empty-state-text">No reservations on this day</div>
          </div>
          <table v-else>
            <thead><tr><th>User</th><th>Start</th><th>End</th><th>Notes</th><th></th></tr></thead>
            <tbody>
              <tr v-for="r in reservationsByDate[selectedDate]" :key="r.id">
                <td class="font-medium">{{ r.display_name }}</td>
                <td>{{ formatDatetime(r.start_time) }}</td>
                <td>{{ formatDatetime(r.end_time) }}</td>
                <td class="text-muted">{{ r.notes || '—' }}</td>
                <td>
                  <button
                    v-if="auth.isAdmin || r.user_name.toLowerCase() === auth.user?.username?.toLowerCase()"
                    class="btn btn-sm btn-ghost" style="color:var(--danger)"
                    @click="confirmCancel(r)"
                  >Cancel</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- New Reservation Modal -->
    <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">Reserve {{ tool?.name }}</span>
          <button class="btn btn-sm btn-ghost" @click="showForm = false">✕</button>
        </div>
        <div class="modal-body">
          <ReservationForm :tools="tool ? [tool] : []" :default-tool-id="tool?.id" :default-date="selectedDate" @created="onCreated" />
        </div>
      </div>
    </div>

    <!-- Cancel Confirm -->
    <div v-if="cancelTarget" class="modal-overlay" @click.self="cancelTarget = null">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">Cancel Reservation</span>
          <button class="btn btn-sm btn-ghost" @click="cancelTarget = null">✕</button>
        </div>
        <div class="modal-body">
          <p>Cancel reservation for <strong>{{ cancelTarget.display_name }}</strong> on {{ formatDatetime(cancelTarget.start_time) }}?</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="cancelTarget = null">Keep</button>
          <button class="btn btn-danger" :disabled="cancelling" @click="doCancel">
            <span v-if="cancelling" class="spinner" style="width:14px;height:14px;border-width:2px"></span>
            Cancel Reservation
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '../api';
import { auth } from '../auth';
import ReservationForm from '../components/ReservationForm.vue';

const route = useRoute();
const tool = ref(null);
const reservations = ref([]);
const loading = ref(true);
const showForm = ref(false);
const cancelTarget = ref(null);
const cancelling = ref(false);

const todayIso = new Date().toISOString().slice(0, 10);
const selectedDate = ref(todayIso);
const weekOffset = ref(0);

const weekDays = computed(() => {
  const days = [];
  const base = new Date();
  base.setDate(base.getDate() + weekOffset.value * 7);
  // Start from Monday
  const dow = (base.getDay() + 6) % 7;
  base.setDate(base.getDate() - dow);
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    days.push({
      iso: d.toISOString().slice(0, 10),
      name: dayNames[i],
      num: d.getDate()
    });
  }
  return days;
});

const weekLabel = computed(() => {
  const first = weekDays.value[0];
  const last = weekDays.value[6];
  const f = new Date(first.iso);
  const l = new Date(last.iso);
  return `${f.toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${l.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`;
});

const reservationsByDate = computed(() => {
  const map = {};
  for (const r of reservations.value) {
    const d = r.start_time.slice(0, 10);
    if (!map[d]) map[d] = [];
    map[d].push(r);
  }
  return map;
});

function shiftWeek(n) { weekOffset.value += n; }

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function formatDatetime(iso) {
  return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function formatDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

async function load() {
  loading.value = true;
  try {
    const [t, r] = await Promise.all([
      api.getTool(route.params.id),
      api.getReservations({ tool_id: route.params.id })
    ]);
    tool.value = t;
    reservations.value = r;
  } catch {
    tool.value = null;
  } finally {
    loading.value = false;
  }
}

function confirmCancel(r) { cancelTarget.value = r; }

async function doCancel() {
  cancelling.value = true;
  try {
    await api.deleteReservation(cancelTarget.value.id);
    cancelTarget.value = null;
    await load();
  } finally {
    cancelling.value = false;
  }
}

function onCreated() { showForm.value = false; load(); }

onMounted(load);
</script>

<style scoped>
.week-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  min-width: 600px;
  border-right: 1px solid var(--gray-100);
}
.day-col {
  border-right: 1px solid var(--gray-100);
  cursor: pointer;
  transition: background 0.1s;
  min-height: 120px;
}
.day-col:last-child { border-right: none; }
.day-col:hover { background: var(--gray-50); }
.day-col.selected { background: var(--primary-light); }
.day-label {
  padding: 0.5rem;
  text-align: center;
  border-bottom: 1px solid var(--gray-100);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.day-name { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; color: var(--gray-500); }
.day-num {
  font-size: 1rem;
  font-weight: 600;
  color: var(--gray-700);
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%;
}
.day-num.today { background: var(--primary); color: white; }
.day-slots { padding: 0.4rem; display: flex; flex-direction: column; gap: 0.25rem; }
.slot-block {
  background: var(--primary);
  color: white;
  border-radius: 4px;
  padding: 0.25rem 0.4rem;
  font-size: 0.7rem;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.slot-time { font-weight: 600; }
.slot-user { opacity: 0.85; }
.slot-empty { font-size: 0.72rem; color: var(--gray-300); text-align: center; padding: 0.5rem 0; }
</style>
