<template>
  <div class="auth-page">
    <div class="auth-card card">
      <div class="card-header" style="justify-content:center">
        <span class="card-title" style="font-size:1.15rem">Create an account</span>
      </div>
      <form class="card-body" @submit.prevent="submit">
        <div v-if="error" class="alert alert-error">{{ error }}</div>

        <div class="form-group">
          <label class="form-label">Full Name</label>
          <input v-model="form.fullName" class="form-control" autocomplete="name" required autofocus placeholder="Jane Smith" />
          <span class="form-error" v-if="submitted && !form.fullName.trim()">Full name is required</span>
        </div>

        <div class="form-group">
          <label class="form-label">Username</label>
          <input v-model="form.username" class="form-control" autocomplete="username" required />
        </div>

        <div class="form-group">
          <label class="form-label">Password</label>
          <input v-model="form.password" type="password" class="form-control" autocomplete="new-password" required />
          <span class="form-error" v-if="submitted && form.password.length < 8">At least 8 characters</span>
        </div>

        <div class="form-group">
          <label class="form-label">Confirm Password</label>
          <input v-model="form.confirm" type="password" class="form-control" autocomplete="new-password" required />
          <span class="form-error" v-if="submitted && form.confirm !== form.password">Passwords do not match</span>
        </div>

        <button type="submit" class="btn btn-primary" style="width:100%" :disabled="loading">
          <span v-if="loading" class="spinner" style="width:14px;height:14px;border-width:2px"></span>
          Create account
        </button>

        <p class="auth-footer">
          Already have an account? <router-link to="/login">Sign in</router-link>
        </p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api';
import { auth } from '../auth';

const router    = useRouter();
const form      = ref({ fullName: '', username: '', password: '', confirm: '' });
const error     = ref('');
const loading   = ref(false);
const submitted = ref(false);

async function submit() {
  submitted.value = true;
  if (!form.value.fullName.trim()) return;
  if (form.value.password.length < 8) return;
  if (form.value.password !== form.value.confirm) return;

  error.value   = '';
  loading.value = true;
  try {
    const { token, user } = await api.register({
      fullName: form.value.fullName,
      username: form.value.username,
      password: form.value.password
    });
    auth.login(token, user);
    router.push('/');
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.auth-page { display: flex; justify-content: center; padding-top: 3rem; }
.auth-card { width: 100%; max-width: 380px; }
.auth-card .card-body { display: flex; flex-direction: column; gap: 1rem; }
.auth-footer { text-align: center; font-size: 0.875rem; color: var(--gray-500); }
.auth-footer a { color: var(--primary); font-weight: 500; }
</style>
