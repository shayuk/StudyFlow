(function () {
  const usersBody = document.getElementById('usersBody');
  const refreshBtn = document.getElementById('refreshBtn');
  const statusEl = document.getElementById('status');
  const errorEl = document.getElementById('error');
  const tokenInput = document.getElementById('tokenInput');
  const setTokenBtn = document.getElementById('setTokenBtn');
  const clearTokenBtn = document.getElementById('clearTokenBtn');
  const authModeEl = document.getElementById('authMode');

  const ROLE_UI = ['student', 'lecturer', 'admin'];
  function toBackendRole(role) { return role === 'lecturer' ? 'instructor' : role; }
  function fromBackendRole(role) { return role === 'instructor' ? 'lecturer' : role; }

  // --- Auth mode detection ---
  const params = new URLSearchParams(window.location.search);
  const devMode = params.get('dev') === '1';
  let bearerToken = localStorage.getItem('sf_admin_jwt') || '';
  if (tokenInput) tokenInput.value = bearerToken;

  function buildHeaders() {
    const h = { 'Content-Type': 'application/json' };
    if (bearerToken) {
      h['Authorization'] = 'Bearer ' + bearerToken;
      setAuthMode('JWT Bearer');
    } else if (devMode) {
      // In dev, backend may allow dev headers if DEV_AUTH_MODE=true
      h['x-role'] = 'admin';
      h['x-org-id'] = 'dev-org';
      h['x-user-id'] = 'dev-admin';
      setAuthMode('DEV headers (?dev=1)');
    } else {
      setAuthMode('No auth — requests will fail (provide JWT)');
    }
    return h;
  }

  function setAuthMode(text) {
    if (authModeEl) authModeEl.textContent = text;
  }

  async function listUsers() {
    const res = await fetch('/api/users', { headers: buildHeaders() });
    if (!res.ok) throw new Error('Failed to load users');
    const data = await res.json();
    return (data.items || []).map(u => ({
      id: u.id,
      email: u.email || null,
      name: u.name || null,
      role: fromBackendRole(u.role),
      createdAt: u.createdAt,
    }));
  }

  async function updateUserRole(userId, role) {
    const res = await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: buildHeaders(),
      body: JSON.stringify({ role: toBackendRole(role) })
    });
    if (!res.ok) {
      let err = {};
      try { err = await res.json(); } catch (_) {}
      throw new Error(err.error || 'Failed to update role');
    }
  }

  function render(users) {
    usersBody.innerHTML = '';
    users.forEach(u => {
      const tr = document.createElement('tr');
      const tdRole = document.createElement('td');
      const tdName = document.createElement('td');
      const tdEmail = document.createElement('td');

      tdName.textContent = u.name || '—';
      tdEmail.textContent = u.email || '—';

      const select = document.createElement('select');
      ROLE_UI.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r;
        opt.textContent = r;
        if (u.role === r) opt.selected = true;
        select.appendChild(opt);
      });

      select.addEventListener('change', async (e) => {
        const nextRole = e.target.value;
        const prev = u.role;
        u.role = nextRole;
        select.disabled = true;
        statusEl.textContent = 'Updating…';
        try {
          await updateUserRole(u.id, nextRole);
          statusEl.textContent = 'Updated';
        } catch (err) {
          u.role = prev;
          select.value = prev;
          showError(err.message || 'Failed to update');
        } finally {
          select.disabled = false;
        }
      });

      tdRole.appendChild(select);
      tr.appendChild(tdName);
      tr.appendChild(tdRole);
      tr.appendChild(tdEmail);
      usersBody.appendChild(tr);
    });
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
    setTimeout(() => { errorEl.style.display = 'none'; }, 4000);
  }

  async function load() {
    statusEl.textContent = 'Loading…';
    try {
      const users = await listUsers();
      render(users);
      statusEl.textContent = 'Ready';
    } catch (e) {
      statusEl.textContent = '';
      showError(e.message || 'Failed to load');
    }
  }

  refreshBtn.addEventListener('click', load);
  if (setTokenBtn) setTokenBtn.addEventListener('click', () => {
    bearerToken = (tokenInput?.value || '').trim();
    if (bearerToken) localStorage.setItem('sf_admin_jwt', bearerToken);
    else localStorage.removeItem('sf_admin_jwt');
    load();
  });
  if (clearTokenBtn) clearTokenBtn.addEventListener('click', () => {
    bearerToken = '';
    if (tokenInput) tokenInput.value = '';
    localStorage.removeItem('sf_admin_jwt');
    load();
  });
  load();
})();
