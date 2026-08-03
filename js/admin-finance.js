// admin-finance.js – Withdrawals, Deposits, Referrals
// ----- WITHDRAWALS -----
async function loadWithdrawals(status) {
  const tbody = getElement(`${status}WithdrawalsTableBody`);
  if (!tbody) return;
  tbody.innerHTML = tableLoadingPlaceholderHtml(status === 'pending' ? 5 : 6);
  const { data, error } = await supabaseClient.from('withdrawals').select('*, users(display_name, email)').eq('status', status).order('request_timestamp', { ascending: false });
  if (error) { tbody.innerHTML = `<tr><td colspan="${status === 'pending' ? 5 : 6}" class="text-danger">Error loading</td></tr>`; return; }
  let html = '';
  data.forEach(w => {
    const user = w.users || {};
    const userDisplay = `${user.display_name || 'N/A'} <small class="text-muted">${user.email || 'N/A'}</small>`;
    const method = w.method_details?.methodName || 'N/A';
    const requestTime = formatDate(w.request_timestamp);
    const processedTime = formatDate(w.processed_at);
    let row = `<tr><td>${requestTime}</td>`;
    if (status !== 'pending') row += `<td>${processedTime}</td>`;
    row += `<td>${userDisplay}</td><td>${formatCurrency(w.amount)}</td><td>${method}</td>`;
    if (status === 'pending') row += `<td class="action-buttons"><button class="btn btn-sm btn-success btn-approve-withdrawal" data-id="${w.id}" data-userid="${w.user_id}"><i class="bi bi-check-circle"></i></button> <button class="btn btn-sm btn-danger btn-reject-withdrawal" data-id="${w.id}" data-userid="${w.user_id}"><i class="bi bi-x-circle"></i></button></td>`;
    else if (status === 'completed') row += `<td>${w.admin_note || ''}</td>`;
    else row += `<td>${w.reject_reason || ''}</td>`;
    row += '</tr>';
    html += row;
  });
  tbody.innerHTML = html || `<tr><td colspan="${status === 'pending' ? 5 : 6}" class="text-center text-muted">No ${status} withdrawals.</td></tr>`;
}

document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-id]');
  if (!target) return;
  if (target.classList.contains('btn-approve-withdrawal') || target.classList.contains('btn-reject-withdrawal')) {
    currentWithdrawalAction = { id: target.dataset.id, type: target.classList.contains('btn-approve-withdrawal') ? 'approve' : 'reject', userId: target.dataset.userid };
    openWithdrawalActionModal();
  }
});

function openWithdrawalActionModal() {
  supabaseClient.from('withdrawals').select('*, users(display_name, email)').eq('id', currentWithdrawalAction.id).single().then(({ data: w }) => {
    if (!w) return;
    const user = w.users || {};
    getElement('withdrawalDetailId').textContent = currentWithdrawalAction.id;
    getElement('withdrawalDetailUser').innerHTML = `${user.display_name || 'N/A'} <small>${user.email || 'N/A'}</small>`;
    getElement('withdrawalDetailAmount').textContent = w.amount;
    getElement('withdrawalDetailMethod').textContent = w.method_details?.methodName || 'N/A';
    getElement('withdrawalRejectReasonDiv').style.display = currentWithdrawalAction.type === 'reject' ? 'block' : 'none';
    getElement('withdrawalApproveNoteDiv').style.display = currentWithdrawalAction.type === 'approve' ? 'block' : 'none';
    getElement('withdrawalRejectReasonInput').value = '';
    getElement('withdrawalApproveNoteInput').value = '';
    clearStatus(getElement('withdrawalActionStatus'));
    bootstrap.Modal.getInstance(getElement('withdrawalActionModal')).show();
  });
}

getElement('approveWithdrawalBtn').addEventListener('click', async () => await processWithdrawal('approve'));
getElement('rejectWithdrawalBtn').addEventListener('click', async () => await processWithdrawal('reject'));

