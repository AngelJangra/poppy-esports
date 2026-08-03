// admin-promotions.js – Promotions CRUD
async function loadPromotions() {
  const { data, error } = await supabaseClient.from('promotions').select('*');
  if (error) return;
  const tbody = getElement('promotionsTableBody');
  tbody.innerHTML = '';
  data.forEach(p => {
    const enabled = p.enabled !== false;
    tbody.innerHTML += `
      <tr>
        <td><img src="${p.image_url}" class="preview-img"></td>
        <td>${p.link ? `<a href="${p.link}" target="_blank">${p.link.substring(0,30)}</a>` : 'No Link'}</td>
        <td><span class="status-badge text-bg-${enabled ? 'success' : 'secondary'}">${enabled ? 'Enabled' : 'Disabled'}</span></td>
        <td class="action-buttons">
          <button class="btn btn-sm btn-info btn-edit-promo" data-id="${p.id}"><i class="bi bi-pencil-square"></i></button>
          <button class="btn btn-sm btn-danger btn-delete-promo" data-id="${p.id}"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `;
  });
}

async function deletePromotion(id) { if (!confirm('Delete promotion?')) return; await supabaseClient.from('promotions').delete().eq('id', id); loadPromotions(); addLog('info', `Promotion deleted: ${id}`); }
async function openEditPromotionModal(id) {
  const { data: promo } = await supabaseClient.from('promotions').select('*').eq('id', id).single();
  if (!promo) return;
  getElement('promotionModalTitle').textContent = 'Edit Promotion';
  getElement('promotionEditId').value = id;
  getElement('promoImageUrl').value = promo.image_url;
  getElement('promoLink').value = promo.link || '';
  getElement('promoEnabled').checked = promo.enabled !== false;
  bootstrap.Modal.getInstance(getElement('promotionModal')).show();
}

getElement('savePromotionBtn').addEventListener('click', async () => {
  const id = getElement('promotionEditId').value;
  let image_url = getElement('promoImageUrl').value.trim();
  const link = getElement('promoLink').value.trim();
  const enabled = getElement('promoEnabled').checked;
  const file = getElement('promoImageFile').files[0];
  if (file) {
    const fd = new FormData(); fd.append('image', file);
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: fd });
    const json = await res.json();
    if (json.success) image_url = json.data.url;
  }
  if (!image_url) { showStatus(getElement('promotionStatus'), 'Image URL required.', 'warning'); return; }
  if (id) await supabaseClient.from('promotions').update({ image_url, link, enabled }).eq('id', id);
  else await supabaseClient.from('promotions').insert([{ image_url, link, enabled, created_at: new Date() }]);
  bootstrap.Modal.getInstance(getElement('promotionModal')).hide();
  loadPromotions();
  addLog('success', `Promotion ${id ? 'updated' : 'added'}: ${image_url}`);
});
getElement('addNewPromotionBtn').addEventListener('click', () => {
  getElement('promotionModalTitle').textContent = 'Add New Promotion';
  getElement('promotionEditId').value = '';
  getElement('promotionForm').reset();
  getElement('promoEnabled').checked = true;
});
