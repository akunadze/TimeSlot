import { createRouter, createWebHistory } from 'vue-router';
import { auth } from '../auth';
import HomeView from '../views/HomeView.vue';
import ToolsView from '../views/ToolsView.vue';
import ToolDetailView from '../views/ToolDetailView.vue';
import ReservationsView from '../views/ReservationsView.vue';
import LoginView from '../views/LoginView.vue';
import RegisterView from '../views/RegisterView.vue';
import ProfileView from '../views/ProfileView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login',    component: LoginView,    meta: { public: true } },
    { path: '/register', component: RegisterView, meta: { public: true } },
    { path: '/profile',  component: ProfileView },
    { path: '/',         component: HomeView },
    { path: '/tools',    component: ToolsView },
    { path: '/tools/:id', component: ToolDetailView },
    { path: '/reservations', component: ReservationsView }
  ]
});

router.beforeEach((to) => {
  if (!to.meta.public && !auth.isLoggedIn) {
    return { path: '/login', query: { redirect: to.fullPath } };
  }
  if (to.meta.public && auth.isLoggedIn) {
    return { path: '/' };
  }
});

export default router;
