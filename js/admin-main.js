// admin-main.js – Initialisation, Sidebar, Event Delegation
function setupRealtimeAdminListeners() {
  const wdQuery = supabaseClient.channel('pending-withdrawals')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawals' }, () => { updatePendingBadges(); })
    .subscribe();
  dbListeners['withdrawals'] = wdQuery;
  const dpQuery = supabaseClient.channel('pending-deposits')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'deposits' }, () => { updatePendingBadges(); })
    .subscribe();
  dbListeners['deposits'] = dpQuery;
  const rfQuery = supabaseClient.channel('pending-referrals')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pending_referrals' }, () => { updatePendingBadges(); })
    .subscribe();
  dbListeners['referrals'] = rfQuery;
  const settingsQuery = supabaseClient.channel('settings')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'settings' }, (payload) => {
      appSettings = payload.new;
      applyThemeToAdminPanel(appSettings.theme);
    })
    .subscribe();
  dbListeners['settings'] = settingsQuery;
  addLog('info', 'Realtime listeners attached.');
}

function showAdminSection(sectionId) {
  document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
  const target = getElement(sectionId);
  if (target) target.classList.add('active');
  document.querySelectorAll('#adminSidebar .nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.section === sectionId);
  });
  switch (sectionId) {
    case 'dashboard-section': loadDashboardStats(); break;
    case 'games-section': loadGames(); break;
    case 'promotions-section': loadPromotions(); break;
    case 'tournaments-section': loadTournaments(); break;
    case 'tournament-management-section': populateTournamentManagementSelector(); break;
    case 'leaderboard-mgt-section': loadLeaderboardManagementData(); break;
    case 'users-section': loadUsers(); break;
    case 'withdrawals-section': loadWithdrawals('pending'); loadWithdrawals('completed'); loadWithdrawals('rejected'); break;
    case 'deposit-section': loadDepositRequests('pending'); loadDepositRequests('completed'); loadDepositRequests('rejected'); break;
    case 'referrals-section': loadReferrals('pending'); loadReferrals('completed'); break;
    case 'notifications-section': loadGlobalNotificationHistory(); break;
    case 'settings-section': loadSettings(); break;
    case 'theme-section': loadThemeSettings(); break;
    case 'user-analytics-section': loadUserAnalyticsData(); break;
    default: break;
  }
}

// ----- LEADERBOARD MANAGEMENT (placed here) -----
async function loadLeaderboardManagementData() {
  const tbody = getElement('leaderboardMgtTableBody');
  clearStatus(getElement('leaderboardMgtStatus'));
  tbody.innerHTML = tableLoadingPlaceholderHtml(3);
  const { data, error } = await supabaseClient.from('users').select('id, display_name, email, leaderboard_rank, leaderboard_display_earnings');
  if (error) { tbody.innerHTML = `<tr><td colspan="3" class="text-danger">Error loading users</td></tr>`; return; }
  fullUserDataCache = data.reduce((acc, u) => { acc[u.id] = u; return acc; }, {});
  renderLeaderboardMgtTable(data);
}

function renderLeaderboardMgtTable(users) {
  const tbody = getElement('leaderboardMgtTableBody');
  let html = '';
  users.forEach(u => {
    html += `
      <tr data-uid="${u.id}" data-name="${(u.display_name || '').toLowerCase()}" data-email="${(u.email || '').toLowerCase()}">
        <td>${u.display_name || 'N/A'}<br><small class="text-muted">${u.email || ''}</small></td>
        <td><input type="number" class="form-control form-control-sm rank-input" style="width:100px;" value="${u.leaderboard_rank || ''}" placeholder="N/A" min="1"></td>
        <td><input type="number" class="form-control form-control-sm earnings-input" style="width:150px;" value="${u.leaderboard_display_earnings || ''}" placeholder="e.g., 5000" min="0" step="any"></td>
      </tr>
    `;
  });
  tbody.innerHTML = html || '<tr><td colspan="3" class="text-center text-muted">No users found.</td></tr>';
}

