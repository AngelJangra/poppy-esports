// admin-logs.js – Logs modal
const logs = [];
function addLog(level, message) {
  const entry = { timestamp: new Date().toISOString(), level, message };
  logs.push(entry);
  if (logs.length > 500) logs.shift();
  if (document.getElementById('logsModal').classList.contains('show')) renderLogs();
}
function renderLogs() {
  const container = document.getElementById('logsContainer');
  if (logs.length === 0) { container.innerHTML = '<div class="log-empty">No logs recorded yet.</div>'; return; }
  let html = '';
  [...logs].reverse().forEach(log => {
    const time = new Date(log.timestamp).toLocaleString();
    const lvl = log.level || 'info';
    html += `<div class="log-entry"><span class="log-time">${time}</span><span class="log-level ${lvl}">${lvl.toUpperCase()}</span><span class="log-message">${log.message}</span></div>`;
  });
  container.innerHTML = html;
}
document.getElementById('clearLogsBtn').addEventListener('click', () => { if (confirm('Clear logs?')) { logs.length = 0; renderLogs(); addLog('info', 'Logs cleared.'); } });
document.getElementById('exportLogsBtn').addEventListener('click', () => {
  if (logs.length === 0) { alert('No logs to export.'); return; }
  let csv = 'Timestamp,Level,Message\n';
  logs.forEach(log => csv += `"${log.timestamp}","${log.level || 'info'}","${log.message.replace(/"/g,'""')}"\n`);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `admin_logs_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  addLog('info', 'Logs exported.');
});
document.getElementById('viewLogsBtn').addEventListener('click', () => { renderLogs(); bootstrap.Modal.getInstance(document.getElementById('logsModal')).show(); });
