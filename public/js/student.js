/**
 * UniAdmit - Student Dashboard Shared Utilities
 * Handles authentication checks, sidebar/header user population, mobile sidebar toggle,
 * notifications count badge, user dropdown, and global logout.
 */

let currentUser = null;
let currentProfile = null;

// Initialize student portal session
async function initStudentAuth(activePageId) {
  try {
    const res = await fetch('/api/auth/me');
    if (res.status === 401 || res.status === 403) {
      window.location.href = '/?redirect=' + encodeURIComponent(window.location.pathname);
      return null;
    }
    const data = await res.json();
    if (!data.success || !data.user) {
      window.location.href = '/';
      return null;
    }

    // Role check: Only students (or admins in preview) can access
    if (data.user.role !== 'student' && data.user.role !== 'admin') {
      window.location.href = data.user.role === 'manager' ? '/manager/dashboard.html' : '/admin-dashboard.html';
      return null;
    }

    currentUser = data.user;
    currentProfile = data.user.profile || {};

    // Populate user in sidebar & topbar
    populateUserUI(currentUser, currentProfile);

    // Fetch unread notifications count
    fetchNotificationBadge();

    // Setup UI listeners
    setupSidebarToggle();
    setupUserDropdown();

    return { user: currentUser, profile: currentProfile };
  } catch (err) {
    console.error('Auth verification failed:', err);
    window.location.href = '/';
    return null;
  }
}

// Populate user details across common layout elements
function populateUserUI(user, profile) {
  const name = user.full_name || 'Student Candidate';
  const email = user.email || '';
  const initials = getInitials(name);

  // Sidebar User
  const sbName = document.getElementById('sidebarUserName');
  const sbEmail = document.getElementById('sidebarUserEmail');
  const sbAvatar = document.getElementById('sidebarUserAvatar');
  const sbInitials = document.getElementById('sidebarUserInitials');

  if (sbName) sbName.textContent = name;
  if (sbEmail) sbEmail.textContent = email;
  if (profile && profile.photo_path && sbAvatar) {
    sbAvatar.innerHTML = `<img src="${profile.photo_path}" alt="${name}">`;
  } else if (sbInitials) {
    sbInitials.textContent = initials;
  }

  // Topbar User
  const tbName = document.getElementById('topbarUserName');
  const tbAvatar = document.getElementById('topbarAvatar');
  const tbInitials = document.getElementById('topbarInitials');
  const ddName = document.getElementById('dropdownUserName');
  const ddEmail = document.getElementById('dropdownUserEmail');

  if (tbName) tbName.textContent = name;
  if (profile && profile.photo_path && tbAvatar) {
    tbAvatar.innerHTML = `<img src="${profile.photo_path}" alt="${name}">`;
  } else if (tbInitials) {
    tbInitials.textContent = initials;
  }

  if (ddName) ddName.textContent = name;
  if (ddEmail) ddEmail.textContent = email;
}

function getInitials(name) {
  if (!name) return 'S';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// Fetch unread notifications count for bell badge
async function fetchNotificationBadge() {
  try {
    const res = await fetch('/api/notifications');
    if (!res.ok) return;
    const data = await res.json();
    if (data.success) {
      const badge = document.getElementById('topbarNotifBadge');
      const sideBadge = document.getElementById('sidebarNotifBadge');
      const count = data.unread_count || 0;

      if (badge) {
        if (count > 0) {
          badge.textContent = count > 99 ? '99+' : count;
          badge.style.display = 'flex';
        } else {
          badge.style.display = 'none';
        }
      }

      if (sideBadge) {
        if (count > 0) {
          sideBadge.textContent = count > 99 ? '99+' : count;
          sideBadge.style.display = 'inline-block';
        } else {
          sideBadge.style.display = 'none';
        }
      }
    }
  } catch (e) {
    // Silent fail
  }
}

// Mobile sidebar toggle and overlay
function setupSidebarToggle() {
  const mobileBtn = document.getElementById('mobileMenuBtn');
  const closeBtn = document.getElementById('sidebarCloseBtn');
  const sidebar = document.querySelector('.sidebar');
  let overlay = document.querySelector('.sidebar-overlay');

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
  }

  if (mobileBtn && sidebar) {
    mobileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.toggle('mobile-open');
      overlay.classList.toggle('active');
    });
  }

  if (closeBtn && sidebar) {
    closeBtn.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      overlay.classList.remove('active');
    });
  }

  overlay.addEventListener('click', () => {
    if (sidebar) sidebar.classList.remove('mobile-open');
    overlay.classList.remove('active');
  });
}

// Topbar user dropdown menu toggle
function setupUserDropdown() {
  const btn = document.getElementById('topbarUserBtn');
  const dropdown = document.getElementById('userDropdown');

  if (btn && dropdown) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
        dropdown.classList.remove('active');
      }
    });
  }
}

// Logout
async function handleLogout() {
  try {
    const res = await fetch('/api/auth/logout', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      window.location.href = '/';
    } else {
      alert('Error during logout');
    }
  } catch (err) {
    console.error('Logout error:', err);
    window.location.href = '/';
  }
}

// Toast notification system
function showToast(message, type = 'info') {
  let toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.className = 'toast-container';
    toastContainer.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = `alert alert-${type === 'error' ? 'danger' : type}`;
  toast.style.cssText = 'pointer-events:auto;min-width:280px;max-width:420px;box-shadow:0 8px 24px rgba(0,0,0,0.15);margin-bottom:0;display:flex;align-items:center;gap:10px;animation:fadeIn 0.25s ease;';
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  else if (type === 'error' || type === 'danger') icon = '⚠️';
  else if (type === 'warning') icon = '🔔';

  toast.innerHTML = `
    <span>${icon}</span>
    <span style="flex:1;font-size:14px;font-weight:500;">${message}</span>
  `;

  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
