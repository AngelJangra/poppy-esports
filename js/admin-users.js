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
  showStatus(getElement('updateUserInfoStatus'), 'Updated!', 'success', 3000);
  loadUsers();
  addLog('info', `User info updated for ${uid}`);
});

getElement('updateBalanceForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const uid = getElement('editUserUid').value;
  const amount = parseFloat(getElement('balanceUpdateAmount').value);
  const type = getElement('balanceUpdateType').value;
  const reason = getElement('balanceUpdateReason').value.trim();
  if (!uid || isNaN(amount) || !type || !reason) { showStatus(getElement('balanceUpdateStatus'), 'All fields required.', 'warning'); return; }
  const { data: user } = await supabaseClient.from('users').select('balance, winning_cash, bonus_cash').eq('id', uid).single();
  if (!user) { showStatus(getElement('balanceUpdateStatus'), 'User not found.', 'danger'); return; }
  let newBalance = user.balance, newWinning = user.winning_cash, newBonus = user.bonus_cash;
  if (type === 'balance') newBalance += amount;
  else if (type === 'winningCash') { newWinning += amount; newBalance += amount; }
  else if (type === 'bonusCash') { newBonus += amount; newBalance += amount; }
  if (newWinning < 0 || newBonus < 0 || newBalance < 0) { showStatus(getElement('balanceUpdateStatus'), 'Balance cannot be negative.', 'warning'); return; }
  await supabaseClient.from('users').update({ balance: newBalance, winning_cash: newWinning, bonus_cash: newBonus }).eq('id', uid);
  await supabaseClient.from('transactions').insert([{ user_id: uid, type: 'admin_balance_edit', amount: amount, description: reason, timestamp: new Date(), balance_after: newBalance, admin_uid: currentAdminUser.id }]);
  showStatus(getElement('balanceUpdateStatus'), `Updated! New total: ${formatCurrency(newBalance)}`, 'success', 3000);
  loadUsers();
  openUserModal(uid);
  addLog('info', `Balance updated for ${uid}: ${formatCurrency(amount)} (${reason})`);
});

// ----- SELECTIVE NOTIFICATION -----
function updateSelectedUserNotificationUI() {
  const checkboxes = document.querySelectorAll('#usersTableBody .user-select-checkbox:checked');
  const count = checkboxes.length;
  getElement('selectedUserCount').textContent = count;
  getElement('sendToSelectedUsersBtn').disabled = count === 0;
  const all = document.querySelectorAll('#usersTableBody .user-select-checkbox');
  const checkedAll = document.querySelectorAll('#usersTableBody .user-select-checkbox:checked');
  const selectAll = getElement('selectAllUsersCheckbox');
  if (all.length > 0) { selectAll.checked = all.length === checkedAll.length; selectAll.indeterminate = checkedAll.length > 0 && checkedAll.length < all.length; }
  else { selectAll.checked = false; selectAll.indeterminate = false; }
}

document.addEventListener('change', (e) => {
  if (e.target.classList.contains('user-select-checkbox')) updateSelectedUserNotificationUI();
});

getElement('selectAllUsersCheckbox').addEventListener('change', (e) => {
  document.querySelectorAll('#usersTableBody .user-select-checkbox').forEach(cb => cb.checked = e.target.checked);
  updateSelectedUserNotificationUI();
});

getElement('sendSelectiveNotificationBtn').addEventListener('click', async () => {
  const title = getElement('selectiveNotifTitle').value.trim();
  const message = getElement('selectiveNotifMessage').value.trim();
  const imageUrl = getElement('selectiveNotifImageUrl').value.trim();
  if (!title || !message) { showStatus(getElement('selectiveNotificationStatus'), 'Title and Message required.', 'warning'); return; }
  const selected = document.querySelectorAll('#usersTableBody .user-select-checkbox:checked');
  const uids = Array.from(selected).map(cb => cb.dataset.uid);
  if (uids.length === 0) { showStatus(getElement('selectiveNotificationStatus'), 'No users selected.', 'warning'); return; }
  showLoader(true);
  const notifData = { title, message, image_url: imageUrl || null, timestamp: new Date() };
  for (const uid of uids) await supabaseClient.from('user_notifications').insert([{ ...notifData, user_id: uid }]);
  showStatus(getElement('usersStatus'), `Sent to ${uids.length} users.`, 'success', 3000);
  bootstrap.Modal.getInstance(getElement('selectiveNotificationModal')).hide();
  addLog('info', `Selective notification sent to ${uids.length} users`);
  showLoader(false);
});

// ----- INDIVIDUAL NOTIFICATION (inside modal) -----
getElement('individualNotificationForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const uid = getElement('editUserUid').value;
  const title = getElement('individualNotifTitle').value.trim();
  const message = getElement('individualNotifMessage').value.trim();
  const imageUrl = getElement('individualNotifImageUrl').value.trim();
  if (!uid || !title || !message) { showStatus(getElement('individualNotificationStatus'), 'All fields required.', 'warning'); return; }
  await supabaseClient.from('user_notifications').insert([{ user_id: uid, title, message, image_url: imageUrl || null, timestamp: new Date() }]);
  showStatus(getElement('individualNotificationStatus'), 'Sent!', 'success', 3000);
  getElement('individualNotificationForm').reset();
  addLog('info', `Individual notification sent to ${uid}`);
});
