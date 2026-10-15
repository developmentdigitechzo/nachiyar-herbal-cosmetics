const fs = require('fs');
const path = require('path');

const adminJsPath = path.resolve(__dirname, 'admin.js');
let js = fs.readFileSync(adminJsPath, 'utf8');

const targetMarker = 'restoreActiveTab();';

const staffModuleCode = `
  // =========================================================================
  // 11. ADMIN & STAFF ACCESS MANAGEMENT MODULE
  // =========================================================================
  let staffAccounts = [];
  let deleteTargetAccount = null;

  const defaultAdminAccounts = [
    {
      id: 'admin_master',
      name: 'Super Administrator',
      username: 'admin',
      role: 'super_admin',
      password: 'admin123',
      createdAt: '2026-10-15'
    },
    {
      id: 'admin_inventory',
      name: 'Inventory Manager',
      username: 'inventory',
      role: 'inventory_manager',
      password: 'inventory123',
      createdAt: '2026-10-15'
    },
    {
      id: 'admin_billing',
      name: 'POS & Billing Staff',
      username: 'billing',
      role: 'billing_staff',
      password: 'billing123',
      createdAt: '2026-10-15'
    }
  ];

  function getStoredAdminAccounts() {
    const raw = localStorage.getItem('nachiyar_admin_accounts');
    const deletedList = JSON.parse(localStorage.getItem('nachiyar_deleted_admins') || '[]');

    if (!raw) {
      const initial = defaultAdminAccounts.filter(acc => !deletedList.includes(acc.username.toLowerCase()));
      localStorage.setItem('nachiyar_admin_accounts', JSON.stringify(initial));
      return initial;
    }

    try {
      const parsed = JSON.parse(raw);
      return parsed.filter(acc => !deletedList.includes(acc.username.toLowerCase()));
    } catch (e) {
      return defaultAdminAccounts;
    }
  }

  function saveStoredAdminAccounts(list) {
    staffAccounts = list;
    localStorage.setItem('nachiyar_admin_accounts', JSON.stringify(list));
    renderStaffAccountsTable();
    updateStaffBadges();
  }

  function updateStaffBadges() {
    const totalCount = staffAccounts.length;
    const deletedList = JSON.parse(localStorage.getItem('nachiyar_deleted_admins') || '[]');
    
    const badgeStaffCount = document.getElementById('badgeStaffCount');
    const kpiTotalAdmins = document.getElementById('kpiTotalAdmins');
    const kpiRevokedAdmins = document.getElementById('kpiRevokedAdmins');
    const activeBadge = document.getElementById('activeAccountsBadgeCount');

    if (badgeStaffCount) badgeStaffCount.textContent = totalCount;
    if (kpiTotalAdmins) kpiTotalAdmins.textContent = totalCount;
    if (kpiRevokedAdmins) kpiRevokedAdmins.textContent = deletedList.length;
    if (activeBadge) activeBadge.textContent = totalCount + (totalCount === 1 ? ' Account' : ' Accounts');
  }

  function renderStaffAccountsTable() {
    const tbody = document.getElementById('staffAccountsTableBody');
    if (!tbody) return;

    if (staffAccounts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 36px; color: var(--admin-text-muted);"><div style="font-size: 2rem; margin-bottom: 8px;">🛡️</div><strong>No active admin accounts found.</strong><br><small>Create a new staff member using the form on the left.</small></td></tr>';
      return;
    }

    tbody.innerHTML = staffAccounts.map(acc => {
      const roleLabel = acc.role === 'super_admin' ? '👑 Super Admin' : (acc.role === 'inventory_manager' ? '📦 Inventory' : '🧾 Billing / POS');
      const roleBadgeClass = acc.role === 'super_admin' ? 'badge-tag paid' : 'badge-tag pending';
      const createdDate = acc.createdAt || new Date().toISOString().split('T')[0];
      const pwdId = 'pwd_' + (acc.id || 'id').replace(/[^a-zA-Z0-9]/g, '');

      return '<tr>' +
        '<td>' +
          '<div style="display: flex; align-items: center; gap: 10px;">' +
            '<div style="width: 36px; height: 36px; border-radius: 50%; background: #F1F5F9; color: #475569; font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; border: 1.5px solid #E2E8F0;">' +
              (acc.name || acc.username || 'A').charAt(0).toUpperCase() +
            '</div>' +
            '<div>' +
              '<strong style="color: #1E293B; font-size: 0.875rem; display: block;">' + escapeHtml(acc.name || acc.username) + '</strong>' +
              '<small style="color: var(--admin-text-muted); font-size: 0.72rem;">ID: ' + escapeHtml(acc.id || '') + '</small>' +
            '</div>' +
          '</div>' +
        '</td>' +
        '<td>' +
          '<code style="background: #F1F5F9; padding: 4px 8px; border-radius: 6px; font-weight: 700; color: #0F172A; font-size: 0.8125rem;">' +
            escapeHtml(acc.username) +
          '</code>' +
        '</td>' +
        '<td>' +
          '<span class="' + roleBadgeClass + '" style="font-weight: 700; font-size: 0.72rem;">' + roleLabel + '</span>' +
        '</td>' +
        '<td>' +
          '<div style="display: flex; align-items: center; gap: 6px;">' +
            '<span id="' + pwdId + '" style="font-family: monospace; font-size: 0.85rem; letter-spacing: 2px; color: #475569;">••••••••</span>' +
            '<button type="button" class="btn-icon" title="View/Hide Password" onclick="togglePasswordDisplay(\\'' + pwdId + '\\', \\'' + escapeHtml(acc.password || 'admin123') + '\\')" style="background: none; border: none; cursor: pointer; font-size: 0.95rem; opacity: 0.7;">' +
              '👁️' +
            '</button>' +
          '</div>' +
        '</td>' +
        '<td>' +
          '<small style="color: #64748B; font-size: 0.75rem;">' + createdDate + '</small>' +
        '</td>' +
        '<td style="text-align: right;">' +
          '<button type="button" class="btn-danger btn-sm" onclick="promptDeleteStaffAccount(\\'' + escapeHtml(acc.id) + '\\', \\'' + escapeHtml(acc.username) + '\\')" title="Revoke and delete this admin login ID" style="background:#FEE2E2; color:#DC2626; border:1px solid #FECACA; padding:5px 12px; border-radius:8px; font-size:0.75rem; font-weight:700; cursor:pointer;">' +
            '🗑️ Delete' +
          '</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  window.togglePasswordDisplay = function(elementId, actualPwd) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (el.textContent === '••••••••') {
      el.textContent = actualPwd;
      el.style.letterSpacing = 'normal';
      el.style.fontWeight = '700';
      el.style.color = '#7C5AAB';
    } else {
      el.textContent = '••••••••';
      el.style.letterSpacing = '2px';
      el.style.fontWeight = 'normal';
      el.style.color = '#475569';
    }
  };

  window.focusStaffForm = function() {
    switchTab('team');
    const input = document.getElementById('inputStaffName');
    if (input) {
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input.focus();
    }
  };

  window.toggleStaffFormPwd = function() {
    const pwdInput = document.getElementById('inputStaffPassword');
    const btn = document.getElementById('btnToggleStaffFormPwd');
    if (pwdInput) {
      const isPwd = pwdInput.type === 'password';
      pwdInput.type = isPwd ? 'text' : 'password';
      if (btn) btn.textContent = isPwd ? '🙈' : '👁️';
    }
  };

  window.handleCreateStaffSubmit = async function(e) {
    e.preventDefault();

    const name = document.getElementById('inputStaffName').value.trim();
    const rawUsername = document.getElementById('inputStaffUsername').value.trim();
    const cleanUsername = rawUsername.toLowerCase().replace(/[^a-z0-9_.-]/g, '');
    const role = document.getElementById('selectStaffRole').value;
    const password = document.getElementById('inputStaffPassword').value;
    const btn = document.getElementById('btnSubmitAddStaff');

    if (!name || !cleanUsername || !password) {
      showToast('Please fill in all required fields.');
      return;
    }

    if (staffAccounts.some(acc => acc.username.toLowerCase() === cleanUsername)) {
      showToast('Admin ID "' + cleanUsername + '" is already in use. Please choose another username.');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span>⏳ Creating Member...</span>';

    const newAccount = {
      id: 'staff_' + Date.now(),
      name: name,
      username: cleanUsername,
      email: cleanUsername.includes('@') ? cleanUsername : (cleanUsername + '@nachiyarherbals.com'),
      role: role,
      password: password,
      createdAt: new Date().toISOString().split('T')[0]
    };

    let deletedList = JSON.parse(localStorage.getItem('nachiyar_deleted_admins') || '[]');
    deletedList = deletedList.filter(u => u !== cleanUsername);
    localStorage.setItem('nachiyar_deleted_admins', JSON.stringify(deletedList));

    try {
      await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name,
          username: cleanUsername,
          email: newAccount.email,
          password: password,
          role: role
        })
      });
    } catch (err) {
      console.warn('Backend staff sync note (local fallback active):', err.message);
    }

    staffAccounts.unshift(newAccount);
    saveStoredAdminAccounts(staffAccounts);

    showToast('👑 Admin account created for ' + name + '! (Login ID: ' + cleanUsername + ')');

    document.getElementById('inputStaffName').value = '';
    document.getElementById('inputStaffUsername').value = '';
    document.getElementById('inputStaffPassword').value = '';
    btn.disabled = false;
    btn.innerHTML = '<span>👑 Create Admin Member</span>';
  };

  window.promptDeleteStaffAccount = function(id, username) {
    if (staffAccounts.length <= 1) {
      alert('Security Protection: You cannot delete the only remaining admin account! Create another admin first.');
      return;
    }

    deleteTargetAccount = { id: id, username: username };
    const modal = document.getElementById('modalDeleteStaffConfirm');
    const label = document.getElementById('deleteTargetUsername');
    if (label) label.textContent = '"' + username + '"';
    if (modal) modal.classList.add('active');
  };

  const btnCancelDeleteStaff = document.getElementById('btnCancelDeleteStaff');
  const btnConfirmDeleteStaff = document.getElementById('btnConfirmDeleteStaff');

  if (btnCancelDeleteStaff) {
    btnCancelDeleteStaff.onclick = function() {
      const modal = document.getElementById('modalDeleteStaffConfirm');
      if (modal) modal.classList.remove('active');
      deleteTargetAccount = null;
    };
  }

  if (btnConfirmDeleteStaff) {
    btnConfirmDeleteStaff.onclick = async function() {
      if (!deleteTargetAccount) return;

      const id = deleteTargetAccount.id;
      const username = deleteTargetAccount.username;
      const cleanUser = username.toLowerCase();

      const deletedList = JSON.parse(localStorage.getItem('nachiyar_deleted_admins') || '[]');
      if (!deletedList.includes(cleanUser)) {
        deletedList.push(cleanUser);
        localStorage.setItem('nachiyar_deleted_admins', JSON.stringify(deletedList));
      }

      staffAccounts = staffAccounts.filter(acc => acc.id !== id && acc.username.toLowerCase() !== cleanUser);
      saveStoredAdminAccounts(staffAccounts);

      try {
        await fetch('/api/auth/users/' + encodeURIComponent(id), {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-token': localStorage.getItem('nachiyar_admin_token') || ''
          }
        });
      } catch (err) {
        console.warn('Backend delete sync note:', err.message);
      }

      const modal = document.getElementById('modalDeleteStaffConfirm');
      if (modal) modal.classList.remove('active');
      deleteTargetAccount = null;

      showToast('Admin account "' + username + '" permanently deleted and revoked.');
    };
  }

  function initStaffManagement() {
    staffAccounts = getStoredAdminAccounts();
    renderStaffAccountsTable();
    updateStaffBadges();

    fetch('/api/auth/users', {
      headers: { 'x-admin-token': localStorage.getItem('nachiyar_admin_token') || '' }
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.success && Array.isArray(data.users)) {
          const deletedList = JSON.parse(localStorage.getItem('nachiyar_deleted_admins') || '[]');
          data.users.forEach(dbUser => {
            const cleanU = dbUser.username.toLowerCase();
            if (!deletedList.includes(cleanU) && !staffAccounts.some(a => a.username.toLowerCase() === cleanU)) {
              staffAccounts.push({
                id: dbUser.id,
                name: dbUser.name || dbUser.username,
                username: dbUser.username,
                email: dbUser.email || '',
                role: dbUser.role || 'super_admin',
                password: '••••••••',
                createdAt: (dbUser.created_at || '').split('T')[0] || '2026-10-15'
              });
            }
          });
          saveStoredAdminAccounts(staffAccounts);
        }
      })
      .catch(() => {});
  }

`;

if (!js.includes('initStaffManagement')) {
  js = js.replace(targetMarker, staffModuleCode + '\n  initStaffManagement();\n  ' + targetMarker);
  fs.writeFileSync(adminJsPath, js, 'utf8');
  console.log('✅ Injected staff management module into admin.js');
} else {
  console.log('Already present in admin.js');
}