async function processWithdrawal(action) {
  const id = currentWithdrawalAction.id;
  const userId = currentWithdrawalAction.userId;
  const amount = parseFloat(getElement('withdrawalDetailAmount').textContent);
  const note = getElement('withdrawalApproveNoteInput').value.trim();
  const reason = getElement('withdrawalRejectReasonInput').value.trim();
  if (action === 'reject' && !reason) { showStatus(getElement('withdrawalActionStatus'), 'Rejection reason required.', 'warning'); return; }
  showLoader(true);
  try {
    if (action === 'approve') {
      await supabaseClient.from('withdrawals').update({ status: 'completed', processed_at: new Date(), processed_by: currentAdminUser.id, admin_note: note || 'Approved' }).eq('id', id);
      addLog('success', `Withdrawal ${id} approved`);
    } else {
      const { data: user } = await supabaseClient.from('users').select('balance, winning_cash').eq('id', userId).single();
      if (user) {
        const newBalance = (user.balance || 0) + amount;
        const newWinning = (user.winning_cash || 0) + amount;
        await supabaseClient.from('users').update({ balance: newBalance, winning_cash: newWinning }).eq('id', userId);
      }
      await supabaseClient.from('withdrawals').update({ status: 'rejected', processed_at: new Date(), processed_by: currentAdminUser.id, reject_reason: reason }).eq('id', id);
      await supabaseClient.from('transactions').insert([{ user_id: userId, type: 'withdrawal_refund', amount, description: `Withdrawal ${id} rejected: ${reason}`, timestamp: new Date(), balance_after: (user?.balance || 0) + amount, admin_uid: currentAdminUser.id }]);
      addLog('info', `Withdrawal ${id} rejected: ${reason}`);
    }
    showStatus(getElement('withdrawalsStatus'), `Withdrawal ${action}ed.`, 'success', 3000);
    bootstrap.Modal.getInstance(getElement('withdrawalActionModal')).hide();
    loadWithdrawals('pending'); loadWithdrawals('completed'); loadWithdrawals('rejected'); loadDashboardStats();
  } catch (err) { showStatus(getElement('withdrawalActionStatus'), 'Error: ' + err.message, 'danger'); }
  finally { showLoader(false); }
}

// ----- DEPOSITS -----
async function loadDepositRequests(status) {
  const tbody = getElement(`${status}DepositsTableBody`);
  if (!tbody) return;
  tbody.innerHTML = tableLoadingPlaceholderHtml(6);
  const { data, error } = await supabaseClient.from('deposits').select('*, users(display_name, email)').eq('status', status).order('timestamp', { ascending: false });
  if (error) { tbody.innerHTML = `<tr><td colspan="6" class="text-danger">Error loading</td></tr>`; return; }
  let html = '';
  data.forEach(d => {
    const user = d.users || {};
    const userDisplay = `${user.display_name || 'N/A'} <small>${user.email || 'N/A'}</small>`;
    const requestTime = formatDate(d.timestamp);
    const processedTime = formatDate(d.processed_at);
    let row = `<tr><td>${requestTime}</td>`;
    if (status !== 'pending') row += `<td>${processedTime}</td>`;
    row += `<td>${userDisplay}</td><td>${formatCurrency(d.amount)}</td><td>${d.utr || 'N/A'}</td><td>${d.payment_method || 'N/A'}</td>`;
    if (status === 'pending') row += `<td class="action-buttons"><select class="form-select form-select-sm deposit-action-select" data-id="${d.id}" data-userid="${d.user_id}" data-amount="${d.amount}"><option value="">Select</option><option value="complete">Complete</option><option value="reject">Reject</option></select></td>`;
    row += '</tr>';
    html += row;
  });
  tbody.innerHTML = html || `<tr><td colspan="6" class="text-center text-muted">No ${status} deposits.</td></tr>`;
}

