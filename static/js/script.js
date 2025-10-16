console.log('TradeLink Homepage Loaded');

// ===== Mobile Navigation =====
class MobileNavigation {
    constructor() {
        this.isOpen = false;
        this.init();
    }

    init() {
        this.bindEvents();
    }

    open() {
        this.isOpen = true;
        const mobileNav = document.getElementById('mobileNav');
        if (mobileNav) {
            mobileNav.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    close() {
        this.isOpen = false;
        const mobileNav = document.getElementById('mobileNav');
        if (mobileNav) {
            mobileNav.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    bindEvents() {
        const hamburgerMenu = document.getElementById('hamburgerMenu');
        const mobileNavClose = document.getElementById('mobileNavClose');

        if (hamburgerMenu) {
            hamburgerMenu.addEventListener('click', () => this.toggle());
        }

        if (mobileNavClose) {
            mobileNavClose.addEventListener('click', () => this.close());
        }

        // Close on outside click
        document.addEventListener('click', (e) => {
            const mobileNav = document.getElementById('mobileNav');
            const hamburgerMenu = document.getElementById('hamburgerMenu');

            if (this.isOpen && mobileNav &&
                !mobileNav.contains(e.target) &&
                !hamburgerMenu.contains(e.target)) {
                this.close();
            }
        });

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }
}

// Sidebar open/close logic
const profileIconBtn = document.getElementById('profileIconBtn');
const profileSidebar = document.getElementById('profileSidebar');
const profileSidebarClose = document.getElementById('profileSidebarClose');
if (profileIconBtn) {
    profileIconBtn.addEventListener('click', () => {
        profileSidebar.classList.add('open');
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    });
}
if (profileSidebarClose) {
    profileSidebarClose.addEventListener('click', () => {
        profileSidebar.classList.remove('open');
        document.body.style.overflow = ''; // Restore scrolling
    });
}
// Close sidebar when clicking outside
document.addEventListener('mousedown', (e) => {
    if (profileSidebar && profileSidebar.classList.contains('open') &&
        !profileSidebar.contains(e.target) &&
        !profileIconBtn.contains(e.target)) {
        profileSidebar.classList.remove('open');
        document.body.style.overflow = '';
    }
});

// ===== Balance Manager =====
class BalanceManager {
    constructor() {
        this.balanceElement = document.getElementById('balanceAmount');
        this.init();
    }

    init() {
        this.fetchBalance();
    }

    async fetchBalance() {
        try {
            const response = await fetch('/api/get_balance');
            const data = await response.json();
            this.updateBalance(data.balance);
        } catch (error) {
            console.error('Error fetching balance:', error);
        }
    }

    updateBalance(amount) {
        if (this.balanceElement) {
            const formatted = `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            actualBalanceValue = formatted;
            if (localStorage.getItem('balanceHidden') === '1') {
                this.balanceElement.textContent = '*****';
            } else {
                this.balanceElement.textContent = formatted;
            }
        }
    }
}

// ===== Quick Actions Manager =====
class QuickActionsManager {
    constructor() {
        this.init();
    }

    init() {
        const quickActions = document.querySelectorAll('.action-btn-circle');
        quickActions.forEach(action => {
            action.addEventListener('click', () => {
                const actionType = action.querySelector('.action-title')?.textContent?.toLowerCase();
                this.handleAction(actionType);
            });
        });
    }

    handleAction(action) {
        // Simulate action processing
        document.body.style.pointerEvents = 'none';
        setTimeout(() => {
            document.body.style.pointerEvents = '';
            window.showNotification(`${action.charAt(0).toUpperCase() + action.slice(1)} action initiated!`, 'success');
            console.log(`Action triggered: ${action}`);
        }, 1500);
    }
}

// ===== Animation Manager =====
class AnimationManager {
    constructor() {
        this.observer = null;
        this.init();
    }

    init() {
        this.setupIntersectionObserver();
        this.addScrollAnimations();
    }

    setupIntersectionObserver() {
        const options = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, options);

        // Observe elements
        const animatedElements = document.querySelectorAll('.news-announcement-card');
        animatedElements.forEach(el => this.observer.observe(el));
    }

    addScrollAnimations() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }
}

// ===== Performance Monitor =====
class PerformanceMonitor {
    constructor() {
        this.metrics = {};
        this.init();
    }

    init() {
        this.measureLoadTime();
        this.setupErrorTracking();
    }

    measureLoadTime() {
        window.addEventListener('load', () => {
            const loadTime = performance.now();
            console.log(`Page loaded in ${loadTime.toFixed(2)}ms`);
        });
    }

    setupErrorTracking() {
        window.addEventListener('error', (e) => {
            console.error('JavaScript Error:', e.error);
        });

        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled Promise Rejection:', e.reason);
        });
    }
}

// ===== Initialize Application =====
class TradeLinkApp {
    constructor() {
        this.components = {};
        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeComponents());
        } else {
            this.initializeComponents();
        }
    }

    initializeComponents() {
        try {
            this.components.mobileNav = new MobileNavigation();
            this.components.balanceManager = new BalanceManager();
            this.components.quickActions = new QuickActionsManager();
            this.components.animationManager = new AnimationManager();
            this.components.performanceMonitor = new PerformanceMonitor();

            console.log('TradeLink homepage initialized successfully');
        } catch (error) {
            console.error('Error initializing TradeLink app:', error);
        }
    }

    destroy() {
        if (this.components.animationManager && this.components.animationManager.observer) {
            this.components.animationManager.observer.disconnect();
        }
    }
}

// ===== Global Functions =====
window.showSpinner = function () {
    const spinner = document.getElementById('spinner');
    if (spinner) spinner.classList.remove('hidden');
};
window.hideSpinner = function () {
    const spinner = document.getElementById('spinner');
    if (spinner) spinner.classList.add('hidden');
};
window.showToast = function (msg, type = "success") {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.className = "toast toast-" + (type === true ? "success" : type === false ? "error" : type);
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
};

// Optionally, for backward compatibility:
window.showNotification = window.showToast;

window.updateBalance = function (amount) {
    if (window.tradeLinkApp && window.tradeLinkApp.components.balanceManager) {
        window.tradeLinkApp.components.balanceManager.updateBalance(amount);
    }
};

window.smoothScrollTo = function(selector) {
    const el = typeof selector === "string" ? document.querySelector(selector) : selector;
    if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
};

// ===== Initialize App =====
window.tradeLinkApp = new TradeLinkApp();

// ===== Service Worker Registration =====
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/static/service-worker.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}


// Logout button logic
document.addEventListener('DOMContentLoaded', function () {
    document.body.classList.add('page-fade-in');
    const logoutBtn = document.getElementById('logoutBtn');
    const spinner = document.getElementById('spinner');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            if (spinner) spinner.classList.remove('hidden');
            fetch('/logout', { method: 'GET' })
                .then(() => {
                    window.showToast("You have been logged out.", "success");
                    setTimeout(() => {
                        if (spinner) spinner.classList.add('hidden');
                        window.location.href = '/auth';
                    }, 2000);
                });
        });
    }

    // Hide/Show Balance Logic
    const balanceEl = document.getElementById('balanceAmount');
    const toggleBtn = document.getElementById('toggleBalanceBtn');
    const toggleIcon = document.getElementById('toggleBalanceIcon');
    let actualBalanceValue = balanceEl ? balanceEl.textContent : null;

    function setBalanceHidden(hidden) {
        if (!balanceEl) return;
        if (hidden) {
            if (actualBalanceValue === null) actualBalanceValue = balanceEl.textContent;
            balanceEl.textContent = '*****';
            toggleIcon?.classList.remove('fa-eye');
            toggleIcon?.classList.add('fa-eye-slash');
        } else {
            if (actualBalanceValue !== null) balanceEl.textContent = actualBalanceValue;
            toggleIcon?.classList.remove('fa-eye-slash');
            toggleIcon?.classList.add('fa-eye');
        }
        localStorage.setItem('balanceHidden', hidden ? '1' : '0');
    }

    if (toggleBtn && balanceEl && toggleIcon) {
        const hidden = localStorage.getItem('balanceHidden') === '1';
        setBalanceHidden(hidden);

        toggleBtn.addEventListener('click', function () {
            const currentlyHidden = localStorage.getItem('balanceHidden') === '1';
            setBalanceHidden(!currentlyHidden);
        });
    }
});

function pollUserData() {
    fetch('/api/get_balance')
        .then(res => res.json())
        .then(data => {
            const balanceEl = document.getElementById('balanceAmount');
            if (balanceEl) {
                const formatted = `$${parseFloat(data.balance).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
                actualBalanceValue = formatted;
                if (localStorage.getItem('balanceHidden') === '1') {
                    balanceEl.textContent = '*****';
                } else {
                    balanceEl.textContent = formatted;
                }
            }
            // Update name
            const nameEls = document.querySelectorAll('.profile-name-sidebar');
            nameEls.forEach(el => {
                el.textContent = data.name || '';
            });
        });
}

// Poll every 5 seconds
setInterval(pollUserData, 5000);

function checkUserExistence() {
    fetch('/api/check_user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(res => res.json())
    .then(data => {
        if (data.account_revoked) {
            window.showToast(data.message || "Account Permanently blocked", "error");
            setTimeout(() => {
                window.location.href = '/auth';
            }, 1800);
        }
    })
    .catch(() => {});
}

// Check every 30 seconds (recommended for efficiency)
setInterval(checkUserExistence, 5000);

document.addEventListener('DOMContentLoaded', function() {
  var logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.style.background = '#d9534f';
    logoutBtn.style.color = '#fff';
  }
});

// ===== Theme Manager =====
window.applyTheme = function(theme) {
    const html = document.documentElement;
    if (theme === 'dark') {
        html.setAttribute('data-theme', 'dark');
    } else {
        html.setAttribute('data-theme', 'light');
    }
    // Update toggle button label/icon if present
    const toggleLabel = document.getElementById('themeToggleLabelSidebar');
    const toggleIcon = document.getElementById('themeToggleIconSidebar');
    if (toggleLabel) {
        toggleLabel.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
    }
    if (toggleIcon) {
        toggleIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
};

window.setTheme = function(theme) {
    localStorage.setItem('theme', theme);
    window.applyTheme(theme);
};

window.toggleTheme = function() {
    const current = localStorage.getItem('theme') || 'light';
    const newTheme = current === 'light' ? 'dark' : 'light';
    window.setTheme(newTheme);
};

// Apply theme on page load and listen for changes from other tabs
(function() {
    // Apply theme as early as possible to prevent flash
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);

    // Show body after theme is set and DOM is ready
    function showBody() {
        document.body.style.opacity = '1';
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', showBody);
    } else {
        showBody();
    }
})();