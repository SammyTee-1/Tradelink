// Notification Panel Logic
document.addEventListener('DOMContentLoaded', function () {
  const notificationBtn = document.querySelector('.notification-btn');
  const notificationDot = document.querySelector('.notification-dot');
  const notificationPanel = document.getElementById('notificationPanel');
  const closePanelBtn = document.getElementById('closeNotificationPanel');
  const clearBtn = document.getElementById('clearNotificationsBtn');
  const notificationList = document.getElementById('notificationList');
  const notificationDetail = document.getElementById('notificationDetail');
  const backToListBtn = document.getElementById('backToListBtn');
  const notificationDetailContent = document.querySelector('.notification-detail-content');

  let notificationsCache = [];

  // Open panel on bell click
  if (notificationBtn && notificationPanel) {
    notificationBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      notificationPanel.classList.remove('hidden');
      notificationList.classList.remove('hidden');
      notificationDetail.classList.add('hidden');
      clearBtn.textContent = 'Clear All';
      renderNotifications(notificationsCache);
    });
  }

  // Close panel
  if (closePanelBtn) {
    closePanelBtn.addEventListener('click', function () {
      notificationPanel.classList.add('hidden');
    });
  }

  // Close when clicking outside
  document.addEventListener('mousedown', function (e) {
    if (notificationPanel && !notificationPanel.classList.contains('hidden') &&
        !notificationPanel.contains(e.target) &&
        !e.target.classList.contains('notification-btn') &&
        !e.target.closest('.notification-btn')) {
      notificationPanel.classList.add('hidden');
    }
  });

  // Back to list from detail
  if (backToListBtn) {
    backToListBtn.addEventListener('click', function () {
      notificationDetail.classList.add('hidden');
      notificationList.classList.remove('hidden');
      clearBtn.textContent = 'Clear All';
    });
  }

  // Clear all notifications or Back button
  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      if (clearBtn.textContent === 'Clear All') {
        if (!confirm('Clear all notifications?')) return;
        fetch('/api/notifications/clear', { method: 'POST' })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              notificationsCache = [];
              renderNotifications([]);
              updateNotificationDot([]);
            }
          });
      } else if (clearBtn.textContent === 'Back') {
        notificationDetail.classList.add('hidden');
        notificationList.classList.remove('hidden');
        clearBtn.textContent = 'Clear All';
      }
    });
  }

  // Fetch notifications from backend (user + global)
  function fetchNotifications() {
    fetch('/api/notifications')
      .then(res => res.json())
      .then(data => {
        notificationsCache = data.notifications || [];
        renderNotifications(notificationsCache);
        updateNotificationDot(notificationsCache);
      });
  }

  // Render notifications, separating unread and read, but no section titles
  function renderNotifications(notifications) {
    notificationList.innerHTML = '';
    if (!notifications || notifications.length === 0) {
      notificationList.innerHTML = '<div style="padding:2.5rem 1.2rem;text-align:center;color:#888;flex:1;display:flex;align-items:center;justify-content:center;">No notifications.</div>';
      return;
    }
    const unread = notifications.filter(n => !n.read);
    const read = notifications.filter(n => n.read);
    // Show unread first, then read, but no section titles
    unread.forEach((notif, idx) => {
      notificationList.appendChild(createNotificationItem(notif, idx, false));
    });
    read.forEach((notif, idx) => {
      notificationList.appendChild(createNotificationItem(notif, idx, true));
    });
    notificationList.style.minHeight = 'calc(100vh - 64px)';
  }

  function createNotificationItem(notif, idx, isRead) {
    const item = document.createElement('div');
    item.className = 'notification-item' + (isRead ? ' read' : ' unread');
    item.tabIndex = 0;
    item.innerHTML = `
      <div class="notification-title">${notif.title || 'Notification'}</div>
      <div class="notification-date">${formatDate(notif.date)}</div>
    `;
    item.addEventListener('click', function () {
      showNotificationDetail(notif, idx);
      if (!notif.read) markNotificationRead(notif.id, item);
    });
    item.addEventListener('keypress', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        showNotificationDetail(notif, idx);
        if (!notif.read) markNotificationRead(notif.id, item);
      }
    });
    return item;
  }

  function showNotificationDetail(notif, idx) {
    notificationList.classList.add('hidden');
    notificationDetail.classList.remove('hidden');
    notificationDetailContent.innerHTML = `
      <div style="font-weight:700;font-size:1.15em;margin-bottom:0.5em;">${notif.title || 'Notification'}</div>
      <div style="font-size:0.98em;color:#888;margin-bottom:0.7em;">${formatDate(notif.date)}</div>
      <div>${notif.message ? notif.message.replace(/\n/g, '<br>') : ''}</div>
    `;
    clearBtn.textContent = 'Back';
  }

  function markNotificationRead(id, itemElem) {
    fetch('/api/notifications/read', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({id})
    }).then(() => {
      itemElem.classList.remove('unread');
      itemElem.classList.add('read');
      // Update dot if no more unread
      if (notificationsCache) {
        const notif = notificationsCache.find(n => n.id === id);
        if (notif) notif.read = true;
        updateNotificationDot(notificationsCache);
        renderNotifications(notificationsCache);
      }
    });
  }

  function updateNotificationDot(notifications) {
    const hasUnread = notifications && notifications.some(n => !n.read);
    if (notificationBtn) {
      if (hasUnread) {
        notificationBtn.classList.add('has-unread');
      } else {
        notificationBtn.classList.remove('has-unread');
      }
    }
  }

  // Real-time: poll every 5 seconds for updates
  setInterval(fetchNotifications, 2000);

  // Initial fetch and dot state
  fetchNotifications();

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const dt = new Date(dateStr);
    if (!isNaN(dt)) {
      return dt.toLocaleString(undefined, {year:'numeric',month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit'});
    }
    return dateStr;
  }
});