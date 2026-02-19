const CLIENT_ID = '1030435771551-qnikf54b4jhlbdmm4bkhst0io28u11s4.apps.googleusercontent.com';
const API_BASE  = 'https://chess-first10.kengraf.com';

// ── Login ──────────────────────────────────────────────────────────────────
function login() {
    const client = google.accounts.oauth2.initCodeClient({
        client_id:    CLIENT_ID,
        scope:        'openid email profile',
        access_type:  'offline',
        prompt:       'consent',   // forces refresh token to be returned
        callback:     onAuthCode
    });
    client.requestCode();
}

async function onAuthCode(response) {
    // send code to backend to exchange for tokens
    const res = await fetch(`${API_BASE}/api/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ code: response.code })
    });
    const data = await res.json();
    if (data.access_token) {
        saveTokens(data);
        onLoginSuccess(data);
    }
}

// ── Token storage ──────────────────────────────────────────────────────────
function saveTokens(data) {
    // store in memory or cookie — avoid localStorage for security
    window._auth = {
        access_token: data.access_token,
        expires_at:   Date.now() + (data.expires_in * 1000)
    };
    // refresh token lives on the backend, keyed by user
}

// ── Authenticated fetch ────────────────────────────────────────────────────
async function apiFetch(url, options = {}) {
    if (isTokenExpired()) {
        await refreshToken();
    }
    return fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${window._auth.access_token}`
        }
    });
}

function isTokenExpired() {
    return !window._auth || Date.now() >= window._auth.expires_at - 30000; // 30s buffer
}

async function refreshToken() {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method:      'POST',
        credentials: 'include'  // sends cookie with user id
    });
    const data = await res.json();
    if (!data.access_token) throw new Error('Session expired, please log in again');
    saveTokens(data);
}

// ── Logout ─────────────────────────────────────────────────────────────────
async function logout() {
    await fetch(`${API_BASE}/api/auth/logout`, {
        method:      'POST',
        credentials: 'include'
    });
    window._auth = null;
}

function onLoginSuccess(data) {
    console.log('Logged in as', data.email);
    // update your UI here
}