// admin-tournaments.js – Tournaments CRUD & Management
async function loadTournaments() {
  const { data, error } = await supabaseClient.from('tournaments').select('*, games(name, image_url)').order('created_at', { ascending: false });
  if (error) return;
  const tbody = getElement('tournamentsTableBody');
  tbody.innerHTML = '';
  data.forEach(t => {
    const regCount = t.registered_players ? Object.keys(t.registered_players).length : 0;
    const maxSlots = t.max_players || 0;
    const profit = (t.entry_fee || 0) * maxSlots - (t.prize_pool || 0);
    const statusBadge = `<span class="status-badge text-bg-${t.status === 'upcoming' ? 'info' : t.status === 'ongoing' ? 'success' : t.status === 'completed' || t.status === 'result' ? 'secondary' : 'danger'}">${t.status}</span>`;
    tbody.innerHTML += `
      <tr>
        <td>${t.name}</td>
        <td>${t.games?.name || 'Unknown'}</td>
        <td>${t.mode || 'Solo'}</td>
        <td>₹${t.entry_fee}</td>
        <td>₹${t.prize_pool}</td>
        <td>${maxSlots > 0 ? maxSlots : '∞'}</td>
        <td>${regCount}</td>
        <td>₹${profit}</td>
        <td>${statusBadge}</td>
        <td class="action-buttons">
          <button class="btn btn-sm btn-info btn-edit-tournament" data-id="${t.id}"><i class="bi bi-pencil-square"></i></button>
          <button class="btn btn-sm btn-secondary btn-view-registered" data-id="${t.id}" data-name="${t.name}"><i class="bi bi-people"></i></button>
          <button class="btn btn-sm btn-danger btn-delete-tournament" data-id="${t.id}"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `;
  });
}

async function deleteTournament(id) { if (!confirm('Delete tournament?')) return; await supabaseClient.from('tournaments').delete().eq('id', id); loadTournaments(); addLog('info', `Tournament deleted: ${id}`); }
async function openEditTournamentModal(id) {
  const { data: t } = await supabaseClient.from('tournaments').select('*').eq('id', id).single();
  if (!t) return;
  getElement('tournamentEditId').value = t.id;
  getElement('tournamentName').value = t.name;
  getElement('tournamentMode').value = t.mode || 'Solo';
  if (t.mode && !['Solo','Duo','Squad','Custom'].includes(t.mode)) {
    getElement('tournamentMode').value = 'Custom';
    getElement('tournamentCustomMode').value = t.mode;
    getElement('customModeContainer').style.display = 'block';
  } else getElement('customModeContainer').style.display = 'none';
  getElement('tournamentEntryFee').value = t.entry_fee;
  getElement('tournamentPrizePool').value = t.prize_pool;
  getElement('tournamentMaxPlayers').value = t.max_players;
  getElement('tournamentStartTime').value = t.start_time ? new Date(t.start_time).toISOString().slice(0,16) : '';
  getElement('tournamentStatus').value = t.status;
  getElement('tournamentBannerUrl').value = t.banner_url || '';
  getElement('tournamentDescription').value = t.description || '';
  getElement('tournamentRoomId').value = t.room_id || '';
  getElement('tournamentRoomPassword').value = t.room_password || '';
  getElement('tournamentShowIdPass').checked = t.show_id_pass || false;
  getElement('tournamentRegistrationOpen').checked = t.registration_open !== false;
  await populateGameSelect(t.game_id);
  getElement('tournamentModalTitle').textContent = 'Edit Tournament';
  updateProfitMargin();
  bootstrap.Modal.getInstance(getElement('addTournamentModal')).show();
}

async function populateGameSelect(selected = null) {
  const select = getElement('tournamentGame');
  const { data, error } = await supabaseClient.from('games').select('*');
  if (error) return;
  select.innerHTML = '<option value="">Select Game</option>';
  data.forEach(g => { const opt = document.createElement('option'); opt.value = g.id; opt.textContent = g.name; select.appendChild(opt); });
  if (selected) select.value = selected;
}

function updateProfitMargin() {
  const fee = parseFloat(getElement('tournamentEntryFee').value) || 0;
  const prize = parseFloat(getElement('tournamentPrizePool').value) || 0;
  const slots = parseInt(getElement('tournamentMaxPlayers').value) || 0;
  getElement('profitMarginValue').textContent = (fee * slots - prize).toFixed(2);
}

getElement('tournamentEntryFee').addEventListener('input', updateProfitMargin);
getElement('tournamentPrizePool').addEventListener('input', updateProfitMargin);
getElement('tournamentMaxPlayers').addEventListener('input', updateProfitMargin);
getElement('tournamentMode').addEventListener('change', () => {
  getElement('customModeContainer').style.display = getElement('tournamentMode').value === 'Custom' ? 'block' : 'none';
});