getElement('leaderboardUserSearchInput').addEventListener('input', () => {
  const term = getElement('leaderboardUserSearchInput').value.toLowerCase().trim();
  document.querySelectorAll('#leaderboardMgtTableBody tr[data-uid]').forEach(row => {
    const name = row.dataset.name || '';
    const email = row.dataset.email || '';
    row.style.display = (name.includes(term) || email.includes(term)) ? '' : 'none';
  });
});

getElement('saveLeaderboardBtn').addEventListener('click', async () => {
  if (!confirm('Save leaderboard changes?')) return;
  showLoader(true);
  const updates = {};
  document.querySelectorAll('#leaderboardMgtTableBody tr[data-uid]').forEach(row => {
    const uid = row.dataset.uid;
    const rank = parseInt(row.querySelector('.rank-input').value);
    const earnings = parseFloat(row.querySelector('.earnings-input').value);
    updates[uid] = {
      leaderboard_rank: (!isNaN(rank) && rank > 0) ? rank : null,
      leaderboard_display_earnings: (!isNaN(earnings) && earnings >= 0) ? earnings : null
    };
  });
  for (const [uid, data] of Object.entries(updates)) {
    await supabaseClient.from('users').update(data).eq('id', uid);
  }
  showStatus(getElement('leaderboardMgtStatus'), 'Leaderboard saved!', 'success', 3000);
  showLoader(false);
});

// ----- USER ANALYTICS (placed here) -----
async function loadUserAnalyticsData() {
  const { data: deposits } = await supabaseClient.from('deposits').select('user_id, amount').eq('status', 'completed');
  const spenders = {};
  if (deposits) deposits.forEach(d => { spenders[d.user_id] = (spenders[d.user_id] || 0) + d.amount; });
  const sorted = Object.entries(spenders).sort((a,b) => b[1] - a[1]).slice(0,10);
  let html = '<table class="table table-dark table-sm"><thead><tr><th>User</th><th>Spent</th></tr></thead><tbody>';
  for (const [uid, total] of sorted) {
    const { data: user } = await supabaseClient.from('users').select('display_name').eq('id', uid).single();
    html += `<tr><td>${user?.display_name || uid}</td><td>${formatCurrency(total)}</td></tr>`;
  }
  html += '</tbody></table>';
  getElement('topSpendersContainer').innerHTML = html || '<p class="text-muted">No data.</p>';

  const { data: players } = await supabaseClient.from('registered_players').select('user_id');
  const active = {};
  if (players) players.forEach(p => { active[p.user_id] = (active[p.user_id] || 0) + 1; });
  const sortedActive = Object.entries(active).sort((a,b) => b[1] - a[1]).slice(0,10);
  let html2 = '<table class="table table-dark table-sm"><thead><tr><th>User</th><th>Matches</th></tr></thead><tbody>';
  for (const [uid, count] of sortedActive) {
    const { data: user } = await supabaseClient.from('users').select('display_name').eq('id', uid).single();
    html2 += `<tr><td>${user?.display_name || uid}</td><td>${count}</td></tr>`;
  }
  html2 += '</tbody></table>';
  getElement('mostActiveContainer').innerHTML = html2 || '<p class="text-muted">No data.</p>';

  const cutoff = Date.now() - 15 * 24 * 60 * 60 * 1000;
  const { data: users } = await supabaseClient.from('users').select('id, display_name, last_login');
  const inactive = users?.filter(u => !u.last_login || new Date(u.last_login).getTime() < cutoff) || [];
  let html3 = '<table class="table table-dark table-sm"><thead><tr><th>User</th><th>Last Login</th></tr></thead><tbody>';
  inactive.slice(0,10).forEach(u => { html3 += `<tr><td>${u.display_name || u.id}</td><td>${u.last_login ? formatDate(u.last_login) : 'Never'}</td></tr>`; });
  html3 += '</tbody></table>';
  getElement('inactiveUsersContainer').innerHTML = html3 || '<p class="text-muted">No inactive users.</p>';
}

