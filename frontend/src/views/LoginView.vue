<template>
  <div class="auth-page">
    <div class="auth-card card">
      <div class="card-header" style="justify-content:center">
        <span class="card-title" style="font-size:1.15rem">Sign in to TimeSlot</span>
      </div>
      <form class="card-body" @submit.prevent="submit">
        <div v-if="error" class="alert alert-error">{{ error }}</div>

        <div class="form-group">
          <label class="form-label">Username</label>
          <input v-model="form.username" class="form-control" autocomplete="username" required autofocus />
        </div>

        <div class="form-group">
          <label class="form-label">Password</label>
          <input v-model="form.password" type="password" class="form-control" autocomplete="current-password" required />
        </div>

        <button type="submit" class="btn btn-primary" style="width:100%" :disabled="loading">
          <span v-if="loading" class="spinner" style="width:14px;height:14px;border-width:2px"></span>
          Sign in
        </button>

        <p class="auth-footer">
          Don't have an account? <router-link to="/register">Register</router-link>
        </p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { api } from '../api';
import { auth } from '../auth';

const router = useRouter();
const route  = useRoute();

const form    = ref({ username: '', password: '' });
const error   = ref('');
const loading = ref(false);

async function submit() {
  error.value   = '';
  loading.value = true;
  try {
    const { token, user } = await api.login(form.value);
    auth.login(token, user);
    router.push(route.query.redirect || '/');
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