getElement('saveTournamentBtn').addEventListener('click', async () => {
  const id = getElement('tournamentEditId').value;
  const gameId = getElement('tournamentGame').value;
  const name = getElement('tournamentName').value.trim();
  const mode = getElement('tournamentMode').value;
  const customMode = getElement('tournamentCustomMode').value.trim();
  const entryFee = parseFloat(getElement('tournamentEntryFee').value) || 0;
  const prizePool = parseFloat(getElement('tournamentPrizePool').value) || 0;
  const maxPlayers = parseInt(getElement('tournamentMaxPlayers').value) || 0;
  const startTime = getElement('tournamentStartTime').value;
  const status = getElement('tournamentStatus').value;
  const bannerUrl = getElement('tournamentBannerUrl').value.trim();
  const description = getElement('tournamentDescription').value.trim();
  const roomId = getElement('tournamentRoomId').value.trim();
  const roomPassword = getElement('tournamentRoomPassword').value.trim();
  const showIdPass = getElement('tournamentShowIdPass').checked;
  const registrationOpen = getElement('tournamentRegistrationOpen').checked;
  if (!gameId || !name || !startTime) { showStatus(getElement('addTournamentStatus'), 'Game, Name, and Start Time required.', 'warning'); return; }
  const finalMode = (mode === 'Custom' && customMode) ? customMode : mode;
  const data = { game_id: gameId, name, mode: finalMode, entry_fee: entryFee, prize_pool: prizePool, max_players: maxPlayers, start_time: new Date(startTime).toISOString(), status, banner_url: bannerUrl || null, description: description || null, room_id: roomId || null, room_password: roomPassword || null, show_id_pass: showIdPass, registration_open: registrationOpen, updated_at: new Date() };
  try {
    if (id) { await supabaseClient.from('tournaments').update(data).eq('id', id); addLog('info', `Tournament updated: ${name}`); showStatus(getElement('tournamentsStatus'), 'Tournament updated!', 'success', 3000); }
    else { data.created_at = new Date(); await supabaseClient.from('tournaments').insert([data]); addLog('info', `Tournament added: ${name}`); showStatus(getElement('tournamentsStatus'), 'Tournament added!', 'success', 3000); }
    getElement('tournamentForm').reset(); getElement('tournamentEditId').value = '';
    bootstrap.Modal.getInstance(getElement('addTournamentModal')).hide();
    loadTournaments();
  } catch (err) { showStatus(getElement('addTournamentStatus'), 'Error: ' + err.message, 'danger'); }
});

getElement('addNewTournamentBtn').addEventListener('click', () => {
  getElement('tournamentForm').reset();
  getElement('tournamentEditId').value = '';
  getElement('tournamentModalTitle').textContent = 'Add New Tournament';
  populateGameSelect();
  updateProfitMargin();
  getElement('customModeContainer').style.display = 'none';
});

// ----- Tournament Management (Prize) -----
async function populateTournamentManagementSelector() {
  const select = getElement('tmsTournamentSelect');
  select.innerHTML = '<option value="">Loading...</option>';
  const { data, error } = await supabaseClient.from('tournaments').select('id, name, status, start_time, per_kill_prize').in('status', ['ongoing','completed','result']).order('start_time', { ascending: false });
  if (error) { select.innerHTML = '<option value="">Error loading</option>'; return; }
  select.innerHTML = '<option value="">-- Select a tournament --</option>';
  data.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = `${t.name} (${new Date(t.start_time).toLocaleDateString()}) - ${t.status}`;
    opt.dataset.perKillPrize = t.per_kill_prize || 0;
    opt.dataset.name = t.name;
    select.appendChild(opt);
  });
}

getElement('tmsTournamentSelect').addEventListener('change', (e) => {
  const id = e.target.value;
  if (!id) { getElement('tmsPlayerListContainer').style.display = 'none'; return; }
  loadPlayersForManagement(id);
});