// ----- NOTIFICATIONS (global) -----
getElement('globalNotificationForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = getElement('globalNotifTitle').value.trim();
  const message = getElement('globalNotifMessage').value.trim();
  const imageUrl = getElement('globalNotifImageUrl').value.trim();
  if (!title || !message) { showStatus(getElement('globalNotificationStatus'), 'Title and Message required.', 'warning'); return; }
  await supabaseClient.from('notifications').insert([{ title, message, image_url: imageUrl || null, timestamp: new Date() }]);
  showStatus(getElement('globalNotificationStatus'), 'Notification sent!', 'success', 3000);
  getElement('globalNotificationForm').reset();
  loadGlobalNotificationHistory();
  addLog('info', `Global notification sent: ${title}`);
});

async function loadGlobalNotificationHistory() {
  const historyEl = getElement('globalNotificationsHistory');
  const { data, error } = await supabaseClient.from('notifications').select('*').order('timestamp', { ascending: false });
  if (error) { historyEl.innerHTML = '<p class="text-danger">Error loading.</p>'; return; }
  if (!data || data.length === 0) { historyEl.innerHTML = '<p class="text-muted">No notifications sent.</p>'; return; }
  let html = '<table class="table table-dark table-hover"><thead><tr><th>Sent At</th><th>Title</th><th>Message</th><th>Image</th></tr></thead><tbody>';
  data.forEach(n => { html += `<tr><td>${formatDate(n.timestamp)}</td><td>${n.title}</td><td>${n.message}</td><td>${n.image_url ? `<a href="${n.image_url}" target="_blank">View</a>` : 'None'}</td></tr>`; });
  html += '</tbody></table>';
  historyEl.innerHTML = html;
}

// ----- BALANCE EDITOR (already in admin-users, but also here for completeness) -----
// The balance editor is in admin-users.js

// ----- REGISTERED PLAYERS MODAL -----
async function openRegisteredPlayersModal(tournamentId, tournamentName) {
  getElement('registeredPlayersModalTitle').textContent = 'Registered Players';
  getElement('registeredPlayersTournamentName').textContent = tournamentName || '';
  const tbody = getElement('registeredPlayersTableBody');
  tbody.innerHTML = '<tr><td colspan="4"><div class="spinner-border"></div></td></tr>';
  bootstrap.Modal.getInstance(getElement('registeredPlayersModal')).show();
  currentPlayersListForPdf = [];
  const { data: players, error } = await supabaseClient.from('registered_players').select('*, users(display_name, email)').eq('tournament_id', tournamentId);
  if (error) { tbody.innerHTML = '<tr><td colspan="4" class="text-danger">Error loading</td></tr>'; return; }
  if (!players || players.length === 0) { tbody.innerHTML = '<tr><td colspan="4" class="text-muted">No players.</td></tr>'; return; }
  let html = '';
  players.forEach(p => {
    const user = p.users || {};
    const display = user.display_name || 'N/A';
    const email = user.email || 'N/A';
    const p1 = p.username || 'N/A';
    const p1uid = p.game_uid || 'N/A';
    const teammates = p.teammates || [];
    const p2 = teammates.length > 0 ? teammates[0].username : 'N/A';
    const p2uid = teammates.length > 0 ? teammates[0].game_uid : 'N/A';
    html += `<tr><td>${display}<br><small class="text-muted">${email}</small></td><td>${p1}<br><small>${p1uid}</small></td><td>${p2}<br><small>${p2uid}</small></td><td>${formatDate(p.joined_at)}</td></tr>`;
    currentPlayersListForPdf.push({ registeredBy: `${display} (${email})`, p1_username: p1, p1_uid: p1uid, p2_username: p2, p2_uid: p2uid, joinedAt: formatDate(p.joined_at) });
  });
  tbody.innerHTML = html;
}

// ----- PDF DOWNLOADS -----
getElement('downloadUsersPdfBtn').addEventListener('click', async () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const { data: users } = await supabaseClient.from('users').select('display_name, email, balance, status');
  doc.text('POPPY ESPORTS – Users List', 14, 15);
  doc.autoTable({ head: [['Name', 'Email', 'Balance', 'Status']], body: users.map(u => [u.display_name || 'N/A', u.email || 'N/A', formatCurrency(u.balance), u.status || 'active']) });
  doc.save('users.pdf');
  addLog('info', 'Users PDF downloaded');
});

