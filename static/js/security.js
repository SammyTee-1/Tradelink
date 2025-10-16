// Security page navigation logic
function showSecurityPage(page) {
  document.getElementById('sec-main-list').style.display = 'none';
  document.getElementById('sec-change-password').style.display = (page === 'change-password') ? 'block' : 'none';
  document.getElementById('sec-2fa').style.display = (page === '2fa') ? 'block' : 'none';
  document.getElementById('sec-withdrawal-pin').style.display = (page === 'withdrawal-pin') ? 'block' : 'none';
  document.getElementById('sec-delete-account').style.display = (page === 'delete-account') ? 'block' : 'none';
  if (page === 'withdrawal-pin') {
    window.showSpinner();
    checkWithdrawalPinStatus();
  }
  if (page === '2fa') {
    window.showSpinner();
    show2FAStatus();
  }
}
function showMainList() {
  document.getElementById('sec-main-list').style.display = 'block';
  document.getElementById('sec-change-password').style.display = 'none';
  document.getElementById('sec-2fa').style.display = 'none';
  document.getElementById('sec-withdrawal-pin').style.display = 'none';
  document.getElementById('sec-delete-account').style.display = 'none';
  // Hide 2FA disable form and show button again
  const disableBtn = document.getElementById('twofa-disable-btn');
  const disableForm = document.getElementById('twofa-disable-form');
  if (disableBtn && disableForm) {
    disableBtn.style.display = '';
    disableForm.style.display = 'none';
    // Optionally clear the input fields
    const codeInputs = disableForm.querySelectorAll('.twofa-disable-code-input');
    codeInputs.forEach(input => input.value = '');
    document.getElementById('twofa-disable-code').value = '';
  }
}

// --- Form handling for Change Password and Withdrawal PIN ---
document.addEventListener('DOMContentLoaded', function() {
  const changeForm = document.getElementById('change-password-form');
  if (changeForm) {
    changeForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const current = document.getElementById('current-password').value || '';
      const nw = document.getElementById('new-password').value || '';
      const confirm = document.getElementById('confirm-password').value || '';

      if (nw !== confirm) {
        window.showNotification('New passwords do not match', false);
        return;
      }
      if (nw.length < 4) {
        window.showNotification('New password is too short', false);
        return;
      } 

      window.showSpinner();
      fetch('/api/change_password', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          current_password: current,
          new_password: nw,
          confirm_password: confirm
        })
      })
      .then(res => res.json())
      .then(data => {
        window.hideSpinner();
        window.showNotification(data.message || 'Error', data.success);
        if (data.success) {
          changeForm.reset();
          setTimeout(() => { showMainList(); }, 700);
        }
      })
      .catch(() => {
        window.hideSpinner();
        window.showNotification('Network error', false);
      });
    });
  }

  // PIN form handler is now only attached if PIN is not set (see checkWithdrawalPinStatus)

  // Delete Account Form Handler
  const deleteForm = document.getElementById('delete-account-form');
  if (deleteForm) {
    deleteForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const password = document.getElementById('delete-password').value || '';
      if (!password) {
        window.showNotification('Password required', false);
        return;
      }
      window.showSpinner();
      fetch('/api/delete_account', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ password })
      })
      .then(res => res.json())
      .then(data => {
        window.hideSpinner();
        window.showNotification(data.message || 'Error', data.success);
        if (data.success) {
          setTimeout(() => {
            window.location.href = '/auth';
          }, 1200);
        }
      })
      .catch(() => {
        window.hideSpinner();
        window.showNotification('Network error', false);
      });
    });
  }
});