async function loadPlayersForManagement(tournamentId) {
  const container = getElement('tmsPlayerListContainer');
  const tbody = getElement('tmsPlayerListTableBody');
  const creditBtn = getElement('creditWinningsBtn');
  clearStatus(getElement('tmsStatus'));
  container.style.display = 'block';
  tbody.innerHTML = '<tr><td colspan="7"><div class="spinner-border"></div></td></tr>';
  creditBtn.disabled = true;
  creditBtn.innerHTML = '<i class="bi bi-check-circle-fill"></i> Credit All Winnings';
  try {
    const { data: tournament } = await supabaseClient.from('tournaments').select('registered_players, per_kill_prize, winnings_credited').eq('id', tournamentId).single();
    if (!tournament) throw new Error('Tournament not found');
    if (tournament.winnings_credited) { showStatus(getElement('tmsStatus'), 'Winnings already credited.', 'info', false); creditBtn.disabled = true; creditBtn.textContent = 'Already Credited'; } else creditBtn.disabled = false;
    const players = tournament.registered_players || {};
    const userIds = Object.keys(players);
    if (userIds.length === 0) { tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No players registered.</td></tr>'; return; }
    let html = '';
    for (const uid of userIds) {
      const { data: user } = await supabaseClient.from('users').select('display_name, game_uid').eq('id', uid).single();
      const display = user?.display_name || uid;
      const gameUid = user?.game_uid || 'N/A';
      html += `<tr data-uid="${uid}" data-per-kill-prize="${tournament.per_kill_prize || 0}">
        <td>${display}</td><td><small class="text-muted">${gameUid}</small></td>
        <td>${formatCurrency(tournament.per_kill_prize || 0)}</td>
        <td><input type="number" class="form-control kills-input" min="0" value="0"></td>
        <td><input type="number" class="form-control extra-amount-input" min="0" value="0" step="any"></td>
        <td><input type="number" class="form-control rank-input" min="1"></td>
        <td class="calculated-prize">${formatCurrency(0)}</td>
      </tr>`;
    }
    tbody.innerHTML = html;
    tbody.querySelectorAll('.kills-input, .extra-amount-input, .rank-input').forEach(inp => inp.addEventListener('input', () => calculateRowPrize(inp.closest('tr'))));
    tbody.querySelectorAll('tr[data-uid]').forEach(row => calculateRowPrize(row));
  } catch (err) { showStatus(getElement('tmsStatus'), 'Error: ' + err.message, 'danger'); tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error loading players.</td></tr>'; }
}

function calculateRowPrize(row) {
  const perKill = parseFloat(row.dataset.perKillPrize || 0);
  const kills = parseInt(row.querySelector('.kills-input')?.value || 0);
  const extra = parseFloat(row.querySelector('.extra-amount-input')?.value || 0);
  const total = (kills * perKill) + extra;
  const cell = row.querySelector('.calculated-prize');
  if (cell) cell.textContent = formatCurrency(total);
}

getElement('creditWinningsBtn').addEventListener('click', async () => {
  const tournamentId = getElement('tmsTournamentSelect').value;
  const selected = getElement('tmsTournamentSelect').options[getElement('tmsTournamentSelect').selectedIndex];
  const name = selected?.dataset?.name || 'Tournament';
  if (!tournamentId) return;
  if (!confirm(`Credit winnings for "${name}"? This action cannot be undone.`)) return;
  showLoader(true);
  const btn = getElement('creditWinningsBtn');
  btn.disabled = true;
  clearStatus(getElement('tmsStatus'));
  const rows = document.querySelectorAll('#tmsPlayerListTableBody tr[data-uid]');
  let totalCredited = 0, playersCredited = 0;
  for (const row of rows) {
    const uid = row.dataset.uid;
    const perKill = parseFloat(row.dataset.perKillPrize || 0);
    const kills = parseInt(row.querySelector('.kills-input')?.value || 0);
    const extra = parseFloat(row.querySelector('.extra-amount-input')?.value || 0);
    const rank = parseInt(row.querySelector('.rank-input')?.value) || 0;
    const totalPrize = (kills * perKill) + extra;
    if (totalPrize <= 0) continue;
    const { data: user } = await supabaseClient.from('users').select('balance, winning_cash, total_earnings, total_matches, won_matches').eq('id', uid).single();
    if (!user) continue;
    const newBalance = (user.balance || 0) + totalPrize;
    const newWinning = (user.winning_cash || 0) + totalPrize;
    const newEarnings = (user.total_earnings || 0) + totalPrize;
    const newMatches = (user.total_matches || 0) + 1;
    const newWins = (rank === 1) ? (user.won_matches || 0) + 1 : (user.won_matches || 0);
    await supabaseClient.from('users').update({ balance: newBalance, winning_cash: newWinning, total_earnings: newEarnings, total_matches: newMatches, won_matches: newWins }).eq('id', uid);
    await supabaseClient.from('transactions').insert([{ user_id: uid, type: 'tournament_winnings', amount: totalPrize, description: `Winnings from ${name}`, timestamp: new Date(), balance_after: newBalance, admin_uid: currentAdminUser.id }]);
    const matchHistory = { tournamentName: name, rank, kills, earnings: totalPrize, date: new Date() };
    const { data: userHist } = await supabaseClient.from('users').select('match_history').eq('id', uid).single();
    const hist = userHist?.match_history || {};
    hist[tournamentId] = matchHistory;
    await supabaseClient.from('users').update({ match_history: hist }).eq('id', uid);
    totalCredited += totalPrize;
    playersCredited++;
  }
  await supabaseClient.from('tournaments').update({ winnings_credited: true, status: 'result' }).eq('id', tournamentId);
  showStatus(getElement('tmsStatus'), `Credited ${formatCurrency(totalCredited)} to ${playersCredited} players.`, 'success');
  addLog('success', `Credited winnings for ${name}: ₹${totalCredited}`);
  loadTournaments();
  loadPlayersForManagement(tournamentId);
  showLoader(false);
  btn.disabled = false;
});
