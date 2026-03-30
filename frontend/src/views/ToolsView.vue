<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Tools</h1>
        <p class="page-subtitle">Manage available tools and equipment</p>
      </div>
      <button v-if="auth.isAdmin" class="btn btn-primary" @click="openAdd">+ Add Tool</button>
    </div>

    <div v-if="loading" class="loading-center"><div class="spinner"></div></div>

    <div v-else-if="tools.length === 0" class="card">
      <div class="empty-state">
        <div class="empty-state-icon">🔧</div>
        <div class="empty-state-text">No tools yet. Add your first tool above.</div>
      </div>
    </div>

    <div v-else class="grid-2">
      <router-link v-for="tool in tools" :key="tool.id" :to="`/tools/${tool.id}`" class="card tool-card">
        <div class="card-header">
          <span class="card-title">{{ tool.name }}</span>
          <div class="flex gap-2" v-if="auth.isAdmin">
            <button class="btn btn-sm btn-ghost" @click.prevent.stop="openEdit(tool)">Edit</button>
            <button class="btn btn-sm btn-ghost" style="color:var(--danger)" @click.prevent.stop="confirmDelete(tool)">Delete</button>
          </div>
        </div>
        <div class="card-body">
          <p v-if="tool.description" class="text-sm" style="color:var(--gray-600); margin-bottom:0.5rem">{{ tool.description }}</p>
          <div v-if="tool.location" class="flex items-center gap-2 text-sm text-muted">
            <span>📍</span> {{ tool.location }}
          </div>
        </div>
      </router-link>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">{{ editing ? 'Edit Tool' : 'Add Tool' }}</span>
          <button class="btn btn-sm btn-ghost" @click="closeModal">✕</button>
        </div>
        <form @submit.prevent="submitTool">
          <div class="modal-body">
            <div v-if="formError" class="alert alert-error">{{ formError }}</div>
            <div class="form-group">
              <label class="form-label">Name *</label>
              <input v-model="form.name" class="form-control" :class="{ error: !form.name && submitted }" required />
            </div>
            <div class="form-group">
              <label class="form-label">Description</label>
              <textarea v-model="form.description" class="form-control" rows="2"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Location</label>
              <input v-model="form.location" class="form-control" placeholder="e.g. Lab Room A" />
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" @click="closeModal">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              <span v-if="saving" class="spinner" style="width:14px;height:14px;border-width:2px"></span>
              {{ editing ? 'Save Changes' : 'Add Tool' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirm Modal -->
    <div v-if="deleteTarget" class="modal-overlay" @click.self="deleteTarget = null">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">Delete Tool</span>
          <button class="btn btn-sm btn-ghost" @click="deleteTarget = null">✕</button>
        </div>
        <div class="modal-body">
          <p>Are you sure you want to delete <strong>{{ deleteTarget.name }}</strong>? All reservations for this tool will also be deleted.</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="deleteTarget = null">Cancel</button>
          <button class="btn btn-danger" :disabled="deleting" @click="doDelete">
            <span v-if="deleting" class="spinner" style="width:14px;height:14px;border-width:2px"></span>
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

const tools = ref([]);
const loading = ref(true);
const showModal = ref(false);
const editing = ref(null);
const saving = ref(false);
const deleting = ref(false);
const deleteTarget = ref(null);
const formError = ref('');
const submitted = ref(false);
const form = ref({ name: '', description: '', location: '' });

async function load() {
  loading.value = true;
  try { tools.value = await api.getTools(); }
  finally { loading.value = false; }
}

function openAdd() {
  editing.value = null;
  form.value = { name: '', description: '', location: '' };
  formError.value = '';
  submitted.value = false;
  showModal.value = true;
}

function openEdit(tool) {
  editing.value = tool;
  form.value = { name: tool.name, description: tool.description || '', location: tool.location || '' };
  formError.value = '';
  submitted.value = false;
  showModal.value = true;
}

function closeModal() { showModal.value = false; }

async function submitTool() {
  submitted.value = true;
  formError.value = '';
  saving.value = true;
  try {
    if (editing.value) {
      await api.updateTool(editing.value.id, form.value);
    } else {
      await api.createTool(form.value);
    }
    closeModal();
    await load();
  } catch (e) {
    formError.value = e.message;
  } finally {
    saving.value = false;
  }
}

function confirmDelete(tool) { deleteTarget.value = tool; }

async function doDelete() {
  deleting.value = true;
  try {
    await api.deleteTool(deleteTarget.value.id);
    deleteTarget.value = null;
    await load();
  } finally {
    deleting.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.tool-card {
  display: block;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  transition: box-shadow 0.15s, transform 0.15s;
}
.tool-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  transform: translateY(-1px);
}
</style>
