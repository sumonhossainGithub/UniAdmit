/**
 * UniAdmit Manager Portal - Common Helper Scripts
 * Handles manager authentication, layout initialization, sidebar toggling,
 * toast alerts, and universal utility functions.
 */

window.ManagerApp = {
  currentUser: null,

  /**
   * Initialize manager session & auth verification
   * @param {string} activeNavId - Menu item ID to highlight as active
   * @param {string} pageTitle - Title of current page
   * @param {Function} onReady - Callback once manager is authenticated
   */
  async initSession(activeNavId, pageTitle, onReady) {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) {
        window.location.href = '/?redirect=' + encodeURIComponent(window.location.pathname);
        return;
      }

      const data = await res.json();
      if (!data.success || !data.user || (data.user.role !== 'manager' && data.user.role !== 'admin')) {
        alert('Access denied: You must be signed in as a Manager to access this page.');
        window.location.href = '/';
        return;
      }

      this.currentUser = data.user;

      // Update UI elements with current manager's info
      const nameEls = document.querySelectorAll('.manager-full-name');
      nameEls.forEach(el => el.textContent = data.user.full_name || 'Manager');

      const emailEls = document.querySelectorAll('.manager-email');
      emailEls.forEach(el => el.textContent = data.user.email || 'manager@uniadmit.com');

      const avatarEls = document.querySelectorAll('.manager-avatar-initial');
      avatarEls.forEach(el => {
        const initial = (data.user.full_name || 'M').charAt(0).toUpperCase();
        el.textContent = initial;
      });

      // Highlight active menu item
      if (activeNavId) {
        const link = document.querySelector(`[data-nav="${activeNavId}"]`);
        if (link) {
          link.classList.add('active');
        }
      }

      // Live clock updater
      this.initClock();

      // Mobile sidebar setup
      this.initMobileSidebar();

      // Execute page callback
      if (typeof onReady === 'function') {
        onReady(this.currentUser);
      }
    } catch (err) {
      console.error('Authentication verification error:', err);
      window.location.href = '/?error=auth_failed';
    }
  },

  /**
   * Log out manager
   */
  async logout() {
    if (!confirm('Are you sure you want to log out of UniAdmit Manager Portal?')) return;
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error(e);
    } finally {
      window.location.href = '/';
    }
  },

  /**
   * Live Clock on Header
   */
  initClock() {
    const clockEl = document.getElementById('liveClock');
    if (!clockEl) return;
    const update = () => {
      const now = new Date();
      clockEl.textContent = now.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };
    update();
    setInterval(update, 30000);
  },

  /**
   * Mobile Sidebar Drawer Toggle
   */
  initMobileSidebar() {
    const toggleBtn = document.getElementById('sidebarToggleBtn');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('active');
      });
    }

    if (overlay && sidebar) {
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
      });
    }
  },

  /**
   * Toast notification system
   * @param {string} title
   * @param {string} message
   * @param {'success'|'error'|'warning'|'info'} type
   */
  showToast(title, message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const typeClass = type === 'error' ? 'toast-error' : `toast-${type}`;
    toast.className = `toast ${typeClass} show`;

    const iconMap = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    toast.innerHTML = `
      <div style="font-weight: 700; margin-bottom: 2px; display: flex; align-items: center; gap: 6px;">
        <span>${iconMap[type] || 'ℹ'}</span>
        <span>${title}</span>
      </div>
      <div style="font-size: 0.875rem; color: #475569;">${message}</div>
      <div class="toast-progress-bar"></div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  /**
   * Currency formatter in Bangladeshi Taka
   */
  formatBDT(amount) {
    const val = Number(amount) || 0;
    return '৳' + val.toLocaleString('en-BD');
  },

  /**
   * Format Date String
   */
  formatDate(dateStr) {
    if (!dateStr) return '—';
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
  },

  /**
   * Format DateTime String
   */
  formatDateTime(dateStr) {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  },

  /**
   * Returns HTML status badge
   */
  getStatusBadge(status) {
    const s = (status || 'pending').toLowerCase();
    switch (s) {
      case 'approved':
        return `<span class="badge badge-approved"><span class="badge-dot"></span> Approved</span>`;
      case 'under_review':
        return `<span class="badge badge-review"><span class="badge-dot pulse"></span> Under Review</span>`;
      case 'rejected':
        return `<span class="badge badge-rejected"><span class="badge-dot"></span> Rejected</span>`;
      case 'waitlisted':
        return `<span class="badge badge-gold"><span class="badge-dot"></span> Waitlisted</span>`;
      case 'pending':
      default:
        return `<span class="badge badge-pending"><span class="badge-dot pulse"></span> Pending</span>`;
    }
  },

  /**
   * Returns HTML payment badge
   */
  getPaymentBadge(status) {
    const s = (status || 'unpaid').toLowerCase();
    switch (s) {
      case 'verified':
        return `<span class="badge badge-success">Verified</span>`;
      case 'paid':
        return `<span class="badge badge-teal">Paid</span>`;
      case 'unpaid':
      default:
        return `<span class="badge badge-warning">Unpaid</span>`;
    }
  }
};
