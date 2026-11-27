<template>
  <div class="app-layout">
    <nav class="navbar">
      <router-link to="/" class="navbar-brand">TimeSlot</router-link>
      <div class="navbar-links">
        <router-link to="/" class="nav-link">Home</router-link>
        <router-link to="/tools" class="nav-link">Tools</router-link>
        <router-link to="/reservations" class="nav-link">Reservations</router-link>
        <router-link v-if="auth.isAdmin" to="/users" class="nav-link">Users</router-link>
      </div>
      <div class="navbar-user" v-if="auth.isLoggedIn">
        <router-link to="/profile" class="user-chip">
          <span class="user-avatar">{{ auth.user.username[0].toUpperCase() }}</span>
          {{ auth.user.username }}
          <span v-if="auth.isAdmin" class="badge badge-blue" style="margin-left:0.3rem">admin</span>
        </router-link>
        <button class="btn btn-sm btn-outline" @click="logout">Logout</button>
      </div>
    </nav>
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { auth } from './auth';
import { useRouter } from 'vue-router';

const router = useRouter();

function logout() {
  auth.logout();
  router.push('/login');
}
</script>

<style scoped>
.navbar-user { margin-left: auto; display: flex; align-items: center; gap: 0.75rem; }
.user-chip {
  display: flex; align-items: center; gap: 0.4rem;
  font-size: 0.875rem; font-weight: 500; color: var(--gray-700);
}
.user-avatar {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: var(--primary);
  color: white;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.75rem; font-weight: 700;
}
</style>
