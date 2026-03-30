<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Reservations</h1>
        <p class="page-subtitle">View and manage all tool reservations</p>
      </div>
      <button class="btn btn-primary" @click="showForm = true">+ New Reservation</button>
    </div>

    <!-- Filters -->
    <div class="card" style="margin-bottom:1.25rem">
      <div class="card-body" style="padding:0.75rem 1rem">
        <div style="display:flex; gap:0.75rem; flex-wrap:wrap; align-items:flex-end">
          <div class="form-group" style="flex:1; min-width:140px">
            <label class="form-label">Tool</label>
            <select v-model="filter.tool_id" class="form-control">
              <option value="">All Tools</option>
              <option v-for="t in tools" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </div>
          <div class="form-group" style="flex:1; min-width:140px">
            <label class="form-label">Date</label>
            <input type="date" v-model="filter.date" class="form-control" />
          </div>
          <button class="btn btn-outline" @click="clearFilters">Clear</button>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">Results</span>
        <span class="badge badge-gray">{{ reservations.length }} reservation{{ reservations.length !== 1 ? 's' : '' }}</span>
      </div>
      <div class="card-body" style="padding:0">
        <div v-if="loading" class="loading-center"><div class="spinner"></div></div>
        <div v-else-if="reservations.length === 0" class="empty-state">
          <div class="empty-state-icon">📭</div>
          <div class="empty-state-text">No reservations found</div>
        </div>
        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tool</th>
                <th>User</th>
                <th>Date</th>
                <th>Time</th>
                <th>Location</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in reservations" :key="r.id">
                <td>
                  <router-link :to="`/tools/${r.tool_id}`" class="font-medium" style="color:var(--primary)">
                    {{ r.tool_name }}
                  </router-link>
                </td>
                <td class="font-medium">{{ r.display_name }}</td>
                <td class="text-sm">{{ formatDate(r.start_time) }}</td>
                <td class="text-sm text-muted">{{ formatTime(r.start_time) }} – {{ formatTime(r.end_time) }}</td>
                <td class="text-sm text-muted">{{ r.tool_location || '—' }}</td>
                <td class="text-sm text-muted">{{ r.notes || '—' }}</td>
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
          <span class="modal-title">New Reservation</span>
          <button class="btn btn-sm btn-ghost" @click="showForm = false">✕</button>
        </div>
        <div class="modal-body">
          <ReservationForm :tools="tools" @created="onCreated" />
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
          <p>Cancel reservation for <strong>{{ cancelTarget.display_name }}</strong> on <strong>{{ cancelTarget.tool_name }}</strong>?</p>
          <p class="text-sm text-muted" style="margin-top:0.4rem">
            {{ formatDate(cancelTarget.start_time) }}, {{ formatTime(cancelTarget.start_time) }} – {{ formatTime(cancelTarget.end_time) }}
          </p>
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
import { ref, watch, onMounted } from 'vue';
import { api } from '../api';
import { auth } from '../auth';
import ReservationForm from '../components/ReservationForm.vue';

const tools = ref([]);
const reservations = ref([]);
const loading = ref(true);
const showForm = ref(false);
const cancelTarget = ref(null);
const cancelling = ref(false);
const filter = ref({ tool_id: '', date: '' });

async function load() {
  loading.value = true;
  const params = {};
  if (filter.value.tool_id) params.tool_id = filter.value.tool_id;
  if (filter.value.date) params.date = filter.value.date;
  try { reservations.value = await api.getReservations(params); }
  finally { loading.value = false; }
}

watch(filter, load, { deep: true });

function clearFilters() { filter.value = { tool_id: '', date: '' }; }

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function formatDate(iso) {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
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

onMounted(async () => {
  tools.value = await api.getTools();
  await load();
});
</script>
