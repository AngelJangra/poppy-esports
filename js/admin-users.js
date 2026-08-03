// admin-users.js – Users, Balance Editor, Notifications
async function loadUsers() {
  const { data, error } = await supabaseClient.from('users').select('*').order('created_at', { ascending: false });
  if (error) return;
  fullUserDataCache = data.reduce((acc, u) => { acc[u.id] = u; return acc; }, {});
  renderUsersTable(data);
}

function renderUsersTable(users) {
  const tbody = getElement('usersTableBody');
  let html = '';
  users.forEach(u => {
    const statusBadge = `<span class="status-badge text-bg-${u.status === 'active' ? 'success' : 'danger'}">${u.status || 'active'}</span>`;
    html += `
      <tr>
        <td><input type="checkbox" class="form-check-input user-select-checkbox" data-uid="${u.id}"></td>
        <td><small class="text-muted">${u.id}</small> <i class="bi bi-clipboard copy-btn" data-target="td:nth-child(2) > small"></i></td>
        <td>${u.display_name || 'N/A'}</td>
        <td>${u.email || 'N/A'}</td>
        <td>${formatCurrency(u.balance)}</td>
        <td>${u.free_fire_uid || 'N/A'}</td>
        <td>${u.ff_clan_name || 'N/A'}</td>
        <td>${u.ff_verified ? '✅' : '❌'}</td>
        <td>${statusBadge}</td>
        <td class="action-buttons">
          <button class="btn btn-sm btn-info btn-view-user" data-id="${u.id}"><i class="bi bi-eye"></i></button>
          <button class="btn btn-sm btn-danger btn-delete-user" data-id="${u.id}"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html || '<tr><td colspan="10" class="text-center text-muted">No users found.</td></tr>';
  updateSelectedUserNotificationUI();
}

getElement('userSearchInput').addEventListener('input', () => {
  const term = getElement('userSearchInput').value.toLowerCase().trim();
  const users = Object.values(fullUserDataCache).filter(u =>
    (u.display_name || '').toLowerCase().includes(term) ||
    (u.email || '').toLowerCase().includes(term) ||
    (u.free_fire_uid || '').includes(term)
  );
  renderUsersTable(users);
});

// ----- USER MODAL -----
async function openUserModal(uid) {
  showLoader(true);
  const user = fullUserDataCache[uid];
  if (!user) { alert('User not found'); showLoader(false); return; }
  getElement('userModalTitle').textContent = `User: ${user.display_name || 'N/A'}`;
  getElement('userDetailUid').textContent = uid;
  getElement('userDetailEmail').textContent = user.email || 'N/A';
  getElement('userDetailNameInput').value = user.display_name || '';
  getElement('userDetailPhoneInput').value = user.phone_number || '';
  getElement('userDetailFfUid').textContent = user.free_fire_uid || 'N/A';
  getElement('userDetailClan').textContent = user.ff_clan_name || 'N/A';
  getElement('userDetailVerified').textContent = user.ff_verified ? '✅ Verified' : '❌ Not Verified';
  getElement('userDetailCreatedAt').textContent = formatDate(user.created_at);
  getElement('userDetailBalance').textContent = (user.balance || 0).toFixed(2);
  getElement('userDetailWinning').textContent = (user.winning_cash || 0).toFixed(2);
  getElement('userDetailBonus').textContent = (user.bonus_cash || 0).toFixed(2);
  getElement('userDetailReferralCode').textContent = user.referral_code || 'N/A';
  getElement('userDetailReferredBy').textContent = user.referred_by || 'N/A';
  const { count } = await supabaseClient.from('users').select('*', { count: 'exact', head: true }).eq('referred_by', uid);
  getElement('userDetailReferredCount').textContent = count || 0;
  getElement('editUserUid').value = uid;
  const status = user.status || 'active';
  getElement('userDetailStatus').textContent = status.charAt(0).toUpperCase() + status.slice(1);
  getElement('userDetailStatus').className = `fw-bold text-${status === 'active' ? 'success' : 'danger'}`;
  const blockBtn = getElement('userBlockBtn');
  blockBtn.textContent = status === 'active' ? 'Block User' : 'Unblock User';
  blockBtn.className = `btn btn-sm ${status === 'active' ? 'btn-danger' : 'btn-success'}`;
  blockBtn.dataset.id = uid;
  blockBtn.dataset.action = status === 'active' ? 'block' : 'unblock';
  getElement('userDeleteBtn').dataset.id = uid;
  bootstrap.Modal.getInstance(getElement('userModal')).show();
  showLoader(false);
}

getElement('userBlockBtn').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  const uid = btn.dataset.id;
  const action = btn.dataset.action;
  if (!confirm(`${action} user ${uid}?`)) return;
  const newStatus = action === 'block' ? 'blocked' : 'active';
  await supabaseClient.from('users').update({ status: newStatus }).eq('id', uid);
  loadUsers();
  openUserModal(uid);
  addLog('info', `User ${uid} ${newStatus}`);
});

getElement('userDeleteBtn').addEventListener('click', async () => {
  const uid = getElement('editUserUid').value;
  if (!confirm(`Delete user ${uid}? This cannot be undone.`)) return;
  await supabaseClient.from('users').delete().eq('id', uid);
  bootstrap.Modal.getInstance(getElement('userModal')).hide();
  loadUsers();
  addLog('info', `User deleted: ${uid}`);
});

getElement('updateUserInfoForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const uid = getElement('editUserUid').value;
  const display_name = getElement('userDetailNameInput').value.trim();
  const phone_number = getElement('userDetailPhoneInput').value.trim();
  if (!display_name) { showStatus(getElement('updateUserInfoStatus'), 'Name required.', 'warning'); return; }
  await supabaseClient.from('users').update({ display_name, phone_number }).eq('id', uid);
  showStatus(getElement('updateUserInfoStatus'),
