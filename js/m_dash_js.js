// ============================================
// MARKETER DASHBOARD JAVASCRIPT - COMPLETE
// ============================================

let elapsedSeconds = 0;
let loginTimestamp = null;
let currentCoordinates = { lat: null, lon: null };
let attendanceLogged = false;
let attendanceRecordId = null; // Store the row ID for updates

// Network monitoring
let networkDownTime = null;
let networkCheckInterval = null;
let offlineGracePeriod = 120; // 2 minutes in seconds
let isManualLogout = false;
let isPageRefresh = false;
// ============================================
// PAGE INITIALIZATION
// ============================================

/**
 * Check if user is logged in, redirect if not
 */
function checkAuth() {
  const userType = sessionStorage.getItem("userType");
  const marketerData = sessionStorage.getItem("marketerData");

  if (!userType || userType !== "marketer" || !marketerData) {
    alert("Please login first");
    window.location.href = "auth.html";
    return false;
  }
  return true;
}

/**
 * Load marketer data from sessionStorage
 */
function loadMarketerData() {
  try {
    const marketerData = JSON.parse(sessionStorage.getItem("marketerData"));
    const fullName = sessionStorage.getItem("fullName");
    const username = sessionStorage.getItem("username");
    const userId = sessionStorage.getItem("userId");
    const shopName = sessionStorage.getItem("shopName");
    const shopId = sessionStorage.getItem("shopId");

    // Update UI with marketer information
    document.getElementById("marketername").textContent = fullName || "User";
    document.getElementById("markerterfullName").textContent =
      fullName || "N/A";
    document.getElementById("markerterID").textContent = userId || "N/A";
    document.getElementById("assignedShop").textContent = shopName || "N/A";
    document.getElementById("shop").textContent = shopName || "Shop Location";

    // Set login time (current time)
    loginTimestamp = new Date();
    const timeString = loginTimestamp.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    document.getElementById("loginTime").textContent = timeString;
    document.getElementById("firstTimeLoginTime").textContent = timeString;
  } catch (error) {
    console.error("Error loading marketer data:", error);
    showAlert("danger", "Error loading user data");
  }
}

// ============================================
// ATTENDANCE LOGGING
// ============================================

async function logAttendanceToDatabase() {
  // Check if this is a refresh - don't log again
  if (sessionStorage.getItem("isRefreshing") === "true") {
    console.log("Page refresh detected - skipping attendance log");
    attendanceLogged = true;
    startNetworkMonitoring();
    return;
  }

  // Check if already logged
  if (attendanceLogged) {
    console.log("Attendance already logged for this session");
    return;
  }

  // Wait for GPS coordinates
  if (!currentCoordinates.lat || !currentCoordinates.lon) {
    console.log("Waiting for GPS coordinates before logging attendance...");
    // Retry after 2 seconds
    setTimeout(logAttendanceToDatabase, 2000);
    return;
  }

  try {
    const marketerData = JSON.parse(sessionStorage.getItem("marketerData"));

    const attendanceData = {
      action: "logAttendance",
      marketerId: marketerData.marketerId,
      marketerName: marketerData.fullName,
      shopId: marketerData.shopId,
      shopName: marketerData.shopName,
      loginCoordinates: `${currentCoordinates.lat},${currentCoordinates.lon}`,
    };

    console.log("Logging attendance:", attendanceData);

    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(attendanceData),
    });

    const result = await response.json();

    if (result.success) {
      attendanceLogged = true;
      attendanceRecordId = result.recordId; // Store for future updates
      console.log("✅ Attendance logged successfully!");
      showAlert("success", "✅ Attendance logged - You are now visible to HR");
      setTimeout(() => clearAlert(), 5000);

      // Start network monitoring
      startNetworkMonitoring();
    } else {
      console.error("Failed to log attendance:", result.message);
      showAlert("warning", "⚠️ Failed to log attendance. Retrying...");
      // Retry after 5 seconds
      setTimeout(logAttendanceToDatabase, 5000);
    }
  } catch (error) {
    console.error("Error logging attendance:", error);
    showAlert("danger", "❌ Error logging attendance. Check connection.");
    // Retry after 10 seconds
    setTimeout(logAttendanceToDatabase, 10000);
  }
}

// ============================================
// LOGOUT FUNCTIONALITY
// ============================================

