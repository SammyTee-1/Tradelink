document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("account-form");
  const editBtn = form.querySelector(".tl-edit-btn");
  const saveBtn = form.querySelector(".tl-save-btn");
  const cancelBtn = form.querySelector(".tl-cancel-btn");
  const nameInput = document.getElementById("account-name");
  const emailInput = document.getElementById("account-email");
  const phoneInput = document.getElementById("account-phone");
  const copyBtn = document.querySelector(".tl-copy-uid-btn");
  const uidValue = document.getElementById("uidValue");
  const removeAvatarBtn = document.getElementById("removeAvatarBtn");
  const profileAvatar = document.getElementById("profileAvatar");
  const defaultAvatar = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS1OEo0tHiqDvwchBU0xqX9wshmQRMiYIF7fniVQ2jBOIVNSyS65ypIZ4UKV0unvrzaHe8&usqp=CAU";

  // Store original values for cancel
  let originalName = nameInput.value;
  let originalPhone = phoneInput.value;

  // Make email field not editable
  emailInput.setAttribute("readonly", "readonly");
  emailInput.style.background = "#f0f4f8";
  emailInput.style.cursor = "not-allowed";

  // Initially disable editing for name and phone
  nameInput.setAttribute("readonly", "readonly");
  phoneInput.setAttribute("readonly", "readonly");

  // Edit button enables editing
  editBtn.addEventListener("click", function () {
    nameInput.removeAttribute("readonly");
    phoneInput.removeAttribute("readonly");
    nameInput.focus();
    editBtn.style.display = "none";
    saveBtn.style.display = "inline-block";
    cancelBtn.style.display = "inline-block";
    // Store current values for cancel
    originalName = nameInput.value;
    originalPhone = phoneInput.value;
  });

  // Save button submits changes
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    window.showSpinner();
    nameInput.setAttribute("readonly", "readonly");
    phoneInput.setAttribute("readonly", "readonly");
    editBtn.style.display = "inline-block";
    saveBtn.style.display = "none";
    cancelBtn.style.display = "none";

    fetch("/api/update_account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: nameInput.value,
        phone: phoneInput.value
      })
    })
      .then(res => res.json())
      .then(data => {
        window.hideSpinner();
        window.showNotification(data.message || "Account updated!", data.success);
        if (data.success) {
          nameInput.value = data.name;
          phoneInput.value = data.phone;
        }
      })
      .catch(() => {
        window.hideSpinner();
        window.showNotification("Network error", false);
      });
  });

  // Cancel button discards changes
  cancelBtn.addEventListener("click", function () {
    nameInput.value = originalName;
    phoneInput.value = originalPhone;
    nameInput.setAttribute("readonly", "readonly");
    phoneInput.setAttribute("readonly", "readonly");
    editBtn.style.display = "inline-block";
    saveBtn.style.display = "none";
    cancelBtn.style.display = "none";
  });

  // UID copy functionality using notification and icon, works on iOS and all browsers
  if (copyBtn && uidValue) {
    copyBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      const uid = uidValue.innerText.trim();

      // Try Clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(uid).then(function () {
          window.showNotification("UID copied!", true);
        }).catch(function () {
          fallbackCopy(uid);
        });
      } else {
        fallbackCopy(uid);
      }
      copyBtn.blur();
    });

    function fallbackCopy(text) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed"; // Prevent scrolling to bottom on iOS
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);

      // iOS: must use .focus() and .select()
      textarea.focus();
      textarea.select();

      try {
        const successful = document.execCommand('copy');
        window.showNotification(successful ? "UID copied!" : "Copy failed", successful);
      } catch (err) {
        window.showNotification("Copy failed", false);
      }
      document.body.removeChild(textarea);
    }
  }

  // Remove avatar: always set to default, no upload allowed
  if (removeAvatarBtn && profileAvatar) {
    removeAvatarBtn.addEventListener("click", function () {
      profileAvatar.src = defaultAvatar;
      window.showNotification("Profile photo removed!", true);
      // Optionally, you can send a request to backend to clear avatar_url if needed
      // fetch("/api/update_avatar", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ avatar_url: "" })
      // });
    });
  }
});