<template>
  <div style="max-width:560px">
    <div class="page-header">
      <div>
        <h1 class="page-title">My Profile</h1>
        <p class="page-subtitle">@{{ auth.user?.username }}<span v-if="auth.isAdmin" class="badge badge-blue" style="margin-left:0.5rem">admin</span></p>
      </div>
    </div>

    <div v-if="loadError" class="alert alert-error" style="margin-bottom:1rem">{{ loadError }}</div>

    <!-- Profile Info -->
    <div class="card" style="margin-bottom:1.25rem">
      <div class="card-header"><span class="card-title">Profile Information</span></div>
      <form class="card-body" @submit.prevent="saveProfile">
        <div v-if="profileError"   class="alert alert-error">{{ profileError }}</div>
        <div v-if="profileSuccess" class="alert alert-success">Profile updated.</div>

        <div class="form-group">
          <label class="form-label">Username</label>
          <input :value="auth.user?.username" class="form-control" disabled style="background:var(--gray-50);color:var(--gray-500)" />
        </div>

        <div class="form-group">
          <label class="form-label">Full Name</label>
          <input v-model="profileForm.fullName" class="form-control" placeholder="Jane Smith" />
        </div>

        <div class="form-group">
          <label class="form-label">Email</label>
          <input v-model="profileForm.email" type="email" class="form-control" placeholder="jane@example.com" />
        </div>

        <button type="submit" class="btn btn-primary" :disabled="savingProfile">
          <span v-if="savingProfile" class="spinner" style="width:14px;height:14px;border-width:2px"></span>
          Save Changes
        </button>
      </form>
    </div>

    <!-- Change Password -->
    <div class="card">
      <div class="card-header"><span class="card-title">Change Password</span></div>
      <form class="card-body" @submit.prevent="savePassword">
        <div v-if="passwordError"   class="alert alert-error">{{ passwordError }}</div>
        <div v-if="passwordSuccess" class="alert alert-success">Password changed successfully.</div>

        <div class="form-group">
          <label class="form-label">Current Password</label>
          <input v-model="passwordForm.currentPassword" type="password" class="form-control" autocomplete="current-password" required />
        </div>

        <div class="form-group">
          <label class="form-label">New Password</label>
          <input v-model="passwordForm.newPassword" type="password" class="form-control" autocomplete="new-password" required />
          <span v-if="pwSubmitted && passwordForm.newPassword.length < 4" class="form-error">At least 4 characters</span>
        </div>

        <div class="form-group">
          <label class="form-label">Confirm New Password</label>
          <input v-model="passwordForm.confirmPassword" type="password" class="form-control" autocomplete="new-password" required />
          <span v-if="pwSubmitted && passwordForm.confirmPassword !== passwordForm.newPassword" class="form-error">Passwords do not match</span>
        </div>

        <button type="submit" class="btn btn-primary" :disabled="savingPassword">
          <span v-if="savingPassword" class="spinner" style="width:14px;height:14px;border-width:2px"></span>
          Change Password
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../api';
import { auth } from '../auth';

const loadError = ref('');

const profileForm    = ref({ fullName: '', email: '' });
const profileError   = ref('');
const profileSuccess = ref(false);
const savingProfile  = ref(false);

const passwordForm    = ref({ currentPassword: '', newPassword: '', confirmPassword: '' });
const passwordError   = ref('');
const passwordSuccess = ref(false);
const savingPassword  = ref(false);
const pwSubmitted     = ref(false);

onMounted(async () => {
  try {
    const me = await api.me();
    profileForm.value.fullName = me.fullName || '';
    profileForm.value.email    = me.email    || '';
  } catch (e) {
    loadError.value = e.message;
  }
});

async function saveProfile() {
  profileError.value   = '';
  profileSuccess.value = false;
  savingProfile.value  = true;
  try {
    const updated = await api.updateProfile(profileForm.value);
    auth.setProfile(updated);
    profileSuccess.value = true;
    setTimeout(() => { profileSuccess.value = false; }, 3000);
  } catch (e) {
    profileError.value = e.message;
  } finally {
    savingProfile.value = false;
  }
}

async function savePassword() {
  pwSubmitted.value = true;
  if (passwordForm.value.newPassword.length < 4) return;
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) return;

  passwordError.value   = '';
  passwordSuccess.value = false;
  savingPassword.value  = true;
  try {
    await api.changePassword({
      currentPassword: passwordForm.value.currentPassword,
      newPassword:     passwordForm.value.newPassword
    });
    passwordSuccess.value = true;
    passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' };
    pwSubmitted.value  = false;
    setTimeout(() => { passwordSuccess.value = false; }, 4000);
  } catch (e) {
    passwordError.value = e.message;
  } finally {
    savingPassword.value = false;
  }
}
</script>
