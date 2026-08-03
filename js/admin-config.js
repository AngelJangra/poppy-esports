// admin-config.js – POPPY ESPORTS Admin Config
const SUPABASE_URL = 'https://ozfrhmbtgjquagxbinjv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96ZnJobWJ0Z2pxdWFneGJpbmp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2Mjg1NTQsImV4cCI6MjEwMTIwNDU1NH0.aUvqIJ4vyiWfgR96dscEFNL1xyoHeCtOUlZCRqN_YiI';
const IMGBB_API_KEY = '5a9a4df0c64cde49735902ccdc60b7af';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global state
let currentAdminUser = null;
let designatedAdminUid = null;
let dbListeners = {};
let appSettings = {};
let fullUserDataCache = {};
let gameDataCache = {};
let currentWithdrawalAction = { id: null, type: null, userId: null };
let currentPlayersListForPdf = [];
let newUserChart = null;

// Helpers
const getElement = (id) => document.getElementById(id);
const showLoader = (show) => { const el = getElement('adminLoader'); if (el) el.style.display = show ? 'flex' : 'none'; };
function showStatus(element, message, type = 'danger', autohide = 5000) {
  if (!element) return;
  element.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`;
  element.style.display = 'block';
  if (autohide) setTimeout(() => { if (element.innerHTML.includes(message)) element.style.display = 'none'; }, autohide);
}
function clearStatus(element) { if (element) element.innerHTML = ''; }
function formatDate(timestamp) { if (!timestamp) return 'N/A'; const d = new Date(timestamp); return d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }); }
function formatCurrency(amount) { return `₹ ${(amount || 0).toFixed(2)}`; }
function sanitizeHTML(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
function copyToClipboard(selector) { const el = document.querySelector(selector); if (!el) return; navigator.clipboard.writeText(el.textContent).catch(() => alert('Copy failed.')); }
const tableLoadingPlaceholderHtml = (cols) => `<tr class="loading-placeholder"><td colspan="${cols}"><div class="placeholder w-100 py-3"></div></td></tr>`.repeat(2);
