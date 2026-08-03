// admin-dashboard.js – Dashboard stats & chart
async function loadDashboardStats() {
  const { count: totalUsers } = await supabaseClient.from('users').select('*', { count: 'exact', head: true });
  getElement('statTotalUsers').textContent = totalUsers || 0;
  const { data: tournaments } = await supabaseClient.from('tournaments').select('status');
  let active = 0, finished = 0;
  if (tournaments) tournaments.forEach(t => { if (['upcoming','ongoing'].includes(t.status)) active++; else if (['completed','result','cancelled'].includes(t.status)) finished++; });
  getElement('statActiveTournaments').textContent = active;
  getElement('statFinishedTournaments').textContent = finished;
  const { count: totalGames } = await supabaseClient.from('games').select('*', { count: 'exact', head: true });
  getElement('statTotalGames').textContent = totalGames || 0;
  const { count: totalPromotions } = await supabaseClient.from('promotions').select('*', { count: 'exact', head: true });
  getElement('statTotalPromotions').textContent = totalPromotions || 0;
  const { count: wdPending } = await supabaseClient.from('withdrawals').select('*', { count: 'exact', head: true }).eq('status', 'pending');
  getElement('statPendingWithdrawals').textContent = wdPending || 0;
  const { count: wdCompleted } = await supabaseClient.from('withdrawals').select('*', { count: 'exact', head: true }).eq('status', 'completed');
  getElement('statCompletedWithdrawals').textContent = wdCompleted || 0;
  const { count: wdRejected } = await supabaseClient.from('withdrawals').select('*', { count: 'exact', head: true }).eq('status', 'rejected');
  getElement('statRejectedWithdrawals').textContent = wdRejected || 0;
  updatePendingBadges();
  renderNewUserChart();
}

async function updatePendingBadges() {
  const { count: wdCount } = await supabaseClient.from('withdrawals').select('*', { count: 'exact', head: true }).eq('status', 'pending');
  const wdBadge = getElement('pendingWithdrawalCountBadge');
  if (wdBadge) { wdBadge.textContent = wdCount; wdBadge.style.display = wdCount > 0 ? 'inline-block' : 'none'; }
  const { count: dpCount } = await supabaseClient.from('deposits').select('*', { count: 'exact', head: true }).eq('status', 'pending');
  const dpBadge = getElement('pendingDepositCountBadge');
  if (dpBadge) { dpBadge.textContent = dpCount; dpBadge.style.display = dpCount > 0 ? 'inline-block' : 'none'; }
  const { count: rfCount } = await supabaseClient.from('pending_referrals').select('*', { count: 'exact', head: true }).eq('status', 'pending');
  const rfBadge = getElement('pendingReferralCountBadge');
  if (rfBadge) { rfBadge.textContent = rfCount; rfBadge.style.display = rfCount > 0 ? 'inline-block' : 'none'; }
}

async function renderNewUserChart() {
  const { data: users } = await supabaseClient.from('users').select('created_at');
  if (!users) return;
  const days = Array(7).fill(0).map((_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return d; }).reverse();
  const labels = days.map(d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  const counts = Array(7).fill(0);
  users.forEach(u => {
    const d = new Date(u.created_at);
    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(days[i]).setHours(0,0,0,0);
      const dayEnd = new Date(days[i]).setHours(23,59,59,999);
      if (d >= dayStart && d <= dayEnd) { counts[i]++; break; }
    }
  });
  if (newUserChart) newUserChart.destroy();
  newUserChart = new Chart(getElement('newUserChart'), {
    type: 'bar',
    data: { labels, datasets: [{ label: 'New Users', data: counts, backgroundColor: 'rgba(250,204,21,0.7)', borderColor: 'rgb(250,204,21)', borderWidth: 1 }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { color: '#94A3B8' } }, x: { ticks: { color: '#94A3B8' } } } }
  });
}
