import { ref } from 'vue';
import { store } from '../store.js';
import { sendMagicLink, signInWithPassword, signUpWithPassword } from '../supabase/auth.js';

export default {
  name: 'LoginView',
  setup() {
    const email = ref('');
    const password = ref('');
    const username = ref('');
    const mode = ref('magic'); // 'magic' | 'signin' | 'signup'
    const busy = ref(false);
    const message = ref('');
    const error = ref('');

    async function submit() {
      error.value = ''; message.value = ''; busy.value = true;
      try {
        if (!store.configured) {
          error.value = 'Supabase is not configured. Edit config.js with your project URL + anon key.';
          return;
        }
        if (mode.value === 'magic') {
          await sendMagicLink(email.value.trim());
          message.value = 'Magic link sent. Check your inbox.';
        } else if (mode.value === 'signin') {
          await signInWithPassword(email.value.trim(), password.value);
        } else {
          await signUpWithPassword(email.value.trim(), password.value, username.value.trim() || null);
          message.value = 'Account created. Check your email to confirm (if confirmation is enabled).';
        }
      } catch (e) {
        error.value = e?.message || String(e);
      } finally {
        busy.value = false;
      }
    }

    return { email, password, username, mode, busy, message, error, submit, store };
  },
  template: `
    <div class="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div class="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div class="flex items-center gap-3 mb-6">
          <div class="w-10 h-10 rounded-md bg-brand-500 text-white font-bold flex items-center justify-center">TT</div>
          <div>
            <div class="font-extrabold text-ink-900 text-lg">Typing Tutor</div>
            <div class="text-xs text-slate-500">Sign in to track your progress.</div>
          </div>
        </div>

        <div v-if="!store.configured" class="mb-4 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs">
          Supabase isn't configured. Open <code>config.js</code> and paste your Project URL and anon public key.
        </div>

        <div class="flex gap-1 mb-4 text-xs">
          <button @click="mode='magic'"  :class="tab(mode==='magic')">Magic Link</button>
          <button @click="mode='signin'" :class="tab(mode==='signin')">Sign In</button>
          <button @click="mode='signup'" :class="tab(mode==='signup')">Sign Up</button>
        </div>

        <form @submit.prevent="submit" class="space-y-3">
          <label class="block">
            <span class="text-xs text-slate-600 font-bold">Email</span>
            <input v-model="email" type="email" required autocomplete="email"
                   class="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-brand-300 focus:border-brand-400" />
          </label>
          <label v-if="mode==='signup'" class="block">
            <span class="text-xs text-slate-600 font-bold">Username (optional)</span>
            <input v-model="username" type="text"
                   class="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-brand-300 focus:border-brand-400" />
          </label>
          <label v-if="mode!=='magic'" class="block">
            <span class="text-xs text-slate-600 font-bold">Password</span>
            <input v-model="password" type="password" required
                   class="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-brand-300 focus:border-brand-400" />
          </label>

          <button type="submit" :disabled="busy"
                  class="w-full py-2.5 rounded-md bg-brand-500 hover:bg-brand-600 text-white font-bold disabled:opacity-60">
            {{ busy ? 'Working…' : submitLabel }}
          </button>
        </form>

        <div v-if="message" class="mt-3 text-xs text-brand-700">{{ message }}</div>
        <div v-if="error"   class="mt-3 text-xs text-red-600">{{ error }}</div>
      </div>
    </div>
  `,
  computed: {
    submitLabel() {
      return { magic: 'Send magic link', signin: 'Sign in', signup: 'Create account' }[this.mode];
    },
  },
  methods: {
    tab(active) {
      const base = 'flex-1 py-1.5 rounded-md font-bold border';
      return active
        ? `${base} bg-brand-50 text-brand-700 border-brand-200`
        : `${base} bg-white text-slate-500 border-slate-200 hover:bg-slate-50`;
    },
  },
};