// --- Withdrawal PIN logic: check/set/remove ---
function checkWithdrawalPinStatus() {
  fetch('/api/withdrawal_pin_status')
    .then(res => res.json())
    .then(data => {
      const pinSet = !!data.set;
      const pinForm = document.getElementById('set-pin-form');
      let turnOffBtn = document.getElementById('turnOffPinBtn');
      let pinModal = document.getElementById('turnOffPinModal');
      const statusLabel = document.getElementById('pin-status-label');
      if (statusLabel) {
        statusLabel.textContent = pinSet ? "Status: Active" : "Status: Not Set";
        statusLabel.style.color = pinSet ? "#0ecb81" : "#f6465d";
      }

      if (pinSet) {
        // Hide PIN form, show only Turn Off button
        if (pinForm) pinForm.style.display = 'none';
        if (!turnOffBtn) {
          turnOffBtn = document.createElement('button');
          turnOffBtn.id = 'turnOffPinBtn';
          turnOffBtn.type = 'button';
          turnOffBtn.className = 'security-btn security-btn-red';
          turnOffBtn.textContent = 'Turn Off PIN';
          turnOffBtn.style.marginTop = '0.5rem';
          turnOffBtn.onclick = function() {
            window.showSpinner();
            setTimeout(showTurnOffPinModal, 350); // Give spinner time to show
          };
          // Insert below status label
          const statusContainer = document.getElementById('pin-status-container');
          if (statusContainer) statusContainer.parentNode.insertBefore(turnOffBtn, statusContainer.nextSibling);
        }
      } else {
        // Show PIN form, remove Turn Off button if present
        if (pinForm) pinForm.style.display = '';
        if (turnOffBtn) turnOffBtn.remove();
      }
      // Remove modal if present
      if (pinModal) pinModal.remove();

      // Attach submit handler only if PIN is not set
      if (!pinSet && pinForm && !pinForm._handlerAttached) {
        pinForm.addEventListener('submit', pinFormSubmitHandler);
        pinForm._handlerAttached = true;
      }
      window.hideSpinner();
    })
    .catch(() => {
      window.hideSpinner();
      window.showNotification('Failed to check PIN status', false);
    });
}

function pinFormSubmitHandler(e) {
  e.preventDefault();
  const pin = document.getElementById('withdrawal-pin').value || '';
  const confirmPin = document.getElementById('confirm-withdrawal-pin').value || '';

  if (!/^\d{4}$/.test(pin) || !/^\d{4}$/.test(confirmPin)) {
    window.showNotification('PIN must be exactly 4 digits', false);
    return;
  }
  if (pin !== confirmPin) {
    window.showNotification('PINs do not match', false);
    return;
  }

  window.showSpinner();
  fetch('/api/set_withdrawal_pin', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ pin: pin, confirm_pin: confirmPin })
  })
  .then(res => res.json())
  .then(data => {
    window.hideSpinner();
    window.showNotification(data.message || 'Error', data.success);
    if (data.success) {
      document.getElementById('set-pin-form').reset();
      setTimeout(() => { showMainList(); }, 700);
    }
  })
  .catch(() => {
    window.hideSpinner();
    window.showNotification('Network error', false);
  });
}

