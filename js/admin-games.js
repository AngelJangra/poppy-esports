// admin-games.js – Games CRUD
async function loadGames() {
  const { data, error } = await supabaseClient.from('games').select('*');
  if (error) return;
  gameDataCache = data.reduce((acc, g) => { acc[g.id] = g.name; return acc; }, {});
  const tbody = getElement('gamesTableBody');
  tbody.innerHTML = '';
  data.forEach(game => {
    tbody.innerHTML += `
      <tr>
        <td><img src="${game.image_url}" class="preview-img"></td>
        <td>${game.name}</td>
        <td><small class="text-muted">${game.id}</small> <i class="bi bi-clipboard copy-btn" data-target="td:nth-child(3) > small"></i></td>
        <td class="action-buttons">
          <button class="btn btn-sm btn-info btn-edit-game" data-id="${game.id}"><i class="bi bi-pencil-square"></i></button>
          <button class="btn btn-sm btn-danger btn-delete-game" data-id="${game.id}"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `;
  });
}

async function deleteGame(id) { if (!confirm('Delete game?')) return; await supabaseClient.from('games').delete().eq('id', id); loadGames(); addLog('info', `Game deleted: ${id}`); }
async function openEditGameModal(id) {
  const { data: game } = await supabaseClient.from('games').select('*').eq('id', id).single();
  if (!game) return;
  getElement('gameModalTitle').textContent = 'Edit Game';
  getElement('gameEditId').value = id;
  getElement('gameName').value = game.name;
  getElement('gameImageUrl').value = game.image_url;
  bootstrap.Modal.getInstance(getElement('gameModal')).show();
}

getElement('saveGameBtn').addEventListener('click', async () => {
  const id = getElement('gameEditId').value;
  const name = getElement('gameName').value.trim();
  let image_url = getElement('gameImageUrl').value.trim();
  const file = getElement('gameImageFile').files[0];
  if (file) {
    const fd = new FormData(); fd.append('image', file);
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: fd });
    const json = await res.json();
    if (json.success) image_url = json.data.url;
  }
  if (!name || !image_url) { showStatus(getElement('gameStatus'), 'Name and image required.', 'warning'); return; }
  if (id) await supabaseClient.from('games').update({ name, image_url }).eq('id', id);
  else await supabaseClient.from('games').insert([{ name, image_url, created_at: new Date() }]);
  bootstrap.Modal.getInstance(getElement('gameModal')).hide();
  loadGames();
  addLog('success', `Game ${id ? 'updated' : 'added'}: ${name}`);
});
getElement('addNewGameBtn').addEventListener('click', () => {
  getElement('gameModalTitle').textContent = 'Add New Game';
  getElement('gameEditId').value = '';
  getElement('gameForm').reset();
});
