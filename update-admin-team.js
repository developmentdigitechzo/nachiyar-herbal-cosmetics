const fs = require('fs');
const path = require('path');

const adminHtmlPath = path.resolve(__dirname, 'admin.html');
let html = fs.readFileSync(adminHtmlPath, 'utf8');

// 1. Add nav tab
const navTarget = '<button class="nav-tab" data-tab="settings" id="tabNavSettings">';
const navAddition = `        <button class="nav-tab" data-tab="team" id="tabNavTeam">
          <span class="nav-icon">🛡️</span>
          <span class="nav-text">Admin &amp; Staff Access</span>
          <span class="badge-count" style="background:#10B981; color:#fff;" id="badgeStaffCount">1</span>
        </button>
`;

if (!html.includes('data-tab="team"')) {
  html = html.replace(navTarget, navAddition + '        ' + navTarget);
  console.log('✅ Added team nav tab to sidebar');
}

// 2. Add pane-team before </main>
const teamPaneHtml = `
      <!-- ==================== TAB 11: ADMIN & STAFF ACCESS MANAGEMENT ==================== -->
      <section class="tab-pane" id="pane-team">
        <div class="pane-header">
          <div>
            <h1>Admin &amp; Staff Access Management</h1>
            <p>Create personalized admin accounts, manage staff team credentials, and revoke deleted accounts.</p>
          </div>
          <div class="header-actions">
            <button type="button" class="btn-primary" onclick="focusStaffForm()">
              <span>➕ Add New Staff Member</span>
            </button>
          </div>
        </div>

        <!-- KPI / Summary Cards -->
        <div class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-bottom: 24px;">
          <div class="kpi-card">
            <div class="kpi-icon" style="background:#EEF2FF; color:#4F46E5;">👑</div>
            <div class="kpi-data">
              <span class="kpi-label">Active Admin Accounts</span>
              <h2 class="kpi-val" id="kpiTotalAdmins">1</h2>
              <span class="kpi-sub positive">With Console Access</span>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon" style="background:#F0FDF4; color:#16A34A;">🛡️</div>
            <div class="kpi-data">
              <span class="kpi-label">Security Protocol</span>
              <h2 class="kpi-val" style="font-size: 1.15rem; color:#16A34A;">Role-Based Access</h2>
              <span class="kpi-sub positive">Multi-Admin Enabled</span>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon" style="background:#FEF2F2; color:#DC2626;">🚫</div>
            <div class="kpi-data">
              <span class="kpi-label">Revoked / Deleted IDs</span>
              <h2 class="kpi-val" id="kpiRevokedAdmins" style="color:#DC2626;">0</h2>
              <span class="kpi-sub" style="color:var(--admin-text-muted);">Permanently Blocked</span>
            </div>
          </div>
        </div>

        <!-- 2-Column Responsive Layout: Add Member Form (Left) & Active Accounts List (Right) -->
        <div class="team-layout-grid" style="display: grid; grid-template-columns: minmax(320px, 390px) 1fr; gap: 24px; align-items: start;">
          
          <!-- Column 1: Add New Staff Member Form -->
          <div class="card" style="background:#fff; border:1.5px solid #E2E8F0; border-radius:16px; padding:24px; box-shadow:0 4px 14px rgba(0,0,0,0.03);">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #E2E8F0;">
              <div style="width: 36px; height: 36px; border-radius: 8px; background: #EEF2FF; color: #4F46E5; display: flex; align-items: center; justify-content: center; font-size: 1.1rem;">➕</div>
              <div>
                <h3 style="margin: 0; font-size: 1.05rem; font-weight: 800; color: #1E293B;">Add Staff / Admin Member</h3>
                <small style="color: var(--admin-text-muted);">Grant customized console credentials</small>
              </div>
            </div>

            <form id="formAddStaffMember" onsubmit="handleCreateStaffSubmit(event)">
              <div class="form-group" style="margin-bottom: 14px;">
                <label class="form-label" style="font-size: 0.75rem; font-weight: 700; color: #475569; text-transform: uppercase;">Full Name <span style="color:#DC2626;">*</span></label>
                <input type="text" id="inputStaffName" class="form-input" placeholder="e.g. Muralitharan T S" required style="width: 100%;">
              </div>

              <div class="form-group" style="margin-bottom: 14px;">
                <label class="form-label" style="font-size: 0.75rem; font-weight: 700; color: #475569; text-transform: uppercase;">Staff Username / Login ID <span style="color:#DC2626;">*</span></label>
                <input type="text" id="inputStaffUsername" class="form-input" placeholder="e.g. murali or murali@nachiyar.com" required style="width: 100%;">
                <small style="font-size: 0.7rem; color: #64748B;">Use this ID to log in at the Admin Staff Login page.</small>
              </div>

              <div class="form-group" style="margin-bottom: 14px;">
                <label class="form-label" style="font-size: 0.75rem; font-weight: 700; color: #475569; text-transform: uppercase;">Role &amp; Permissions <span style="color:#DC2626;">*</span></label>
                <select id="selectStaffRole" class="form-input" style="width: 100%; cursor: pointer;">
                  <option value="super_admin">👑 Super Administrator (Full System Control)</option>
                  <option value="inventory_manager">📦 Inventory Manager (Products &amp; Stock)</option>
                  <option value="billing_staff">🧾 Billing &amp; POS Staff (Invoices &amp; Orders)</option>
                </select>
              </div>

              <div class="form-group" style="margin-bottom: 18px;">
                <label class="form-label" style="font-size: 0.75rem; font-weight: 700; color: #475569; text-transform: uppercase;">Login Password <span style="color:#DC2626;">*</span></label>
                <div style="position: relative;">
                  <input type="password" id="inputStaffPassword" class="form-input" placeholder="Enter secure password" required style="width: 100%; padding-right: 40px;">
                  <button type="button" id="btnToggleStaffFormPwd" onclick="toggleStaffFormPwd()" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 1.05rem; color: #64748B;">👁️</button>
                </div>
              </div>

              <button type="submit" class="btn-primary" id="btnSubmitAddStaff" style="width: 100%; justify-content: center; height: 46px; font-weight: 700;">
                <span>👑 Create Admin Member</span>
              </button>
            </form>
          </div>

          <!-- Column 2: Active Admin Accounts List -->
          <div class="card" style="background:#fff; border:1.5px solid #E2E8F0; border-radius:16px; padding:24px; box-shadow:0 4px 14px rgba(0,0,0,0.03);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #E2E8F0; flex-wrap: wrap; gap: 8px;">
              <div>
                <h3 style="margin: 0; font-size: 1.05rem; font-weight: 800; color: #1E293B;">Authorized Console Accounts</h3>
                <small style="color: var(--admin-text-muted);">Accounts that can log in to Admin OS</small>
              </div>
              <span class="badge-tag paid" id="activeAccountsBadgeCount" style="font-weight: 700;">1 Account</span>
            </div>

            <!-- Table of Accounts -->
            <div class="table-container" style="box-shadow: none; border: 1px solid #E2E8F0; border-radius: 12px; overflow-x: auto;">
              <table class="data-table" style="margin: 0; min-width: 580px;">
                <thead>
                  <tr style="background: #F8FAFC;">
                    <th>Staff Member</th>
                    <th>Login Username</th>
                    <th>Role</th>
                    <th>Password</th>
                    <th>Date Added</th>
                    <th style="text-align: right;">Action</th>
                  </tr>
                </thead>
                <tbody id="staffAccountsTableBody">
                  <!-- Dynamically populated -->
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </section>
`;

