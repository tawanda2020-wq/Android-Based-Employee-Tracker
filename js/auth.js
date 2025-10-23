// ============================================
// CONFIGURATION
// ============================================

// Google Apps Script url
// https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
//const API_URL = "https://script.google.com/macros/s/AKfycbz-uC7jpSye9DyNmdhJLt_4c_4oGi8E4w-pDntBzrln3evvtx_ESBVEflmuK0S9XQYpLQ/exec";

// ============================================
// PAGE INITIALIZATION
// ============================================

// Check URL parameters for user type (from landing page buttons)
const urlParams = new URLSearchParams(window.location.search);
const userType = urlParams.get("type");

// Reference the HR alert div
const hrAlert = document.querySelector(".alert.alert-info");

if (userType === "hr") {
  document.getElementById("login-usertype").value = "hr";

  // Hide HR-only alert if userType is hr
  if (hrAlert) hrAlert.style.display = "none";
} else if (userType === "marketer") {
  document.getElementById("login-usertype").value = "marketer";
  toggleShopField();

  // Disable the signup tab for marketers
  const signupTab = document.querySelectorAll(".auth-tab")[1]; // Second tab (Signup)
  signupTab.disabled = true;
  signupTab.style.opacity = "0.5";
  signupTab.style.cursor = "not-allowed";
  signupTab.style.pointerEvents = "none";

  // Optionally add a visual indicator
  signupTab.title =
    "Field marketers cannot signup directly. Contact HR for registration.";

  // Update the HR alert to show marketer-specific message
  if (hrAlert) {
    hrAlert.classList.remove("alert-info");
    hrAlert.classList.add("alert-warning");
    hrAlert.textContent =
      "Field Marketers: Login using credentials provided by HR";
  }
}

// ============================================
// UI HELPER FUNCTIONS
// ============================================

/**
 * Switch between login and signup tabs
 */
function switchTab(tab) {
  const tabs = document.querySelectorAll(".auth-tab");
  const forms = document.querySelectorAll(".auth-form");

  tabs.forEach((t) => t.classList.remove("active"));
  forms.forEach((f) => f.classList.remove("active"));

  if (tab === "login") {
    tabs[0].classList.add("active");
    document.getElementById("login-form").classList.add("active");
  } else {
    tabs[1].classList.add("active");
    document.getElementById("signup-form").classList.add("active");
  }

  // Clear any messages when switching tabs
  document.getElementById("message-area").innerHTML = "";
}

/**
 * Toggle shop field visibility based on user type
 */
function toggleShopField() {
  const userType = document.getElementById("login-usertype").value;
  const shopField = document.getElementById("shop-field");

  if (userType === "marketer") {
    shopField.classList.remove("hidden");
    document.getElementById("login-shop").required = true;
  } else {
    shopField.classList.add("hidden");
    document.getElementById("login-shop").required = false;
  }
}

/**
 * Toggle password visibility
 */
function togglePassword(fieldId) {
  const field = document.getElementById(fieldId);
  field.type = field.type === "password" ? "text" : "password";
}

/**
 * Show message to user (success, danger, warning, info)
 */
function showMessage(message, type) {
  const messageArea = document.getElementById("message-area");
  messageArea.innerHTML = `<div class="alert alert-${type}">${message}</div>`;

  // Auto-hide success messages after 5 seconds
  if (type === "success") {
    setTimeout(() => {
      messageArea.innerHTML = "";
    }, 5000);
  }
}

/**
 * Show or hide loading spinner
 */
function toggleLoading(show) {
  const spinner = document.getElementById("loading-spinner");
  if (show) {
    spinner.classList.remove("hidden");
  } else {
    spinner.classList.add("hidden");
  }
}

/**
 * Check password strength and display indicator
 */
function checkPasswordStrength() {
  const password = document.getElementById("signup-password").value;
  const strengthDiv = document.getElementById("password-strength");

  if (password.length === 0) {
    strengthDiv.innerHTML = "";
    return;
  }

  if (password.length < 6) {
    strengthDiv.innerHTML =
      '<span class="strength-weak">⚠️ Weak: Too short (min 6 characters)</span>';
    return;
  }

  if (password.length < 8) {
    strengthDiv.innerHTML =
      '<span class="strength-medium">⚡ Medium: Acceptable</span>';
    return;
  }

  // Check for uppercase, lowercase, numbers
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (hasUpper && hasLower && hasNumber) {
    strengthDiv.innerHTML =
      '<span class="strength-strong">✓ Strong: Good password</span>';
  } else {
    strengthDiv.innerHTML =
      '<span class="strength-medium">⚡ Medium: Acceptable</span>';
  }
}

// ============================================
// LOAD SHOPS FROM DATABASE
// ============================================

/**
 * Loads shops from Google Sheets and populates dropdown
 */
async function loadShops() {
  try {
    const response = await fetch(API_URL + "?action=getShops");
    const data = await response.json();

    const shopSelect = document.getElementById("login-shop");

    if (data.success) {
      if (data.shops && data.shops.length > 0) {
        // Clear and populate with actual shops
        shopSelect.innerHTML =
          '<option value="">Select your assigned shop</option>';

        data.shops.forEach((shop) => {
          const option = document.createElement("option");
          option.value = shop.shopId;
          option.textContent = shop.shopName;
          shopSelect.appendChild(option);
        });
      } else {
        // No shops in database
        shopSelect.innerHTML =
          '<option value="">No shops available - Contact HR</option>';
        shopSelect.disabled = true;

        showMessage(
          "⚠️ No shops have been registered yet. Please contact HR to register shops first.",
          "warning"
        );
      }
    } else {
      // Error loading shops
      shopSelect.innerHTML = '<option value="">Error loading shops</option>';
      shopSelect.disabled = true;

      showMessage(
        "⚠️ Unable to load shops from database. Please refresh the page or contact support.",
        "danger"
      );
    }
  } catch (error) {
    console.error("Error loading shops:", error);

    const shopSelect = document.getElementById("login-shop");
    shopSelect.innerHTML =
      '<option value="">Connection error - Try again</option>';
    shopSelect.disabled = true;

    showMessage(
      "⚠️ Connection error. Please check your internet and refresh the page.",
      "danger"
    );
  }
}

