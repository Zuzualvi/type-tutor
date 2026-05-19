import { ref } from 'vue';
import { store, refreshUserData, pushToast } from '../store.js';
import { updateProfile } from '../supabase/db.js';

export default {
  name: 'SettingsView',
  setup() {
    const username = ref(store.profile?.username || '');
    const busy = ref(false);

    async function save() {
      busy.value = true;
      try {
        await updateProfile(store.user.id, { username: username.value.trim() || null });
        await refreshUserData();
        pushToast({ type: 'info', title: 'Saved', body: 'Profile updated.' });
      } catch (e) {
        pushToast({ type: 'error', title: 'Save failed', body: e.message });
      } finally {
        busy.value = false;
      }
    }

    return { username, busy, save, store };
  },
  template: `
    <div class="max-w-xl mx-auto space-y-6">
      <h1 class="text-2xl font-extrabold text-ink-900">Settings</h1>
      <div class="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <label class="block">
          <span class="text-xs text-slate-600 font-bold">Username</span>
          <input v-model="username" type="text" maxlength="40"
                 class="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-brand-300 focus:border-brand-400"/>
        </label>
        <div class="text-xs text-slate-500">
          Email: <strong>{{ store.user?.email }}</strong>
        </div>
        <button @click="save" :disabled="busy"
                class="px-4 py-2 rounded-md bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm disabled:opacity-60">
          {{ busy ? 'Saving…' : 'Save changes' }}
        </button>
      </div>

      <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
        Mobile note: typing tutors really need a physical keyboard. On phones, lessons will load but on-screen typing isn't supported.
      </div>
    </div>
  `,
};
