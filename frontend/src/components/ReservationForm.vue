<template>
  <form @submit.prevent="submit">
    <div style="display:flex; flex-direction:column; gap:0.875rem">
      <div v-if="error" class="alert alert-error">{{ error }}</div>
      <div v-if="success" class="alert alert-success">Reservation created!</div>

      <div class="form-group">
        <label class="form-label">Tool *</label>
        <select v-model="form.tool_id" class="form-control" :class="{ error: fieldError('tool_id') }" required>
          <option value="">Select a tool…</option>
          <option v-for="t in tools" :key="t.id" :value="t.id">{{ t.name }}</option>
        </select>
        <span v-if="fieldError('tool_id')" class="form-error">Required</span>
      </div>

      <div class="form-group">
        <label class="form-label">Reserving as</label>
        <div class="form-control" style="background:var(--gray-50); color:var(--gray-600); cursor:default">
          {{ auth.displayName }}
        </div>
      </div>

      <div :class="compact ? '' : 'form-row'">
        <div class="form-group">
          <label class="form-label">Start *</label>
          <input type="datetime-local" v-model="form.start_time" class="form-control" :class="{ error: fieldError('start_time') }" required />
          <span v-if="fieldError('start_time')" class="form-error">Required</span>
        </div>
        <div class="form-group">
          <label class="form-label">End *</label>
          <input type="datetime-local" v-model="form.end_time" class="form-control" :class="{ error: fieldError('end_time') }" :min="form.start_time" required />
          <span v-if="fieldError('end_time')" class="form-error">Must be after start</span>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Notes</label>
        <textarea v-model="form.notes" class="form-control" rows="2" placeholder="Optional notes…"></textarea>
      </div>

      <button type="submit" class="btn btn-primary" :disabled="saving" style="align-self:flex-start">
        <span v-if="saving" class="spinner" style="width:14px;height:14px;border-width:2px"></span>
        Reserve
      </button>
    </div>
  </form>
</template>

<script setup>
import { ref, watch } from 'vue';
import { api } from '../api';
import { auth } from '../auth';

const props = defineProps({
  tools: { type: Array, default: () => [] },
  defaultToolId: { type: Number, default: null },
  defaultDate: { type: String, default: null },
  compact: { type: Boolean, default: false }
});

const emit = defineEmits(['created']);

const saving = ref(false);
const error = ref('');
const success = ref(false);
const submitted = ref(false);

function defaultStart() {
  const base = props.defaultDate ? new Date(props.defaultDate + 'T09:00') : new Date();
  base.setMinutes(0, 0, 0);
  if (!props.defaultDate) base.setHours(base.getHours() + 1);
  return toLocal(base);
}

function defaultEnd() {
  const base = props.defaultDate ? new Date(props.defaultDate + 'T10:00') : new Date();
  base.setMinutes(0, 0, 0);
  if (!props.defaultDate) base.setHours(base.getHours() + 2);
  return toLocal(base);
}

function toLocal(date) {
  const off = date.getTimezoneOffset() * 60000;
  return new Date(date - off).toISOString().slice(0, 16);
}

const form = ref({
  tool_id: props.defaultToolId || '',
  start_time: defaultStart(),
  end_time: defaultEnd(),
  notes: ''
});

watch(() => props.defaultToolId, (v) => { if (v) form.value.tool_id = v; });
watch(() => props.defaultDate, (d) => {
  if (d) {
    form.value.start_time = d + 'T09:00';
    form.value.end_time = d + 'T10:00';
  }
});

function fieldError(field) {
  if (!submitted.value) return false;
  if (field === 'tool_id') return !form.value.tool_id;
  if (field === 'start_time') return !form.value.start_time;
  if (field === 'end_time') return !form.value.end_time || form.value.end_time <= form.value.start_time;
  return false;
}

async function submit() {
  submitted.value = true;
  error.value = '';
  success.value = false;

  if (!form.value.tool_id || !form.value.start_time || !form.value.end_time) return;
  if (form.value.end_time <= form.value.start_time) return;

  saving.value = true;
  try {
    await api.createReservation({
      tool_id: form.value.tool_id,
      start_time: new Date(form.value.start_time).toISOString(),
      end_time: new Date(form.value.end_time).toISOString(),
      notes: form.value.notes || null
    });
    success.value = true;
    submitted.value = false;
    form.value.notes = '';
    emit('created');
    setTimeout(() => { success.value = false; }, 3000);
  } catch (e) {
    error.value = e.message;
  } finally {
    saving.value = false;
  }
}
</script>