document.addEventListener('change', async (e) => {
  if (e.target.classList.contains('deposit-action-select')) {
    const select = e.target;
    const action = select.value;
    if (!action) return;
    const depositId = select.dataset.id;
    const userId = select.dataset.userid;
    const amount = parseFloat(select.dataset.amount);
    if (!confirm(`Mark deposit as ${action}?`)) { select.value = ''; return; }
    showLoader(true);
    try {
      if (action === 'complete') {
        await supabaseClient.rpc('add_balance', { user_id: userId, amount });
        await supabaseClient.from('deposits').update({ status: 'completed', processed_at: new Date(), processed_by: currentAdminUser.id }).eq('id', depositId);
        // Check referral
        const { data: user } = await supabaseClient.from('users').select('referred_by').eq('id', userId).single();
        if (user && user.referred_by) {
          const { data: settings } = await supabaseClient.from('settings').select('referral_percent').limit(1).single();
          const percent = settings?.referral_percent || 10;
          const bonus = amount * (percent / 100);
          if (bonus > 0) {
            await supabaseClient.rpc('add_balance', { user_id: user.referred_by, amount: bonus });
            await supabaseClient.from('users').update({ referral_earnings_from_spending: supabaseClient.raw('referral_earnings_from_spending + ?', [bonus]), total_referred_spending: supabaseClient.raw('total_referred_spending + ?', [amount]) }).eq('id', user.referred_by);
            await supabaseClient.from('transactions').insert([{ user_id: user.referred_by, type: 'referral_spending_bonus', amount: bonus, description: `10% of spending from ${userId}`, timestamp: new Date() }]);
            addLog('info', `Referral bonus ₹${bonus} credited to ${user.referred_by} from deposit ${depositId}`);
          }
        }
        addLog('success', `Deposit ${depositId} completed: ₹${amount}`);
      } else {
        await supabaseClient.from('deposits').update({ status: 'rejected', processed_at: new Date(), processed_by: currentAdminUser.id }).eq('id', depositId);
        addLog('info', `Deposit ${depositId} rejected`);
      }
      showStatus(getElement('depositsStatus'), `Deposit ${action}ed.`, 'success', 3000);
      loadDepositRequests('pending'); loadDepositRequests('completed'); loadDepositRequests('rejected'); loadDashboardStats();
    } catch (err) { showStatus(getElement('depositsStatus'), 'Error: ' + err.message, 'danger'); }
    finally { showLoader(false); select.value = ''; }
  }
});

// ----- REFERRALS -----
async function loadReferrals(status) {
  const tbody = getElement(`${status}ReferralsTableBody`);
  if (!tbody) return;
  tbody.innerHTML = tableLoadingPlaceholderHtml(4);
  const { data, error } = await supabaseClient.from('pending_referrals').select('*, referrer:users!referrer_uid(display_name, email), referred:users!referred_uid(display_name, email)').eq('status', status).order('timestamp', { ascending: false });
  if (error) { tbody.innerHTML = `<tr><td colspan="4" class="text-danger">Error loading</td></tr>`; return; }
  let html = '';
  data.forEach(r => {
    const referrer = r.referrer || {};
    const referred = r.referred || {};
    const referrerName = referrer.display_name || 'N/A';
    const referredName = referred.display_name || 'N/A';
    if (status === 'pending') html += `<tr id="ref-row-${r.id}"><td>${formatDate(r.timestamp)}</td><td>${referrerName}</td><td>${referredName}</td><td class="action-buttons"><button class="btn btn-sm btn-success btn-credit-referral" data-id="${r.id}" data-referrer-uid="${r.referrer_uid}"><i class="bi bi-gift-fill"></i> Credit</button></td></tr>`;
    else html += `<tr><td>${formatDate(r.credited_at)}</td><td>${referrerName}</td><td>${referredName}</td><td>${formatCurrency(r.bonus_amount)}</td></tr>`;
  });
  tbody.innerHTML = html || `<tr><td colspan="4" class="text-center text-muted">No ${status} referrals.</td></tr>`;
}

document.addEventListener('click', async (e) => {
  const btn = e.target.closest('.btn-credit-referral');
  if (!btn) return;
  const id = btn.dataset.id;
  const referrerUid = btn.dataset.referrerUid;
  if (!confirm('Credit referral bonus?')) return;
  showLoader(true);
  try {
    const { data: settings } = await supabaseClient.from('settings').select('referral_bonus').limit(1).single();
    const bonus = settings?.referral_bonus || 10;
    await supabaseClient.rpc('add_balance', { user_id: referrerUid, amount: bonus });
    await supabaseClient.from('pending_referrals').update({ status: 'credited', credited_at: new Date(), bonus_amount: bonus }).eq('id', id);
    await supabaseClient.from('transactions').insert([{ user_id: referrerUid, type: 'referral_bonus', amount: bonus, description: 'Referral bonus', timestamp: new Date() }]);
    showStatus(getElement('referralsStatus'), 'Bonus credited!', 'success', 3000);
    addLog('success', `Referral bonus ₹${bonus} credited to ${referrerUid}`);
    loadReferrals('pending'); loadReferrals('completed');
  } catch (err) { showStatus(getElement('referralsStatus'), 'Error: ' + err.message, 'danger'); }
  finally { showLoader(false); }
});
