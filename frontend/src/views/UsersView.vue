<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Users</h1>
        <p class="page-subtitle">Manage user accounts</p>
      </div>
    </div>

    <div v-if="loading" class="loading-center"><div class="spinner"></div></div>

    <div v-else class="card">
      <table class="table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Full Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Joined</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td style="font-weight:500">{{ user.username }}</td>
            <td>{{ user.fullName || '—' }}</td>
            <td>{{ user.email || '—' }}</td>
            <td>
              <span v-if="user.isAdmin" class="badge badge-blue">admin</span>
              <span v-else class="badge badge-gray">user</span>
            </td>
            <td class="text-muted text-sm">{{ fmtDate(user.createdAt) }}</td>
            <td>
              <div class="flex gap-2" style="justify-content:flex-end">
                <button class="btn btn-sm btn-ghost" @click="openEdit(user)">Edit</button>
                <button class="btn btn-sm btn-ghost" @click="openPassword(user)">Password</button>
                <button
                  class="btn btn-sm btn-ghost"
                  style="color:var(--danger)"
                  :disabled="user.id === auth.user.id"
                  @click="confirmDelete(user)"
                >Delete</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Edit modal -->
    <div v-if="editTarget" class="modal-overlay" @click.self="editTarget = null">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">Edit @{{ editTarget.username }}</span>
          <button class="btn btn-sm btn-ghost" @click="editTarget = null">✕</button>
        </div>
        <form @submit.prevent="submitEdit">
          <div class="modal-body">
            <div v-if="editError" class="alert alert-error">{{ editError }}</div>
            <div class="form-group">
              <label class="form-label">Full Name</label>
              <input v-model="editForm.fullName" class="form-control" placeholder="Jane Smith" />
            </div>
            <div class="form-group">
              <label class="form-label">Email</label>
              <input v-model="editForm.email" type="email" class="form-control" placeholder="jane@example.com" />
            </div>
            <div class="form-group">
              <label class="form-label">
                <input type="checkbox" v-model="editForm.isAdmin" :disabled="editTarget.id === auth.user.id" />
                Administrator
              </label>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" @click="editTarget = null">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="editSaving">
              <span v-if="editSaving" class="spinner" style="width:14px;height:14px;border-width:2px"></span>
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Password modal -->
    <div v-if="pwTarget" class="modal-overlay" @click.self="pwTarget = null">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">Set Password — @{{ pwTarget.username }}</span>
          <button class="btn btn-sm btn-ghost" @click="pwTarget = null">✕</button>
        </div>
        <form @submit.prevent="submitPassword">
          <div class="modal-body">
            <div v-if="pwError" class="alert alert-error">{{ pwError }}</div>
            <div class="form-group">
              <label class="form-label">New Password</label>
              <input v-model="pwForm.newPassword" type="password" class="form-control" autocomplete="new-password" required />
            </div>
            <div class="form-group">
              <label class="form-label">Confirm Password</label>
              <input v-model="pwForm.confirm" type="password" class="form-control" autocomplete="new-password" required />
              <span v-if="pwSubmitted && pwForm.newPassword !== pwForm.confirm" class="form-error">Passwords do not match</span>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" @click="pwTarget = null">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="pwSaving">
              <span v-if="pwSaving" class="spinner" style="width:14px;height:14px;border-width:2px"></span>
              Set Password
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete confirm modal -->
    <div v-if="deleteTarget" class="modal-overlay" @click.self="deleteTarget = null">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">Delete User</span>
          <button class="btn btn-sm btn-ghost" @click="deleteTarget = null">✕</button>
        </div>
        <div class="modal-body">
          <p>Are you sure you want to delete <strong>{{ deleteTarget.username }}</strong>?
          Their reservations will remain but will show the username only.</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="deleteTarget = null">Cancel</button>
          <button class="btn btn-danger" :disabled="deleteSaving" @click="doDelete">
            <span v-if="deleteSaving" class="spinner" style="width:14px;height:14px;border-width:2px"></span>
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../api';
import { auth } from '../auth';

const users   = ref([]);
const loading = ref(true);

// Edit
const editTarget = ref(null);
const editForm   = ref({ fullName: '', email: '', isAdmin: false });
const editError  = ref('');
const editSaving = ref(false);

// Password
const pwTarget    = ref(null);
const pwForm      = ref({ newPassword: '', confirm: '' });
const pwError     = ref('');
const pwSaving    = ref(false);
const pwSubmitted = ref(false);

// Delete
const deleteTarget = ref(null);
const deleteSaving = ref(false);

async function load() {
  loading.value = true;
  try { users.value = await api.getUsers(); }
  finally { loading.value = false; }
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function openEdit(user) {
  editTarget.value = user;
  editForm.value   = { fullName: user.fullName || '', email: user.email || '', isAdmin: user.isAdmin };
  editError.value  = '';
}

async function submitEdit() {
  editError.value  = '';
  editSaving.value = true;
  try {
    await api.updateUser(editTarget.value.id, editForm.value);
    editTarget.value = null;
    await load();
  } catch (e) {
    editError.value = e.message;
  } finally {
    editSaving.value = false;
  }
}

function openPassword(user) {
  pwTarget.value    = user;
  pwForm.value      = { newPassword: '', confirm: '' };
  pwError.value     = '';
  pwSubmitted.value = false;
}

async function submitPassword() {
  pwSubmitted.value = true;
  if (pwForm.value.newPassword !== pwForm.value.confirm) return;
  pwError.value  = '';
  pwSaving.value = true;
  try {
    await api.setUserPassword(pwTarget.value.id, { newPassword: pwForm.value.newPassword });
    pwTarget.value = null;
  } catch (e) {
    pwError.value = e.message;
  } finally {
    pwSaving.value = false;
  }
}

function confirmDelete(user) { deleteTarget.value = user; }

async function doDelete() {
  deleteSaving.value = true;
  try {
    await api.deleteUser(deleteTarget.value.id);
    deleteTarget.value = null;
    await load();
  } finally {
    deleteSaving.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.table th { text-align: left; padding: 0.6rem 1rem; border-bottom: 2px solid var(--gray-200); color: var(--gray-500); font-weight: 600; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.04em; }
.table td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--gray-100); vertical-align: middle; }
.table tbody tr:last-child td { border-bottom: none; }
.badge-gray { background: var(--gray-100); color: var(--gray-600); }
</style>