if (!html.includes('id="pane-team"')) {
  html = html.replace('</main>', teamPaneHtml + '\n    </main>');
  console.log('✅ Added pane-team to workspace');
}

// 3. Add Modal Delete Confirmation before </body>
const deleteModalHtml = `
  <!-- ==================== MODAL: DELETE ADMIN ACCOUNT CONFIRMATION ==================== -->
  <div class="modal-overlay" id="modalDeleteStaffConfirm">
    <div class="modal-box modal-box--small" style="max-width: 440px; text-align: center; padding: 28px;">
      <div style="width: 56px; height: 56px; border-radius: 50%; background: #FEE2E2; color: #DC2626; font-size: 1.8rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
        ⚠️
      </div>
      <h3 style="margin: 0 0 8px 0; font-size: 1.25rem; font-weight: 800; color: #1E293B;">Permanently Revoke Admin ID?</h3>
      <p style="font-size: 0.875rem; color: #64748B; line-height: 1.5; margin-bottom: 20px;">
        Are you sure you want to delete admin account <strong id="deleteTargetUsername" style="color: #0F172A;">-</strong>?
        <br><br>
        <span style="color: #DC2626; font-weight: 700;">⚠️ Once deleted, this ID will NEVER be able to log in to the Admin Console again.</span>
      </p>

      <div style="display: flex; gap: 12px; justify-content: center;">
        <button type="button" class="btn-secondary" id="btnCancelDeleteStaff" style="flex: 1;">Cancel &amp; Keep</button>
        <button type="button" class="btn-primary" id="btnConfirmDeleteStaff" style="background: #DC2626; border-color: #DC2626; flex: 1;">🗑️ Confirm Delete</button>
      </div>
    </div>
  </div>
`;

if (!html.includes('id="modalDeleteStaffConfirm"')) {
  html = html.replace('</body>', deleteModalHtml + '\n</body>');
  console.log('✅ Added delete confirmation modal');
}

fs.writeFileSync(adminHtmlPath, html, 'utf8');
console.log('🎉 admin.html successfully updated with Admin & Staff Access Section!');
