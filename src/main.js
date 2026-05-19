import { createApp, h, computed, onMounted } from 'vue';
import { store, initAuth } from './store.js';
import { initRouter, currentRoute, navigate, isPublicRoute } from './router.js';

import AppShell   from './components/AppShell.js';
import BadgeToast from './components/BadgeToast.js';

import LoginView     from './views/Login.js';
import HomeView      from './views/Home.js';
import LessonView    from './views/Lesson.js';
import ResultsView   from './views/Results.js';
import DashboardView from './views/Dashboard.js';
import FreeTypeView  from './views/FreeType.js';
import BadgesView    from './views/Badges.js';
import SettingsView  from './views/Settings.js';

const VIEW_BY_NAME = {
  login:     LoginView,
  home:      HomeView,
  lesson:    LessonView,
  results:   ResultsView,
  dashboard: DashboardView,
  freetype:  FreeTypeView,
  badges:    BadgesView,
  settings:  SettingsView,
};

function MobileWarning() {
  return {
    template: `
      <div class="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div class="max-w-md bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm">
          <div class="w-12 h-12 mx-auto rounded-md bg-brand-500 text-white font-bold flex items-center justify-center mb-3">TT</div>
          <h1 class="text-lg font-extrabold text-ink-900">Typing Tutor needs a real keyboard.</h1>
          <p class="text-sm text-slate-600 mt-2">
            Touch typing and on-screen keyboards don't mix. Open this on a laptop or desktop to get started.
          </p>
        </div>
      </div>
    `,
  };
}

const Root = {
  setup() {
    onMounted(async () => {
      initRouter();
      await initAuth();
      // Redirect logic — if logged out and on a private route, send to /login.
      const route = currentRoute.value;
      if (!store.user && !isPublicRoute(route.path)) navigate('/login');
      if (store.user && route.name === 'login')     navigate('/');
    });

    const isMobile = computed(() => {
      const ua = navigator.userAgent || '';
      const touch = ('ontouchstart' in window) && window.innerWidth < 768;
      return /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || touch;
    });

    const view = computed(() => {
      if (!store.ready) return null;
      const r = currentRoute.value;
      if (!store.user && r.name !== 'login') return LoginView;
      if (store.user && r.name === 'login')  return HomeView;
      return VIEW_BY_NAME[r.name] || HomeView;
    });

    return { store, view, isMobile };
  },
  render() {
    if (this.isMobile) return h(MobileWarning());
    if (!this.store.ready) {
      return h('div', { class: 'min-h-screen flex items-center justify-center text-slate-400' }, 'Loading…');
    }
    if (!this.store.user) {
      // Public: login (no AppShell).
      return h('div', {}, [h(LoginView), h(BadgeToast)]);
    }
    return h('div', {}, [
      h(AppShell, {}, { default: () => h(this.view) }),
      h(BadgeToast),
    ]);
  },
};

createApp(Root).mount('#app');
