import { reactive } from 'vue';

const TOKEN_KEY   = 'timeslot_token';
const PROFILE_KEY = 'timeslot_profile';

function parseToken(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

const _savedToken   = localStorage.getItem(TOKEN_KEY);
const _savedProfile = localStorage.getItem(PROFILE_KEY);

const state = reactive({
  token:   _savedToken   || null,
  user:    _savedToken   ? parseToken(_savedToken) : null,
  profile: _savedProfile ? JSON.parse(_savedProfile) : null
});

export const auth = {
  get token()      { return state.token; },
  get user()       { return state.user; },
  get profile()    { return state.profile; },
  get isLoggedIn() { return !!state.user; },
  get isAdmin()    { return state.user?.isAdmin ?? false; },
  // Full name if set, otherwise username — used in reservation displays
  get displayName(){ return state.profile?.fullName || state.user?.username || ''; },

  login(token, profile = null) {
    state.token = token;
    state.user  = parseToken(token);
    localStorage.setItem(TOKEN_KEY, token);
    if (profile) {
      state.profile = profile;
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    }
  },

  setProfile(profile) {
    state.profile = profile;
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  },

  logout() {
    state.token   = null;
    state.user    = null;
    state.profile = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(PROFILE_KEY);
  }
};