// ============================================
// SIGNUP HANDLER
// ============================================

/**
 * Handles HR signup form submission
 */
async function handleSignup(event) {
  event.preventDefault();

  // Clear previous messages
  showMessage("", "info");

  // Get form values
  const fullName = document.getElementById("signup-fullname").value.trim();
  const username = document.getElementById("signup-username").value.trim();
  const password = document.getElementById("signup-password").value;
  const confirmPassword = document.getElementById("signup-confirm").value;

  // ============================================
  // CLIENT-SIDE VALIDATION
  // ============================================

  // Check if all fields are filled
  if (!fullName || !username || !password || !confirmPassword) {
    showMessage("All fields are required", "danger");
    return;
  }

  // Check if passwords match
  if (password !== confirmPassword) {
    showMessage("Passwords do not match", "danger");
    return;
  }

  // Check password length
  if (password.length < 6) {
    showMessage("Password must be at least 6 characters", "danger");
    return;
  }

  // Check username length
  if (username.length < 4) {
    showMessage("Username must be at least 4 characters", "danger");
    return;
  }

  // Check for valid username characters (letters, numbers, underscore only)
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    showMessage(
      "Username can only contain letters, numbers, and underscore",
      "danger"
    );
    return;
  }

  // ============================================
  // SEND TO GOOGLE APPS SCRIPT
  // ============================================

  // Show loading spinner
  toggleLoading(true);

  try {
    // Prepare signup data
    const signupData = {
      action: "signup",
      fullName: fullName,
      username: username,
      password: password,
    };

    // Make POST request to Google Apps Script
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(signupData),
    });

    const data = await response.json();
    console.log(data);

    // Hide loading spinner
    toggleLoading(false);

    if (data.success) {
      // Signup successful!
      showMessage(
        data.message || "Account created successfully! Please login.",
        "success"
      );

      // Clear the form
      document.getElementById("signup-form").reset();
      document.getElementById("password-strength").innerHTML = "";

      // Switch to login tab after 3 seconds
      setTimeout(() => {
        switchTab("login");
      }, 5000);
    } else {
      // Signup failed
      showMessage(data.message || "Signup failed. Please try again.", "danger");
    }
  } catch (error) {
    console.error("Signup error:", error);
    toggleLoading(false);
    showMessage(
      "Error connecting to server. Please check your internet connection.",
      "danger"
    );
  }
}

// ============================================
// LOGIN HANDLER
// ============================================

/**
 * Handles login form submission (HR and Field Marketers)
 */
async function handleLogin(event) {
  event.preventDefault();
  showMessage("", "info");

  const userType = document.getElementById("login-usertype").value;
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;
  const shopId = document.getElementById("login-shop").value;

  // Validation
  if (!userType) {
    showMessage("Please select user type", "danger");
    return;
  }

  if (!username || !password) {
    showMessage("Username and password are required", "danger");
    return;
  }

  // For field marketers, shop selection is required
  if (userType === "marketer") {
    const shopSelect = document.getElementById("login-shop");

    if (shopSelect.disabled) {
      showMessage(
        "Cannot login: No shops available. Please contact HR to register shops first.",
        "danger"
      );
      return;
    }

    if (!shopId) {
      showMessage("Please select your assigned shop", "danger");
      return;
    }
  }

  toggleLoading(true);

  try {
    const loginData = {
      action: "login",
      userType: userType,
      username: username,
      password: password,
      shopId: shopId,
    };

    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(loginData),
    });

    const data = await response.json();
    toggleLoading(false);

    if (data.success) {
      // Store user data in sessionStorage
      sessionStorage.setItem("userType", data.userType);
      sessionStorage.setItem("username", data.username);
      sessionStorage.setItem("fullName", data.fullName);
      sessionStorage.setItem("userId", data.userId);

      // For field marketers, store additional data
      if (data.userType === "marketer") {
        sessionStorage.setItem("shopId", data.shopId);
        sessionStorage.setItem("shopName", data.shopName);
        sessionStorage.setItem(
          "marketerData",
          JSON.stringify(data.marketerData)
        );
      }

      showMessage("Login successful! Redirecting...", "success");

      setTimeout(() => {
        if (data.userType === "hr") {
          window.location.href = "hr_dashboard.html";
        } else {
          window.location.href = "marketer_dashboard.html";
        }
      }, 1000);
    } else {
      showMessage(
        data.message || "Invalid credentials. Please try again.",
        "danger"
      );
    }
  } catch (error) {
    console.error("Login error:", error);
    toggleLoading(false);
    showMessage(
      "Error connecting to server. Please check your internet connection.",
      "danger"
    );
  }
}

// ============================================
// EVENT LISTENERS
// ============================================

// Attach form submit handlers when page loads
document.getElementById("signup-form").addEventListener("submit", handleSignup);
document.getElementById("login-form").addEventListener("submit", handleLogin);

// Detect URL parameter ?type=marketer or ?type=hr
// Run loadShops() automatically if type=marketer
if (userType === "marketer") {
  window.addEventListener("DOMContentLoaded", loadShops);
}

console.log("✓ Authentication page loaded successfully");
console.log(
  "⚠️ Remember to update API_URL with your Google Apps Script deployment URL"
);