// Show modal for PIN authentication
function showTurnOffPinModal() {
  let modal = document.getElementById('turnOffPinModal');
  if (modal) modal.remove();

  modal = document.createElement('div');
  modal.id = 'turnOffPinModal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100vw';
  modal.style.height = '100vh';
  modal.style.background = 'rgba(0,0,0,0.35)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = '9999';

  modal.innerHTML = `
    <div style="background:#fff;padding:2rem 1.5rem;border-radius:12px;box-shadow:0 2px 16px #0002;max-width:320px;width:100%;text-align:center;position:relative;">
      <button id="closePinModalBtn" style="position:absolute;top:0.5rem;right:0.7rem;background:none;border:none;font-size:1.5em;cursor:pointer;">&times;</button>
      <h3 style="margin-bottom:1.2rem;">Turn Off Withdrawal PIN</h3>
      <form id="turnOffPinForm">
        <input type="text" id="turnOffPinInput" maxlength="4" pattern="\\d{4}" inputmode="numeric" autocomplete="one-time-code" placeholder="Enter 4-digit PIN" required style="padding:0.7rem;font-size:1.1em;width:90%;margin-bottom:1.1rem;border-radius:7px;border:1px solid #ddd;" oninput="this.value=this.value.replace(/[^0-9]/g,'')">
        <button type="submit" class="security-btn security-btn-red" style="width:100%;position:relative;">
          <span id="turnOffBtnText">Turn Off PIN</span>
          <span id="turnOffBtnSpinner" style="display:none;position:absolute;right:1.2em;top:50%;transform:translateY(-50%);width:18px;height:18px;">
            <svg viewBox="0 0 50 50" style="width:18px;height:18px;display:block;"><circle cx="25" cy="25" r="20" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-dasharray="31.4 31.4" stroke-dashoffset="0"><animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.7s" repeatCount="indefinite"/></circle></svg>
          </span>
        </button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('closePinModalBtn').onclick = () => {
    modal.remove();
    window.hideSpinner();
  };

  document.getElementById('turnOffPinForm').onsubmit = function(e) {
    e.preventDefault();
    const pin = document.getElementById('turnOffPinInput').value;
    if (!/^\d{4}$/.test(pin)) {
      window.showNotification('Invalid PIN format', false);
      window.hideSpinner();
      return;
    }
    // Show small spinner in button
    const btn = document.querySelector('#turnOffPinForm button[type="submit"]');
    const btnText = document.getElementById('turnOffBtnText');
    const btnSpinner = document.getElementById('turnOffBtnSpinner');
    if (btnText && btnSpinner) {
      btnText.style.opacity = '0.5';
      btnSpinner.style.display = 'inline-block';
      btn.disabled = true;
    }
    window.showSpinner();
    fetch('/api/remove_withdrawal_pin', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({pin})
    })
    .then(res => res.json())
    .then(data => {
      setTimeout(() => {
        window.hideSpinner();
        if (btnText && btnSpinner) {
          btnText.style.opacity = '';
          btnSpinner.style.display = 'none';
          btn.disabled = false;
        }
        window.showNotification(data.message || 'Error', data.success);
        if (data.success) {
          checkWithdrawalPinStatus();
          document.getElementById('set-pin-form').reset();
          modal.remove();
          setTimeout(() => { showMainList(); }, 700);
        }
      }, 2000); // 2 seconds delay
    })
    .catch(() => {
      window.hideSpinner();
      if (btnText && btnSpinner) {
        btnText.style.opacity = '';
        btnSpinner.style.display = 'none';
        btn.disabled = false;
      }
      window.showNotification('Network error', false);
    });
  };
}

// --- 2FA logic ---
function show2FAStatus() {
  fetch('/api/2fa/status')
    .then(res => res.json())
    .then(data => {
      const enabled = !!data.enabled;
      const statusLabel = document.getElementById('twofa-status-label');
      const enableSection = document.getElementById('twofa-enable-section');
      const disableSection = document.getElementById('twofa-disable-section');
      if (statusLabel) {
        statusLabel.textContent = enabled ? 'Status: Enabled' : 'Status: Not Enabled';
        statusLabel.style.color = enabled ? '#0ecb81' : '#f6465d';
      }
      if (enabled) {
        if (enableSection) enableSection.style.display = 'none';
        if (disableSection) disableSection.style.display = '';
      } else {
        if (disableSection) disableSection.style.display = 'none';
        if (enableSection) {
          enableSection.style.display = '';
          setup2FA();
        }
      }
      window.hideSpinner();
    })
    .catch(() => {
      window.hideSpinner();
      window.showNotification('Failed to check 2FA status', false);
    });
}

function setup2FA() {
  fetch('/api/2fa/setup')
    .then(res => res.json())
    .then(data => {
      if (!data.success) {
        window.showNotification(data.message || 'Failed to setup 2FA', false);
        return;
      }
      // Show QR and secret
      const qrImg = document.getElementById('twofa-qr');
      const secretSpan = document.getElementById('twofa-secret');
      const secretContainer = document.getElementById('twofa-secret-container');
      const secretInput = document.getElementById('twofa-secret-input');
      if (qrImg && data.qr) {
        qrImg.src = 'data:image/png;base64,' + data.qr;
        qrImg.style.display = '';
      }
      if (secretSpan && data.secret) {
        secretSpan.textContent = data.secret;
        if (secretContainer) secretContainer.style.display = '';
      }
      if (secretInput && data.secret) {
        secretInput.value = data.secret;
      }
    })
    .catch(() => {
      window.showNotification('Failed to load 2FA setup', false);
    });
}

document.addEventListener('DOMContentLoaded', function() {
  // 2FA Enable
  const enableForm = document.getElementById('twofa-enable-form');
  if (enableForm) {
    // Handle 6-column OTP input
    const codeInputs = enableForm.querySelectorAll('.twofa-code-input');
    codeInputs.forEach((input, idx) => {
      input.addEventListener('input', function(e) {
        this.value = this.value.replace(/[^0-9]/g, '');
        if (this.value && idx < codeInputs.length - 1) codeInputs[idx + 1].focus();
        updateEnableCodeHidden();
      });
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Backspace' && !this.value && idx > 0) codeInputs[idx - 1].focus();
      });
      // Paste event for OTP columns
      input.addEventListener('paste', function(e) {
        const paste = (e.clipboardData || window.clipboardData).getData('text');
        if (/^\d{6}$/.test(paste)) {
          e.preventDefault();
          for (let i = 0; i < 6; i++) {
            codeInputs[i].value = paste[i];
          }
          codeInputs[5].focus();
          updateEnableCodeHidden();
        }
      });
    });
    function updateEnableCodeHidden() {
      const code = Array.from(codeInputs).map(i => i.value).join('');
      document.getElementById('twofa-code').value = code;
    }
    enableForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const code = document.getElementById('twofa-code').value || '';
      const secret = document.getElementById('twofa-secret-input').value || '';
      if (!/^\d{6}$/.test(code)) {
        window.showNotification('Enter a valid 6-digit code', false);
        return;
      }
      window.showSpinner();
      fetch('/api/2fa/enable', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ secret, code })
      })
      .then(res => res.json())
      .then(data => {
        window.hideSpinner();
        window.showNotification(data.message || 'Error', data.success);
        if (data.success) {
          setTimeout(() => {
            // Hide the enable section and return to main list
            showMainList();
          }, 700);
        }
      })
      .catch(() => {
        window.hideSpinner();
        window.showNotification('Network error', false);
      });
    });
  }
  // 2FA Disable (show input only after button click)
  const disableBtn = document.getElementById('twofa-disable-btn');
  const disableForm = document.getElementById('twofa-disable-form');
  if (disableBtn && disableForm) {
    disableBtn.addEventListener('click', function() {
      disableBtn.style.display = 'none';
      disableForm.style.display = '';
      const codeInputs = disableForm.querySelectorAll('.twofa-disable-code-input');
      if (codeInputs.length) codeInputs[0].focus();
    });
  }
  if (disableForm) {
    // Handle 6-column OTP input for disable
    const codeInputs = disableForm.querySelectorAll('.twofa-disable-code-input');
    codeInputs.forEach((input, idx) => {
      input.addEventListener('input', function(e) {
        this.value = this.value.replace(/[^0-9]/g, '');
        if (this.value && idx < codeInputs.length - 1) codeInputs[idx + 1].focus();
        updateDisableCodeHidden();
      });
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Backspace' && !this.value && idx > 0) codeInputs[idx - 1].focus();
      });
      // Paste event for OTP columns
      input.addEventListener('paste', function(e) {
        const paste = (e.clipboardData || window.clipboardData).getData('text');
        if (/^\d{6}$/.test(paste)) {
          e.preventDefault();
          for (let i = 0; i < 6; i++) {
            codeInputs[i].value = paste[i];
          }
          codeInputs[5].focus();
          updateDisableCodeHidden();
        }
      });
    });
    function updateDisableCodeHidden() {
      const code = Array.from(codeInputs).map(i => i.value).join('');
      document.getElementById('twofa-disable-code').value = code;
    }
    disableForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const code = document.getElementById('twofa-disable-code').value || '';
      if (!/^\d{6}$/.test(code)) {
        window.showNotification('Enter a valid 6-digit code', false);
        return;
      }
      window.showSpinner();
      fetch('/api/2fa/disable', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ code })
      })
      .then(res => res.json())
      .then(data => {
        window.hideSpinner();
        window.showNotification(data.message || 'Error', data.success);
        if (data.success) {
          setTimeout(() => { show2FAStatus(); }, 700);
        }
      })
      .catch(() => {
        window.hideSpinner();
        window.showNotification('Network error', false);
      });
    });
  }
});