async function handleLogout() {
  const confirmLogout = confirm("Are you sure you want to logout?");

  if (!confirmLogout) {
    return;
  }

  isManualLogout = true;

  try {
    showAlert("info", "⏳ Logging out...");

    const marketerData = JSON.parse(sessionStorage.getItem("marketerData"));

    const logoutData = {
      action: "logoutMarketer",
      marketerId: marketerData.marketerId,
      marketerName: marketerData.fullName,
      shopId: marketerData.shopId,
      logoutCoordinates: `${currentCoordinates.lat || "N/A"},${
        currentCoordinates.lon || "N/A"
      }`,
      logoutType: "Manual",
    };

    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(logoutData),
    });

    const result = await response.json();

    if (result.success) {
      console.log("✅ Logout successful");
      showAlert("success", "✅ Logout successful. Redirecting...");

      // Clear session storage
      sessionStorage.clear();

      // Redirect to login after 1 second
      setTimeout(() => {
        window.location.href = "auth.html";
      }, 1000);
    } else {
      console.error("Logout failed:", result.message);
      showAlert("danger", "❌ Logout failed. Please try again.");
    }
  } catch (error) {
    console.error("Error during logout:", error);
    showAlert("danger", "❌ Error logging out. Clearing session...");

    // Even if server fails, clear local session
    sessionStorage.clear();
    setTimeout(() => {
      window.location.href = "auth.html";
    }, 2000);
  }
}

// ============================================
// NETWORK MONITORING
// ============================================

function startNetworkMonitoring() {
  // Check network status every 5 seconds
  networkCheckInterval = setInterval(checkNetworkStatus, 5000);

  // Listen to online/offline events
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
}

function checkNetworkStatus() {
  if (!navigator.onLine && !networkDownTime) {
    handleOffline();
  } else if (navigator.onLine && networkDownTime) {
    handleOnline();
  }
}

function handleOffline() {
  if (!networkDownTime) {
    networkDownTime = new Date();
    console.warn("⚠️ Network connection lost at:", networkDownTime);

    showAlert("warning", "⚠️ Connection lost. Trying to reconnect...");

    document.getElementById("status-text").textContent = "Connection Lost";
    document.getElementById("status-indicator").className =
      "status-indicator status-warning";

    // Start countdown timer
    startOfflineCountdown();
  }
}

function handleOnline() {
  if (networkDownTime) {
    const downDuration = Math.floor((new Date() - networkDownTime) / 1000);
    console.log("✅ Network restored after", downDuration, "seconds");

    if (downDuration > offlineGracePeriod) {
      // Exceeded grace period - mark as auto-disconnected
      console.warn("❌ Exceeded grace period. Auto-disconnecting...");
      autoDisconnectMarketer("Auto_Disconnect_Network");
    } else {
      // Within grace period - just update status
      console.log("✅ Reconnected within grace period");
      showAlert("success", "✅ Connection restored!");

      document.getElementById("status-text").textContent =
        "Connected and Tracking";
      document.getElementById("status-indicator").className =
        "status-indicator status-connected";

      networkDownTime = null;
      setTimeout(() => clearAlert(), 3000);
    }
  }
}

function startOfflineCountdown() {
  const countdownInterval = setInterval(() => {
    if (!networkDownTime) {
      clearInterval(countdownInterval);
      return;
    }

    const elapsed = Math.floor((new Date() - networkDownTime) / 1000);
    const remaining = offlineGracePeriod - elapsed;

    if (remaining <= 0) {
      clearInterval(countdownInterval);
      if (!navigator.onLine) {
        autoDisconnectMarketer("Auto_Disconnect_Network");
      }
    } else {
      document.getElementById(
        "status-text"
      ).textContent = `Reconnecting... ${remaining}s`;
    }
  }, 1000);
}

async function autoDisconnectMarketer(reason) {
  try {
    const marketerData = JSON.parse(sessionStorage.getItem("marketerData"));

    const disconnectData = {
      action: "logoutMarketer",
      marketerId: marketerData.marketerId,
      marketerName: marketerData.fullName,
      shopId: marketerData.shopId,
      logoutCoordinates: "N/A",
      logoutType: reason,
    };

    await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(disconnectData),
    });

    showAlert("danger", "❌ Session ended due to prolonged network loss");

    sessionStorage.clear();

    setTimeout(() => {
      window.location.href = "auth.html";
    }, 3000);
  } catch (error) {
    console.error("Error during auto-disconnect:", error);
    sessionStorage.clear();
    window.location.href = "auth.html";
  }
}

// ============================================
// GPS TRACKING
// ============================================

/**
 * Get and update GPS coordinates
 */