getElement('downloadPlayersPdfBtn').addEventListener('click', () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text('Registered Players', 14, 15);
  const rows = currentPlayersListForPdf.map(p => [p.registeredBy, p.p1_username, p.p1_uid, p.p2_username, p.p2_uid, p.joinedAt]);
  doc.autoTable({ head: [['Registered By', 'P1 Username', 'P1 UID', 'P2 Username', 'P2 UID', 'Joined At']], body: rows });
  doc.save('players.pdf');
  addLog('info', 'Players PDF downloaded');
});

// ----- DEMO DATA -----
getElement('addDemoDataBtn').addEventListener('click', async () => {
  if (!confirm('Add sample data? (only if tables are empty)')) return;
  showLoader(true);
  try {
    const { count: gameCount } = await supabaseClient.from('games').select('*', { count: 'exact', head: true });
    if (gameCount === 0) await supabaseClient.from('games').insert([{ name: 'Free Fire', image_url: 'https://i.ibb.co/4Z5hPVzp/20250418-150058.jpg', created_at: new Date() }]);
    const { count: promoCount } = await supabaseClient.from('promotions').select('*', { count: 'exact', head: true });
    if (promoCount === 0) await supabaseClient.from('promotions').insert([{ image_url: 'https://i.ibb.co/RGmQ420/20250418-150709.jpg', link: '#', enabled: true, created_at: new Date() }]);
    const { count: tournCount } = await supabaseClient.from('tournaments').select('*', { count: 'exact', head: true });
    if (tournCount === 0) {
      const { data: game } = await supabaseClient.from('games').select('id').limit(1).single();
      if (game) await supabaseClient.from('tournaments').insert([{ game_id: game.id, name: 'Weekend Showdown', start_time: new Date(Date.now() + 86400000).toISOString(), status: 'upcoming', entry_fee: 10, prize_pool: 100, max_players: 50, mode: 'Squad', created_at: new Date(), updated_at: new Date() }]);
    }
    showStatus(getElement('dashboardStatus'), 'Demo data added!', 'success', 3000);
    loadDashboardStats(); loadGames(); loadPromotions(); loadTournaments();
    addLog('info', 'Demo data added');
  } catch (err) { showStatus(getElement('dashboardStatus'), 'Error: ' + err.message, 'danger'); }
  finally { showLoader(false); }
});

// ----- CLICK HANDLING (Delegated) -----
document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-id]');
  if (!target) return;
  if (target.classList.contains('btn-edit-game')) openEditGameModal(target.dataset.id);
  else if (target.classList.contains('btn-delete-game')) deleteGame(target.dataset.id);
  else if (target.classList.contains('btn-edit-promo')) openEditPromotionModal(target.dataset.id);
  else if (target.classList.contains('btn-delete-promo')) deletePromotion(target.dataset.id);
  else if (target.classList.contains('btn-edit-tournament')) openEditTournamentModal(target.dataset.id);
  else if (target.classList.contains('btn-delete-tournament')) deleteTournament(target.dataset.id);
  else if (target.classList.contains('btn-view-user')) openUserModal(target.dataset.id);
  else if (target.classList.contains('btn-delete-user')) deleteUser(target.dataset.id);
  else if (target.classList.contains('btn-view-registered')) openRegisteredPlayersModal(target.dataset.id, target.dataset.name);
});

document.addEventListener('click', (e) => {
  const copy = e.target.closest('.copy-btn');
  if (copy) copyToClipboard(copy.dataset.target);
});

// ----- SIDEBAR NAV -----
document.querySelectorAll('#adminSidebar .nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const section = link.dataset.section;
    if (section) showAdminSection(section);
    bootstrap.Offcanvas.getInstance(getElement('adminSidebar'))?.hide();
  });
});

// ==================== INITIALIZATION ====================
function initializeAdmin() {
  const session = supabaseClient.auth.session();
  if (session) {
    // Auth listener will handle
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
}

// Start
addLog('info', 'Admin panel loaded (split version).');
