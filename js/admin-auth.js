// admin-auth.js – Password overlay + Supabase auth
const PASSWORD = 'infected';
let isAuthorized = false;

const overlay = document.getElementById('passwordOverlay');
const passwordInput = document.getElementById('passwordInput');
const unlockBtn = document.getElementById('unlockBtn');
const passwordError = document.getElementById('passwordError');

function tryUnlock() {
  const entered = passwordInput.value.trim();
  if (entered === PASSWORD) {
    isAuthorized = true;
    overlay.classList.add('hidden');
    initializeAdmin();
    addLog('info', 'Admin panel unlocked successfully.');
  } else {
    passwordError.textContent = '❌ Incorrect password. Try again.';
    passwordInput.value = '';
    passwordInput.focus();
    addLog('warning', 'Failed admin unlock attempt.');
  }
}
passwordInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryUnlock(); });
unlockBtn.addEventListener('click', tryUnlock);

// Auth functions
async function loginAdmin(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  addLog('success', `Admin login: ${email}`);
  return data.user;
}
async function logoutAdmin() {
  await supabaseClient.auth.signOut();
  addLog('info', 'Admin logged out.');
  location.reload();
}

async function checkAdminSetup() {
  const { data, error } = await supabaseClient.from('admin_config').select('*').limit(1);
  if (error || !data || data.length === 0) return false;
  designatedAdminUid = data[0].admin_uid;
  return data[0].setup_complete;
}

// Auth state listener
supabaseClient.auth.onAuthStateChange(async (event, session) => {
  const user = session?.user || null;
  currentAdminUser = user;
  if (user) {
    const isSetup = await checkAdminSetup();
    if (isSetup && user.id === designatedAdminUid) {
      document.getElementById('auth-container').style.display = 'none';
      document.getElementById('admin-main-area').style.display = 'block';
      await loadSettings();
      showAdminSection('dashboard-section');
      setupRealtimeAdminListeners();
      addLog('success', `Admin authenticated: ${user.email}`);
    } else {
      alert('Unauthorized admin access.');
      await logoutAdmin();
    }
  } else {
    document.getElementById('auth-container').style.display = 'block';
    document.getElementById('admin-main-area').style.display = 'none';
    (async () => {
      const isSetup = await checkAdminSetup();
      if (isSetup) {
        document.getElementById('admin-login-section').style.display = 'block';
        document.getElementById('admin-setup-section').style.display = 'none';
      } else {
        document.getElementById('admin-login-section').style.display = 'none';
        document.getElementById('admin-setup-section').style.display = 'block';
      }
    })();
  }
});

// Setup & Login forms
document.getElementById('adminSetupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('setupEmail').value.trim();
  const password = document.getElementById('setupPassword').value;
  if (!email || password.length < 6) { showStatus(document.getElementById('adminSetupStatus'), 'Invalid email or password (min 6).', 'warning'); return; }
  showLoader(true);
  try {
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) throw error;
    const uid = data.user.id;
    await supabaseClient.from('admin_config').insert([{ admin_uid: uid, setup_complete: true }]);
    alert('Admin created! Please login.');
    document.getElementById('admin-login-section').style.display = 'block';
    document.getElementById('admin-setup-section').style.display = 'none';
    addLog('success', `Admin setup complete for ${email}`);
  } catch (err) { showStatus(document.getElementById('adminSetupStatus'), 'Error: ' + err.message, 'danger'); }
  finally { showLoader(false); }
});

document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('adminEmail').value.trim();
  const password = document.getElementById('adminPassword').value;
  try { await loginAdmin(email, password); }
  catch (err) { showStatus(document.getElementById('adminLoginStatus'), 'Login failed: ' + err.message, 'danger'); }
});

document.getElementById('adminLogoutBtnHeader').addEventListener('click', logoutAdmin);
