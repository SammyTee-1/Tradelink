document.addEventListener('DOMContentLoaded', function() {
  const login2FAForm = document.getElementById('login-2fa-form');
  const login2FAInputs = document.querySelectorAll('.login-2fa-code-input');
  const login2FACodeHidden = document.getElementById('login-2fa-code');
  const login2FABackBtn = document.getElementById('login-2fa-back-btn');
  // Prevent double-tap zoom and pinch zoom on mobile
  document.body.addEventListener('touchstart', function(e) {
    if (e.touches.length > 1) {
      e.preventDefault(); // Prevent two-finger zoom
    }
  }, { passive: false });

  let lastTouchEnd = 0;
  document.body.addEventListener('touchend', function(e) {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault(); // Prevent double-tap zoom
    }
    lastTouchEnd = now;
  }, false);

  const showLoginBtn = document.getElementById('show-login');
  const showSignupBtn = document.getElementById('show-signup');
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const spinner = document.getElementById('spinner');
  const notification = document.getElementById('notification');
  const verifyForm = document.getElementById('verify-form');
  const resendBtn = document.getElementById('resend-btn');
  const timerSpan = document.getElementById('timer');
  let resendCountdown = 60;
  let resendInterval = null;

  const forgotPasswordLink = document.getElementById('forgot-password-link');
  const forgotForm = document.getElementById('forgot-form');
  const resetForm = document.getElementById('reset-form');
  const signupTerms = document.getElementById('signup-terms');
  const signupBtn = document.getElementById('signup-btn');

  function startResendTimer() {
    resendBtn.disabled = true;
    resendCountdown = 60;
    timerSpan.textContent = resendCountdown;
    resendInterval = setInterval(() => {
      resendCountdown--;
      timerSpan.textContent = resendCountdown;
      if (resendCountdown <= 0) {
        clearInterval(resendInterval);
        resendBtn.disabled = false;
        timerSpan.textContent = "0";
      }
    }, 1000);
  } 

  const termsMsg = document.getElementById('terms-msg');

  showLoginBtn.addEventListener('click', function() {
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
    showLoginBtn.classList.add('active');
    showSignupBtn.classList.remove('active');
  });
  showSignupBtn.addEventListener('click', function() {
    signupForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    showSignupBtn.classList.add('active');
    showLoginBtn.classList.remove('active');
  });

  let signupEmailValue = '';
  const verifyEmailSpan = document.getElementById('verify-email');
  const editEmailBtn = document.getElementById('edit-email-btn');
  const signupEmailInput = document.getElementById('signup-email');

  // ✅ Only one signup event listener kept
  signupForm.addEventListener('submit', function(e) {
    e.preventDefault();
    window.showSpinner();
    const name = document.getElementById('signup-name').value;
    const email = signupEmailInput.value;
    const phone = document.getElementById('signup-phone').value;
    const password = document.getElementById('signup-password').value;
    signupEmailValue = email;

    fetch('/api/signup', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({name, email, phone, password})
    })
    .then(res => res.json())
    .then(data => {
      window.hideSpinner();
      window.showNotification(data.message, data.success);
      if (data.verify) {
        signupForm.classList.add('hidden');
        verifyForm.classList.remove('hidden');
        verifyEmailSpan.textContent = signupEmailValue;
        startResendTimer();
      }
    })
    .catch(() => {
      window.hideSpinner();
      window.showNotification('Network error', false);
    });
  });

  // Edit email button in verification form
  if (editEmailBtn) {
    editEmailBtn.addEventListener('click', function() {
      verifyForm.classList.add('hidden');
      signupForm.classList.remove('hidden');
      signupEmailInput.focus();
    });
  }

  // Verification
  verifyForm.addEventListener('submit', function(e) {
    e.preventDefault();
    window.showSpinner();
    const code = verifyCodeInput.value;
    fetch('/api/verify_signup', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({code})
    })
    .then(res => res.json())
    .then(data => {
      window.hideSpinner();
      window.showNotification(data.message, data.success);
      if (data.success) {
        verifyForm.reset();
        setTimeout(() => {
          window.location.replace('/');
        }, 800);
      }
    })
    .catch(() => {
      window.hideSpinner();
      window.showNotification('Network error', false);
    });
  });

  resendBtn.addEventListener('click', function() {
    window.showSpinner();
    fetch('/api/resend_code', { method: 'POST' })
    .then(res => res.json())
    .then(data => {
      window.hideSpinner();
      window.showNotification(data.message, data.success);
      if (data.success) {
        startResendTimer();
      }
    })
    .catch(() => {
      window.hideSpinner();
      window.showNotification('Network error', false);
    });
  });

  // Login
  loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    window.showSpinner();
    const identifier = document.getElementById('login-identifier').value;
    const password = document.getElementById('login-password').value;
    fetch('/api/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({identifier, password})
    })
    .then(res => res.json())
    .then(data => {
      window.hideSpinner();
      window.showNotification(data.message, data.success);
      if (data.require_2fa) {
        // Show 2FA form, hide login form
        loginForm.classList.add('hidden');
        login2FAForm.classList.remove('hidden');
        // Clear previous input
        login2FAInputs.forEach(inp => inp.value = '');
        if (login2FAInputs[0]) login2FAInputs[0].focus();
        return;
      }
      if (data.success) {
        loginForm.reset();
        window.showNotification("Login successful!", "success");
        setTimeout(() => {
          window.location.replace('/');
        }, 1200);
      }
    })
    .catch(() => {
      window.hideSpinner();
      window.showNotification('Network error', false);
    });
  });

  // 2FA OTP input logic for login
  if (login2FAInputs.length && login2FACodeHidden) {
    function updateLogin2FACode() {
      login2FACodeHidden.value = Array.from(login2FAInputs).map(inp => inp.value).join('');
    }
    login2FAInputs.forEach((inp, idx) => {
      inp.addEventListener('input', function(e) {
        this.value = this.value.replace(/[^0-9]/g, '');
        if (this.value && idx < login2FAInputs.length - 1) {
          login2FAInputs[idx + 1].focus();
        }
        updateLogin2FACode();
      });
      inp.addEventListener('keydown', function(e) {
        if (e.key === 'Backspace' && !this.value && idx > 0) {
          login2FAInputs[idx - 1].focus();
        }
      });
    });
  }

  // 2FA OTP form submit
  if (login2FAForm) {
    login2FAForm.addEventListener('submit', function(e) {
      e.preventDefault();
      window.showSpinner();
      const code = login2FACodeHidden.value;
      if (!/^\d{6}$/.test(code)) {
        window.hideSpinner();
        window.showNotification('Enter a valid 6-digit code', false);
        return;
      }
      fetch('/api/verify_2fa_login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({code})
      })
      .then(res => res.json())
      .then(data => {
        window.hideSpinner();
        window.showNotification(data.message, data.success);
        if (data.success) {
          login2FAForm.reset();
          login2FAForm.classList.add('hidden');
          setTimeout(() => {
            window.location.replace('/');
          }, 1200);
        }
      })
      .catch(() => {
        window.hideSpinner();
        window.showNotification('Network error', false);
      });
    });
  }

  // 2FA OTP back button
  if (login2FABackBtn) {
    login2FABackBtn.addEventListener('click', function() {
      login2FAForm.classList.add('hidden');
      loginForm.classList.remove('hidden');
    });
  }

  // Show forgot password form
  forgotPasswordLink.addEventListener('click', function(e) {
    e.preventDefault();
    loginForm.classList.add('hidden');
    signupForm.classList.add('hidden');
    verifyForm.classList.add('hidden');
    forgotForm.classList.remove('hidden');
    resetForm.classList.add('hidden');
  });

  // Forgot password: send code
  forgotForm.addEventListener('submit', function(e) {
    e.preventDefault();
    window.showSpinner();
    const email = document.getElementById('forgot-email').value;
    fetch('/api/forgot_password', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email})
    })
    .then(res => res.json())
    .then(data => {
      window.hideSpinner();
      window.showNotification(data.message, data.success);
      if (data.success) {
        forgotForm.classList.add('hidden');
        resetForm.classList.remove('hidden');
      }
    })
    .catch(() => {
      window.hideSpinner();
      window.showNotification('Network error', false);
    });
  });

  // Reset password
  resetForm.addEventListener('submit', function(e) {
    e.preventDefault();
    window.showSpinner();
    const code = document.getElementById('reset-code').value;
    const password = document.getElementById('reset-password').value;
    const password2 = document.getElementById('reset-password2').value;
    if (password !== password2) {
      window.hideSpinner();
      window.showNotification('Passwords do not match', false);
      return;
    }
    fetch('/api/reset_password', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({code, password})
    })
    .then(res => res.json())
    .then(data => {
      window.hideSpinner();
      window.showNotification(data.message, data.success);
      if (data.success) {
        resetForm.reset();
        setTimeout(() => {
          resetForm.classList.add('hidden');
          loginForm.classList.remove('hidden');
        }, 1000);
      }
    })
    .catch(() => {
      window.hideSpinner();
      window.showNotification('Network error', false);
    });
  });

  // Show/hide password functionality with Show/Hide text
  document.querySelectorAll('.toggle-password').forEach(function(btn) {
    btn.addEventListener('click', function() {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (input) {
        if (input.type === 'password') {
          input.type = 'text';
          btn.textContent = 'Hide';
        } else {
          input.type = 'password';
          btn.textContent = 'Show';
        }
      }
    });
  });

  // Back button for forgot password
  const forgotBackBtn = document.getElementById('forgot-back-btn');
  if (forgotBackBtn) {
    forgotBackBtn.addEventListener('click', function() {
      forgotForm.classList.add('hidden');
      loginForm.classList.remove('hidden');
      signupForm.classList.add('hidden');
      verifyForm.classList.add('hidden');
      resetForm.classList.add('hidden');
    });
  }

  // Back button for reset password
  const resetBackBtn = document.getElementById('reset-back-btn');
  if (resetBackBtn) {
    resetBackBtn.addEventListener('click', function() {
      resetForm.classList.add('hidden');
      loginForm.classList.remove('hidden');
      signupForm.classList.add('hidden');
      verifyForm.classList.add('hidden');
      forgotForm.classList.add('hidden');
    });
  }

  // Only allow digits in code fields
  function allowOnlyDigits(input) {
    input.addEventListener('input', function() {
      this.value = this.value.replace(/\D/g, '');
    });
  }
  const verifyCodeInput = document.getElementById('verify-code');
  const resetCodeInput = document.getElementById('reset-code');
  if (verifyCodeInput) allowOnlyDigits(verifyCodeInput);
  if (resetCodeInput) allowOnlyDigits(resetCodeInput);

  // === LIVE VALIDATION FOR SIGNUP ===
  const signupEmail = document.getElementById('signup-email');
  const signupPhone = document.getElementById('signup-phone');
  const signupName = document.getElementById('signup-name');
  const signupPassword = document.getElementById('signup-password');

  // Helper to show validation message
  function showFieldMsg(input, msg, valid) {
    let msgElem;
    if (input.id === 'signup-password') {
      let wrapper = input.closest('.password-wrapper');
      if (wrapper) {
        let existing = wrapper.parentNode.querySelector('.auth-msg-pwd');
        if (!existing) {
          msgElem = document.createElement('div');
          msgElem.className = 'auth-msg auth-msg-pwd';
          wrapper.parentNode.insertBefore(msgElem, wrapper.nextSibling);
        } else {
          msgElem = existing;
        }
        msgElem.textContent = msg || '';
        msgElem.style.display = (msg && valid === false) ? 'block' : 'none';
      }
    } else {
      msgElem = input.nextElementSibling;
      if (!msgElem || !msgElem.classList.contains('auth-msg')) {
        msgElem = document.createElement('div');
        msgElem.className = 'auth-msg';
        input.parentNode.insertBefore(msgElem, input.nextSibling);
      }
      msgElem.textContent = msg || '';
      msgElem.style.display = (msg && valid === false) ? 'block' : 'none';
    }
    input.classList.remove('valid', 'invalid');
    if (valid === true) {
      input.classList.add('valid');
      input.style.outline = '2px solid #28a745';
    } else if (valid === false) {
      input.classList.add('invalid');
      input.style.outline = '2px solid #d9534f';
    } else {
      input.style.outline = '';
    }
  }
 
  // Debounce helper
  function debounce(fn, delay) {
    let timer = null;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // Email live check
  if (signupEmail) {
    signupEmail.addEventListener('input', debounce(function() {
      const email = signupEmail.value.trim();
      if (!email) {
        showFieldMsg(signupEmail, '', null);
        return;
      }
      if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
        showFieldMsg(signupEmail, 'Invalid email format', false);
        return;
      }
      fetch('/api/check_user', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email})
      })
      .then(res => res.json())
      .then(data => {
        if (data.email_exists) {
          showFieldMsg(signupEmail, 'Email already registered', false);
        } else {
          showFieldMsg(signupEmail, 'Email is available', true);
        }
      });
    }, 500));
  }

  // Phone live check
  if (signupPhone) {
    signupPhone.addEventListener('input', debounce(function() {
      const phone = signupPhone.value.trim();
      if (!phone) {
        showFieldMsg(signupPhone, '', null);
        return;
      }
      if (!/^\d{10,15}$/.test(phone)) {
        showFieldMsg(signupPhone, 'Enter a valid phone number', false);
        return;
      }
      fetch('/api/check_user', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({phone})
      })
      .then(res => res.json())
      .then(data => {
        if (data.phone_exists) {
          showFieldMsg(signupPhone, 'Phone already registered', false);
        } else {
          showFieldMsg(signupPhone, 'Phone is available', true);
        }
      });
    }, 500));
  }

  // Name validation
  if (signupName) {
    signupName.addEventListener('input', function() {
      const name = signupName.value.trim();
      if (!name) {
        showFieldMsg(signupName, '', null);
        return;
      }
      if (name.length < 2) {
        showFieldMsg(signupName, 'Name too short', false);
      } else {
        showFieldMsg(signupName, '', true);
      }
    });
  }

  // Password validation
  if (signupPassword) {
    signupPassword.addEventListener('input', function() {
      const pwd = signupPassword.value;
      if (!pwd) {
        showFieldMsg(signupPassword, '', null);
        return;
      }
      const minLength = pwd.length >= 8;
      const hasUpper = /[A-Z]/.test(pwd);
      const hasNumber = /\d/.test(pwd);
      const hasSymbol = /[^A-Za-z0-9]/.test(pwd);

      if (!minLength) {
        showFieldMsg(signupPassword, 'Password must be at least 8 characters', false);
      } else if (!hasUpper) {
        showFieldMsg(signupPassword, 'Password must contain at least one uppercase letter', false);
      } else if (!hasNumber) {
        showFieldMsg(signupPassword, 'Password must contain at least one number', false);
      } else if (!hasSymbol) {
        showFieldMsg(signupPassword, 'Password must contain at least one symbol', false);
      } else {
        showFieldMsg(signupPassword, '', true);
      }
    });
  }

});

