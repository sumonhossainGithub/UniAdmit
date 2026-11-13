/**
 * UniAdmit - Student Admission Management System
 * Shared Admin Common Utilities & Navigation Handler
 */

// Global State
let currentAdminUser = null;

/**
 * Check Admin Authentication
 * Verifies the current session belongs to an admin user
 */
async function checkAdminAuth() {
  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) {
      window.location.href = '/';
      return null;
    }

    const data = await res.json();
    if ((!data.authenticated && !data.success) || !data.user || data.user.role !== 'admin') {
      window.location.href = '/login.html';
      return null;
    }

    currentAdminUser = data.user;
    updateUserInterface(data.user);
    loadSidebarBadgeCounts();
    return data.user;
  } catch (err) {
    console.error('Auth verification failed:', err);
    window.location.href = '/';
    return null;
  }
}

/**
 * Update UI elements with current admin user details
 */
function updateUserInterface(user) {
  // Sidebar user
  const sidebarUserName = document.getElementById('sidebarUserName');
  const sidebarUserAvatar = document.getElementById('sidebarUserAvatar');
  const topbarUserName = document.getElementById('topbarUserName');
  const topbarUserAvatar = document.getElementById('topbarUserAvatar');

  const initials = user.full_name
    ? user.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'AD';

  if (sidebarUserName) sidebarUserName.textContent = user.full_name || 'Admin';
  if (sidebarUserAvatar) sidebarUserAvatar.textContent = initials;
  if (topbarUserName) topbarUserName.textContent = user.full_name || 'Admin';
  if (topbarUserAvatar) topbarUserAvatar.textContent = initials;
}

/**
 * Load Sidebar Badge Counts from Admin Stats API
 */
async function loadSidebarBadgeCounts() {
  try {
    const res = await fetch('/api/admin/stats');
    if (!res.ok) return;
    const data = await res.json();
    if (!data.success || !data.stats) return;

    const docBadge = document.getElementById('sidebarDocBadge');
    const appBadge = document.getElementById('sidebarAppBadge');
    const payBadge = document.getElementById('sidebarPayBadge');

    if (docBadge) {
      const count = data.stats.pendingVerifications || 0;
      docBadge.textContent = count;
      docBadge.style.display = count > 0 ? 'inline-block' : 'none';
    }

    if (appBadge) {
      const count = data.stats.pendingApplications || 0;
      appBadge.textContent = count;
      appBadge.style.display = count > 0 ? 'inline-block' : 'none';
    }

    if (payBadge) {
      const count = data.stats.pendingPaymentsCount || 0;
      payBadge.textContent = count;
      payBadge.style.display = count > 0 ? 'inline-block' : 'none';
    }
  } catch (e) {
    // Silently fail for badge background update
  }
}

/**
 * Handle Logout
 */
async function handleAdminLogout(e) {
  if (e) e.preventDefault();
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (err) {
    console.error('Logout error:', err);
  } finally {
    window.location.href = '/';
  }
}

/**
 * Show Toast Notification
 */
function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const typeClass = type === 'error' ? 'toast-error' : type === 'warning' ? 'toast-warning' : type === 'info' ? 'toast-info' : 'toast-success';
  toast.className = `toast ${typeClass}`;

  const icon = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'info' ? 'ℹ️' : '✅';

  toast.innerHTML = `
    <div style="display:flex; align-items:flex-start; gap:10px; width:100%;">
      <span style="font-size:1.1rem; line-height:1;">${icon}</span>
      <div style="flex:1; font-size:0.9rem; line-height:1.4;">${escapeHtml(message)}</div>
      <button type="button" style="background:none; border:none; color:#64748b; cursor:pointer; font-size:1rem; padding:0;" onclick="this.closest('.toast').remove()">✕</button>
    </div>
    <div class="toast-progress-bar"></div>
  `;

  container.appendChild(toast);

  // Auto remove after 4.5 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

/**
 * Modal Management Helpers
 */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Close modals on clicking overlay backdrop
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
    document.body.style.overflow = '';
  }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(m => {
      m.classList.remove('active');
    });
    document.body.style.overflow = '';
  }
});

/**
 * Mobile Sidebar Drawer Toggle
 */
function initSidebarToggle() {
  const toggleBtn = document.getElementById('sidebarToggleBtn');
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const appLayout = document.getElementById('appLayout');
  const sidebar = document.getElementById('sidebar');

  if (toggleBtn && appLayout) {
    toggleBtn.addEventListener('click', () => {
      appLayout.classList.toggle('sidebar-collapsed');
    });
  }

  if (mobileMenuBtn && sidebar) {
    mobileMenuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
    });
  }
}

/**
 * Utility Formatters
 */
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    return dateStr;
  }
}

function formatDateTime(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateStr;
  }
}

function formatCurrency(amount) {
  const num = parseFloat(amount || 0);
  return '৳ ' + num.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getStatusBadge(status) {
  const s = String(status || '').toLowerCase();
  switch (s) {
    case 'approved':
      return `<span class="badge badge-pill badge-approved"><span class="badge-dot" style="background:var(--color-success);"></span>Approved</span>`;
    case 'under_review':
      return `<span class="badge badge-pill badge-review"><span class="badge-dot" style="background:var(--color-info);"></span>Under Review</span>`;
    case 'rejected':
      return `<span class="badge badge-pill badge-rejected"><span class="badge-dot" style="background:var(--color-danger);"></span>Rejected</span>`;
    case 'waitlisted':
      return `<span class="badge badge-pill badge-warning"><span class="badge-dot" style="background:var(--color-warning);"></span>Waitlisted</span>`;
    case 'pending':
    default:
      return `<span class="badge badge-pill badge-pending"><span class="badge-dot" style="background:var(--color-warning);"></span>Pending</span>`;
  }
}

function getPaymentBadge(status) {
  const s = String(status || '').toLowerCase();
  switch (s) {
    case 'verified':
      return `<span class="badge badge-pill badge-approved">Verified</span>`;
    case 'paid':
      return `<span class="badge badge-pill badge-warning">Pending Verification</span>`;
    case 'rejected':
      return `<span class="badge badge-pill badge-rejected">Rejected</span>`;
    case 'unpaid':
    default:
      return `<span class="badge badge-pill badge-rejected">Unpaid</span>`;
  }
}

function getDocBadge(verified) {
  return verified == 1 || verified === true
    ? `<span class="badge badge-pill badge-approved">✓ Verified</span>`
    : `<span class="badge badge-pill badge-pending">⏳ Pending</span>`;
}

// Attach logout listeners on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  initSidebarToggle();
  const logoutBtn = document.getElementById('logoutBtn');
  const quickLogoutBtn = document.getElementById('quickLogoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', handleAdminLogout);
  if (quickLogoutBtn) quickLogoutBtn.addEventListener('click', handleAdminLogout);
});