function startGPSTracking() {
  if ("geolocation" in navigator) {
    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateCoordinates(position.coords.latitude, position.coords.longitude);
        showAlert("success", "✅ GPS location acquired successfully");
        setTimeout(() => clearAlert(), 3000);

        // Log attendance once GPS is acquired
        logAttendanceToDatabase();
      },
      (error) => {
        handleGPSError(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    // Watch position for continuous updates
    navigator.geolocation.watchPosition(
      (position) => {
        updateCoordinates(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        handleGPSError(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  } else {
    showAlert("danger", "⚠️ GPS not supported on this device");
    document.getElementById("latitude").textContent = "Not available";
    document.getElementById("longitude").textContent = "Not available";
  }
}

/**
 * Update coordinates in UI
 */
function updateCoordinates(lat, lon) {
  currentCoordinates.lat = lat;
  currentCoordinates.lon = lon;

  document.getElementById("latitude").textContent = lat.toFixed(6);
  document.getElementById("longitude").textContent = lon.toFixed(6);

  if (navigator.onLine) {
    // Update connection status
    document.getElementById("status-text").textContent =
      "Connected and Tracking";
    document.getElementById("status-indicator").className =
      "status-indicator status-connected";
  }
}

/**
 * Handle GPS errors
 */
function handleGPSError(error) {
  let message = "GPS Error: ";

  switch (error.code) {
    case error.PERMISSION_DENIED:
      message += "Please enable location permissions";
      break;
    case error.POSITION_UNAVAILABLE:
      message += "Location information unavailable";
      break;
    case error.TIMEOUT:
      message += "Location request timed out";
      break;
    default:
      message += "Unknown error occurred";
  }

  showAlert("warning", "⚠️ " + message);

  document.getElementById("status-text").textContent = "GPS Weak";
  document.getElementById("status-indicator").className =
    "status-indicator status-warning";
}

// ============================================
// TIME TRACKING
// ============================================

/**
 * Update current date/time display
 */
function updateDateTime() {
  const now = new Date();
  document.getElementById("current-datetime").textContent =
    now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }) +
    " - " +
    now.toLocaleTimeString();
}

/**
 * Update elapsed time since login
 */
function updateElapsedTime() {
  elapsedSeconds++;

  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  const timeString =
    String(hours).padStart(2, "0") +
    ":" +
    String(minutes).padStart(2, "0") +
    ":" +
    String(seconds).padStart(2, "0");

  document.getElementById("elapsed-time").textContent = timeString;

  const hoursDecimal = (elapsedSeconds / 3600).toFixed(1);
  document.getElementById("todayHoursSpend").textContent = hoursDecimal + "h";
}

// ============================================
// ALERT FUNCTIONS
// ============================================

/**
 * Show alert message
 */
function showAlert(type, message) {
  const alertArea = document.getElementById("alert-area");
  alertArea.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
}

/**
 * Clear alert message
 */
function clearAlert() {
  const alertArea = document.getElementById("alert-area");
  if (
    alertArea.querySelector(".alert-success") ||
    alertArea.querySelector(".alert-info")
  ) {
    alertArea.innerHTML = "";
  }
}

// ============================================
// INITIALIZATION
// ============================================

// Check authentication on page load
if (checkAuth()) {
  loadMarketerData(); // Load marketer data
  startGPSTracking(); // Start GPS tracking

  // Initialize time displays
  updateDateTime();
  updateElapsedTime();

  // Set intervals for updates
  setInterval(updateDateTime, 1000);
  setInterval(updateElapsedTime, 1000);

  // Check if this is a page refresh
  if (sessionStorage.getItem("isRefreshing") === "true") {
    console.log("✅ Page refreshed - session maintained");
    sessionStorage.removeItem("isRefreshing");
    attendanceLogged = true; // Don't log new attendance, just restore the session
    showAlert("info", "ℹ️ Session maintained"); // Show alert that session is maintained
    setTimeout(() => clearAlert(), 3000);
  }
  // Log attendance normally
  console.log("✅ Marketer dashboard loaded successfully");
}

// ============================================
// PAGE UNLOAD HANDLER
// ============================================

window.addEventListener("beforeunload", function (e) {
  // Detect if it's a page refresh vs actual close
  // Set flag in sessionStorage to track refresh
  if (
    performance.navigation.type === 1 ||
    e.currentTarget.performance.navigation.type === 1
  ) {
    // It's a refresh - don't logout
    sessionStorage.setItem("isRefreshing", "true");
    return;
  }

  // Only attempt logout if not already doing manual logout and not refreshing
  if (
    !isManualLogout &&
    attendanceLogged &&
    !sessionStorage.getItem("isRefreshing")
  ) {
    // Use sendBeacon for reliable background request
    const marketerData = JSON.parse(sessionStorage.getItem("marketerData"));

    const logoutData = {
      action: "logoutMarketer",
      marketerId: marketerData.marketerId,
      marketerName: marketerData.fullName,
      shopId: marketerData.shopId,
      logoutCoordinates: `${currentCoordinates.lat || "N/A"},${
        currentCoordinates.lon || "N/A"
      }`,
      logoutType: "Browser_Close",
    };

    // Send beacon (works even as page unloads)
    navigator.sendBeacon(API_URL, JSON.stringify(logoutData));
  }
});

// ============================================
// ATTACH LOGOUT BUTTON HANDLER
// ============================================

document.addEventListener("DOMContentLoaded", function () {
  const logoutBtn = document.querySelector('a[href="index.html"]');
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function (e) {
      e.preventDefault();
      handleLogout();
    });
  }
});
