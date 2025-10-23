// ============================================
// HR DASHBOARD CLIENT-SIDE JAVASCRIPT
// Fresh Pro Employee Tracker System
// ============================================

/**
 * Toggle sidebar visibility on mobile devices
 */
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");

  if (sidebar) {
    sidebar.classList.toggle("active");
  }

  // Prevent body scrolling when sidebar is open on mobile
  document.body.classList.toggle("sidebar-open");
}

/**
 * Close sidebar when clicking outside (for mobile)
 */
function closeSidebar() {
  const sidebar = document.getElementById("sidebar");

  if (sidebar) {
    sidebar.classList.remove("active");
  }

  document.body.classList.remove("sidebar-open");
}

// Auto-close sidebar on window resize from mobile to desktop
window.addEventListener("resize", function () {
  if (window.innerWidth > 768) {
    closeSidebar();
  }
});

// ============================================
// CONFIGURATION
// ============================================
// Store active marketers data for client-side time updates
let activeMarketersData = [];
let clientSideTimeInterval = null;

// Google Apps Script Web App URL
//const API_URL = "";

// Check if user is authenticated (has valid session data)
// If not, redirect to login page
function checkAuthentication() {
  const userType = sessionStorage.getItem("userType");
  const username = sessionStorage.getItem("username");

  // If no session data exists, user is not logged in
  if (!userType || !username || userType !== "hr") {
    // Redirect to login page
    window.location.href = "auth.html";
    return false;
  }

  return true;
}

// ============================================
// PAGE INITIALIZATION
// ============================================

// This runs when the page loads
window.addEventListener("DOMContentLoaded", function () {
  // Check if user is authenticated
  if (!checkAuthentication()) {
    return;
  }

  // Display welcome message with HR name
  displayWelcomeMessage();

  // Load initial dashboard data
  showLoadingState();
  loadDashboardOverview();

  // Load shops list (for dropdowns)
  loadShopsList();

  // Start auto-refresh for real-time data
  setInterval(autoRefreshData, 20000);
});
// ============================================
// DISPLAY WELCOME MESSAGE
// ============================================

/**
 * Displays personalized welcome message using stored session data
 */
function displayWelcomeMessage() {
  const fullName = sessionStorage.getItem("fullName");

  // Find the welcome message element and update it
  const welcomeElement = document.querySelector(".navbar-content span");
  if (welcomeElement && fullName) {
    welcomeElement.textContent = `Welcome, ${fullName}`;
  }
}

// ============================================
// LOGOUT FUNCTIONALITY
// ============================================

/**
 * Handles logout - confirms, clears session, and redirects to login
 */
// ============================================
// LOGOUT FUNCTIONALITY WITH DATABASE UPDATE
// ============================================

/**
 * Handles logout - confirms, updates database, clears session, and redirects to login
 */
async function handleLogout() {
  // Ask user for confirmation
  const confirmLogout = confirm("Are you sure you want to log out?");

  if (!confirmLogout) {
    console.log("Logout canceled by user.");
    return;
  }

  try {
    // Show loading state
    showLoadingState();

    // Get current session data
    const hrId = sessionStorage.getItem("userId");
    const username = sessionStorage.getItem("username");

    // Send logout request to server to update database
    if (hrId && username) {
      const logoutData = {
        action: "logoutHR",
        hrId: hrId,
        username: username
      };

      const response = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify(logoutData),
      });

      const data = await response.json();

      if (!data.success) {
        console.error("Logout update failed:", data.message);
        // Continue with logout anyway
      }
    }

    // Clear all session data
    sessionStorage.clear();

    // Hide loading state
    hideLoadingState();

    // Show success message briefly
    showSuccess("Logged out successfully!");

    // Redirect to login page after brief delay
    setTimeout(() => {
      window.location.href = "auth.html";
    }, 500);

  } catch (error) {
    console.error("Logout error:", error);
    hideLoadingState();
    
    // Clear session anyway
    sessionStorage.clear();
    
    // Redirect to login page
    window.location.href = "auth.html";
  }
}

// Attach logout handler to logout button
document.addEventListener("DOMContentLoaded", function () {
  const logoutButton = document.querySelector('a[href="index.html"]');
  if (logoutButton) {
    logoutButton.addEventListener("click", function (e) {
      e.preventDefault();
      handleLogout();
    });
  }
});


// Attach logout handler to logout button
document.addEventListener("DOMContentLoaded", function () {
  const logoutButton = document.querySelector('a[href="auth.html"]');
  if (logoutButton) {
    logoutButton.addEventListener("click", function (e) {
      e.preventDefault();
      handleLogout();
    });
  }
});

// ============================================
// DASHBOARD OVERVIEW TAB
// ============================================

/**
 * Loads and displays dashboard overview data
 * Shows: Total marketers, currently logged in, recent activity
 */
async function loadDashboardOverview() {
  try {
    // Show loading state
    showLoadingState();

    // Fetch dashboard data from Google Apps Script
    const response = await fetch(`${API_URL}?action=getDashboardOverview`, {
      method: "GET",
    });

    const data = await response.json();

    if (data.success) {
      // Update summary cards
      updateSummaryCards(data.summary);

      // Update recent activity table
      updateRecentActivityTable(data.recentActivity);
    } else {
      showError("Failed to load dashboard data: " + data.message);
    }
  } catch (error) {
    console.error("Error loading dashboard:", error);
    showError("Error connecting to server. Please refresh the page.");
  } finally {
    hideLoadingState(); // Always hide loading state
  }
}

/**
 * Updates the summary cards (Total Marketers, Currently Logged In)
 */
function updateSummaryCards(summary) {
  // Update Total Field Marketers card
  const totalMarketersElement = document.querySelector(
    "#overview-tab .col:nth-child(1) p"
  );
  if (totalMarketersElement) {
    totalMarketersElement.textContent = summary.totalMarketers || 0;
  }

  // Update Currently Logged In card
  const loggedInElement = document.querySelector(
    "#overview-tab .col:nth-child(2) p"
  );
  if (loggedInElement) {
    loggedInElement.textContent = summary.currentlyLoggedIn || 0;
  }
}

/**
 * Updates the recent activity table with latest login/logout events
 */
function updateRecentActivityTable(activities) {
  const tbody = document.querySelector("#overview-tab tbody");

  if (!tbody) return;

  // Clear existing rows
  tbody.innerHTML = "";

  // If no activities, show message
  if (!activities || activities.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; color: #7f8c8d;">
          No recent activity
        </td>
      </tr>
    `;
    return;
  }

  // Add rows for each activity
  activities.forEach((activity) => {
    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${activity.time}</td>
      <td>${activity.marketerName}</td>
      <td>
        <span class="badge badge-${
          activity.action === "Login" ? "success" : "danger"
        }">
          ${activity.action}
        </span>
      </td>
      <td>${activity.location}</td>
    `;
  });
}

// ============================================
// REGISTER SHOP TAB
// ============================================

/**
 * Loads existing shops list
 */
async function loadShopsList() {
  try {
    const response = await fetch(`${API_URL}?action=getShops`, {
      method: "GET",
    });

    const data = await response.json();

    if (data.success) {
      updateShopsListTable(data.shops);
      // Also update shop dropdowns in marketer registration form
      updateShopDropdowns(data.shops);
    } else {
      showError("Failed to load shops: " + data.message);
    }
  } catch (error) {
    console.error("Error loading shops:", error);
    showError("Error connecting to server.");
  } finally {
    hideLoadingState(); // Always hide loading state
  }
}

/**
 * Updates the shops list table
 */
function updateShopsListTable(shops) {
  const tbody = document.querySelector("#shops-list-table tbody");

  if (!tbody) return;

  tbody.innerHTML = "";

  if (!shops || shops.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" style="text-align: center; color: #7f8c8d;">
          No shops registered yet
        </td>
      </tr>
    `;
    return;
  }

  shops.forEach((shop) => {
    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${shop.shopId}</td>
      <td>${shop.shopName}</td>
      <td>${shop.shopAddress}</td>
    `;
  });
}

/**
 * Updates shop dropdown in marketer registration form
 */
function updateShopDropdowns(shops) {
  const shopSelect = document.getElementById("marketer-shop");

  if (!shopSelect) return;

  // Clear existing options
  shopSelect.innerHTML = "";

  if (!shops || shops.length === 0) {
    shopSelect.innerHTML =
      '<option value="">No shops available - Register a shop first</option>';
    shopSelect.disabled = true;
    return;
  }

  // Enable dropdown
  shopSelect.disabled = false;

  // Add default option
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "-- Select a shop --";
  shopSelect.appendChild(defaultOption);

  // Add shop options
  shops.forEach((shop) => {
    const option = document.createElement("option");
    option.value = shop.shopId;
    option.textContent = `${shop.shopName} (${shop.shopId})`;
    shopSelect.appendChild(option);
  });
}

/**
 * Handles shop registration
 */
async function handleRegisterShop(event) {
  event.preventDefault();

  const shopName = document.getElementById("shop-name").value.trim();
  const shopAddress = document.getElementById("shop-address").value.trim();

  // Validate input
  if (!shopName || !shopAddress) {
    showError("All fields are required");
    return;
  }

  try {
    showLoadingState();

    // Get current HR session data
    const hrUserId = sessionStorage.getItem("userId");
    const hrFullName = sessionStorage.getItem("fullName");

    const shopData = {
      action: "registerShop",
      shopName: shopName,
      shopAddress: shopAddress,
      registeredByHRId: hrUserId,
      registeredByHRName: hrFullName,
    };

    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(shopData),
    });

    const data = await response.json();

    hideLoadingState();

    if (data.success) {
      showSuccess(data.message || "Shop registered successfully!");

      // Clear form
      document.getElementById("register-shop-form").reset();

      // Reload shops list
      loadShopsList();
    } else {
      showError(data.message || "Failed to register shop");
    }
  } catch (error) {
    console.error("Shop registration error:", error);
    hideLoadingState();
    showError("Error connecting to server. Please try again.");
  }
}

// ============================================
// REGISTER MARKETER TAB
// ============================================

/**
 * Handles registration of a new field marketer
 */
async function handleRegisterMarketer(event) {
  event.preventDefault();

  // Get form values
  const fullName = document.getElementById("marketer-fullname").value.trim();
  const username = document.getElementById("marketer-username").value.trim();
  const password = document.getElementById("marketer-password").value.trim();
  const shopId = document.getElementById("marketer-shop").value;

  // Validate input
  if (!fullName || !username || !password || !shopId) {
    showError("All fields are required");
    return;
  }

  // Validate password length
  if (password.length < 6) {
    showError("Password must be at least 6 characters long");
    return;
  }

  // Check if shop is selected
  if (shopId === "") {
    showWarning(
      "Please select a shop. If no shops are available, register a shop first."
    );
    return;
  }

  try {
    showLoadingState();

    // Get current HR session data
    const hrUserId = sessionStorage.getItem("userId"); // HR_ID
    const hrFullName = sessionStorage.getItem("fullName"); // HR Full Name

    // Prepare registration data with HR info
    const registrationData = {
      action: "registerMarketer",
      fullName: fullName,
      username: username,
      password: password,
      shopId: shopId,
      registeredByHRId: hrUserId,
      registeredByHRName: hrFullName,
    };

    // Send to Google Apps Script
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(registrationData),
    });

    const data = await response.json();

    hideLoadingState();

    if (data.success) {
      showSuccess(data.message || "Field marketer registered successfully!");

      // Clear form
      document.getElementById("register-form").reset();

      // Refresh dashboard data
      loadDashboardOverview();
    } else {
      showError(data.message || "Failed to register marketer");
    }
  } catch (error) {
    console.error("Registration error:", error);
    hideLoadingState();
    showError("Error connecting to server. Please try again.");
  }
}

// Attach form submit handler
document.addEventListener("DOMContentLoaded", function () {
  const registerForm = document.getElementById("register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", handleRegisterMarketer);
  }
});
// Attach form submit handler for shop registration
document.addEventListener("DOMContentLoaded", function () {
  const registerShopForm = document.getElementById("register-shop-form");
  if (registerShopForm) {
    registerShopForm.addEventListener("submit", handleRegisterShop);
  }
});
// ============================================
// VIEW ALL MARKETERS TAB
// ============================================

/**
 * Loads and displays all registered field marketers
 */
async function loadAllMarketers() {
  try {
    showLoadingState();

    const response = await fetch(`${API_URL}?action=getAllMarketers`, {
      method: "GET",
    });

    const data = await response.json();

    hideLoadingState();

    if (data.success) {
      updateMarketersTable(data.marketers);
    } else {
      showError("Failed to load marketers: " + data.message);
    }
  } catch (error) {
    console.error("Error loading marketers:", error);
    hideLoadingState();
    showError("Error connecting to server.");
  }
}

/**
 * Updates the marketers table with data
 */
function updateMarketersTable(marketers) {
  const tbody = document.querySelector("#marketers-table tbody");

  if (!tbody) return;

  // Clear existing rows
  tbody.innerHTML = "";

  // If no marketers, show message
  if (!marketers || marketers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: #7f8c8d;">
          No marketers registered yet
        </td>
      </tr>
    `;
    return;
  }

  // Add rows for each marketer
  marketers.forEach((marketer) => {
    const row = tbody.insertRow();

    // Determine status badge color
    const statusClass = marketer.status === "Online" ? "success" : "secondary";

    row.innerHTML = `
      <td>${marketer.id}</td>
      <td>${marketer.name}</td>
      <td>${marketer.assignedShop}</td>
      <td>
        <span class="badge badge-${statusClass}">
          ${marketer.status}
        </span>
      </td>
      <td>${marketer.lastLogin || "Never"}</td>
      <td>${marketer.hoursToday || "0.0"} hrs</td>
    `;
  });
}

// ============================================
// REAL-TIME TRACKING TAB
// ============================================

let map; // Global map variable
let markersLayer; // Layer to hold all markers

/**
 * Initializes the Leaflet map
 */
function initMap() {
  // Only initialize if map doesn't exist
  if (map) return;

  // Create map centered on Harare, Zimbabwe
  map = L.map("map").setView([-17.8252, 31.0335], 12);

  // Add OpenStreetMap tiles
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);

  // Create a layer group for markers
  markersLayer = L.layerGroup().addTo(map);

  // Load active marketers on map
  loadActiveMarketersOnMap();
}

/**
 * Load Active Marketers On Map with auto-refresh
 */
async function loadActiveMarketersOnMap() {
  try {
    const response = await fetch(`${API_URL}?action=getActiveMarketers`, {
      method: "GET",
    });

    const data = await response.json();

    if (data.success) {
      updateMapMarkers(data.activeMarketers);
      updateActiveMarketersTable(data.activeMarketers);

      // Update last refresh time indicator
      updateLastRefreshTime();
    } else {
      console.error("Failed to load active marketers:", data.message);
    }
  } catch (error) {
    console.error("Error loading active marketers:", error);
  }
}

/**
 * Updates last refresh time display
 */
function updateLastRefreshTime() {
  let refreshIndicator = document.getElementById("last-refresh-time");

  if (!refreshIndicator) {
    // Create indicator if it doesn't exist
    const trackingTab = document.getElementById("tracking-tab");
    const card = trackingTab.querySelector(".card");

    if (card) {
      refreshIndicator = document.createElement("p");
      refreshIndicator.id = "last-refresh-time";
      refreshIndicator.style.cssText =
        "text-align: right; color: #7f8c8d; font-size: 12px; margin-top: 10px;";
      card.appendChild(refreshIndicator);
    }
  }

  if (refreshIndicator) {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    refreshIndicator.textContent = `Last updated: ${timeString}`;
  }
}

/**
 * Updates markers on the map with clustering for overlapping locations
 */
function updateMapMarkers(activeMarketers) {
  if (!map || !markersLayer) return;

  // Clear existing markers
  markersLayer.clearLayers();

  // If no active marketers, return
  if (!activeMarketers || activeMarketers.length === 0) return;

  // Group marketers by coordinates
  const locationGroups = {};

  activeMarketers.forEach((marketer) => {
    const coords = marketer.coordinates;

    if (!locationGroups[coords]) {
      locationGroups[coords] = [];
    }

    locationGroups[coords].push(marketer);
  });

  // Add markers for each location group
  Object.keys(locationGroups).forEach((coords) => {
    const marketers = locationGroups[coords];

    // Parse coordinates (format: "latitude,longitude")
    const coordParts = coords.split(",");
    const lat = parseFloat(coordParts[0]);
    const lng = parseFloat(coordParts[1]);

    // Create marker
    const marker = L.marker([lat, lng]).addTo(markersLayer);

    // Create popup content for all marketers at this location
    let popupContent = "";

    if (marketers.length === 1) {
      // Single marketer
      const marketer = marketers[0];
      popupContent = `
        <b>${marketer.name}</b><br>
        ${marketer.shopName}<br>
        <small>GPS: ${marketer.coordinates}</small>
      `;
    } else {
      // Multiple marketers at same location
      popupContent = `<b>${marketers.length} Marketers at this location:</b><br><br>`;

      marketers.forEach((marketer, index) => {
        popupContent += `
          ${index + 1}. <b>${marketer.name}</b><br>
          &nbsp;&nbsp;&nbsp;&nbsp;${marketer.shopName}<br>
        `;

        if (index < marketers.length - 1) {
          popupContent += "<br>";
        }
      });

      popupContent += `<br><small>GPS: ${coords}</small>`;
    }

    marker.bindPopup(popupContent);
  });
}

/**
 * Active marketers table with real-time incrementing duration
 */
function updateActiveMarketersTable(activeMarketers) {
  const tbody = document.querySelector("#tracking-tab tbody");

  if (!tbody) return;

  // Store data globally for client-side updates
  activeMarketersData = activeMarketers;

  tbody.innerHTML = "";

  if (!activeMarketers || activeMarketers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" style="text-align: center; color: #7f8c8d;">
          No active marketers at the moment
        </td>
      </tr>
    `;

    // Stop client-side updates if no active marketers
    if (clientSideTimeInterval) {
      clearInterval(clientSideTimeInterval);
      clientSideTimeInterval = null;
    }
    return;
  }

  activeMarketers.forEach((marketer, index) => {
    const row = tbody.insertRow();
    row.setAttribute("data-marketer-index", index);
    row.innerHTML = `
      <td>${marketer.name}</td>
      <td>${marketer.shopName}</td>
      <td><small>${marketer.coordinates}</small></td>
    `;
  });

  // Stop the client-side time updates
  if (clientSideTimeInterval) {
    clearInterval(clientSideTimeInterval);
    clientSideTimeInterval = null;
  }
}

/**
 * Starts client-side time increment (updates every second without server calls)
 */
function startClientSideTimeUpdates() {
  // Clear existing interval if any
  if (clientSideTimeInterval) {
    clearInterval(clientSideTimeInterval);
  }

  // Update every second
  clientSideTimeInterval = setInterval(() => {
    const tbody = document.querySelector("#tracking-tab tbody");
    if (!tbody || !activeMarketersData || activeMarketersData.length === 0) {
      clearInterval(clientSideTimeInterval);
      clientSideTimeInterval = null;
      return;
    }

    // Update each row's time display
    activeMarketersData.forEach((marketer, index) => {
      // Increment elapsed time
      marketer.elapsedSeconds++;

      // Calculate hours, minutes, seconds
      const hours = Math.floor(marketer.elapsedSeconds / 3600);
      const minutes = Math.floor((marketer.elapsedSeconds % 3600) / 60);
      const seconds = marketer.elapsedSeconds % 60;

      const timeString = `${hours}h ${minutes}m ${seconds}s`;

      // Find the corresponding row and update
      const row = tbody.querySelector(`tr[data-marketer-index="${index}"]`);
      if (row) {
        const timeCell = row.querySelector(".time-at-location");
        if (timeCell) {
          timeCell.textContent = timeString;
        }
      }
    });
  }, 1000);
}

/**
 * Refreshes the map and active marketers data
 */
function refreshMap() {
  if (map) {
    map.invalidateSize();
    showNotification("Refreshing data...", "info");
    loadActiveMarketersOnMap();
  }
}

// ============================================
// REPORTS & ANALYTICS TAB
// ============================================

/**
 * Loads attendance logs for reports
 */
async function loadAttendanceLogs() {
  try {
    showLoadingState();

    const response = await fetch(`${API_URL}?action=getAttendanceLogs`, {
      method: "GET",
    });

    const data = await response.json();

    hideLoadingState();

    if (data.success) {
      updateAttendanceLogsTable(data.logs);
      // Also generate the weekly hours chart if needed
      generateWeeklyHoursChart(data.logs);
    } else {
      showError("Failed to load attendance logs: " + data.message);
    }
  } catch (error) {
    console.error("Error loading attendance logs:", error);
    hideLoadingState();
    showError("Error connecting to server.");
  }
}

/**
 * Updates the attendance logs table
 */
function updateAttendanceLogsTable(logs) {
  const tbody = document.querySelector("#reports-tab tbody");

  if (!tbody) return;

  tbody.innerHTML = "";

  if (!logs || logs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; color: #7f8c8d;">
          No attendance logs available
        </td>
      </tr>
    `;
    return;
  }

  logs.forEach((log) => {
    const row = tbody.insertRow();

    // Format hours worked properly
    let hoursDisplay;
    if (log.hoursWorked === "In progress") {
      hoursDisplay = "In progress";
    } else {
      const hours = parseFloat(log.hoursWorked);
      const wholeHours = Math.floor(hours);
      const minutes = Math.round((hours - wholeHours) * 60);
      hoursDisplay = `${wholeHours}h ${minutes}m`;
    }

    row.innerHTML = `
      <td>${log.date}</td>
      <td>${log.marketerName}</td>
      <td>${log.shopName}</td>
      <td>${log.loginTime}</td>
      <td>${log.logoutTime}</td>
      <td><small>${log.loginGPS}</small></td>
      <td><small>${log.logoutGPS}</small></td>
      <td><strong>${hoursDisplay}</strong></td>
    `;
  });
}

/**
 * Generates weekly hours chart
 */
// Global variable to store chart instance
let weeklyHoursChart = null;

/**
 * Generates weekly hours(calculated based on table data) bar chart using Chart.js
 */
function generateWeeklyHoursChart(logs) {
  const canvas = document.getElementById("hoursChart");

  if (!canvas) return;

  // Destroy existing chart if it exists
  if (weeklyHoursChart) {
    weeklyHoursChart.destroy();
  }

  // Get current date and calculate week boundaries
  const today = new Date();
  const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Calculate start of week (Sunday)
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - currentDay);
  weekStart.setHours(0, 0, 0, 0);

  // Days of the week
  const daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  // Initialize hours for each day
  const hoursPerDay = [0, 0, 0, 0, 0, 0, 0];

  // Process logs and calculate hours per day
  logs.forEach((log) => {
    // Skip logs that are still in progress
    if (log.hoursWorked === "In progress") return;

    const logDate = parseDate(log.date);
    if (!logDate) return;

    // Check if log is within current week
    if (logDate >= weekStart && logDate <= today) {
      const dayIndex = logDate.getDay();
      
      // Parse hours from "Xh Ym" format
      let totalHours = 0;
      
      if (typeof log.hoursWorked === 'string') {
        const hoursMatch = log.hoursWorked.match(/(\d+)h/);
        const minutesMatch = log.hoursWorked.match(/(\d+)m/);
        
        const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
        const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
        
        totalHours = hours + (minutes / 60);
      } else if (typeof log.hoursWorked === 'number') {
        totalHours = log.hoursWorked;
      }
      
      hoursPerDay[dayIndex] += totalHours;
    }
  });

  // Round hours to 2 decimal places
  const roundedHours = hoursPerDay.map((h) => Math.round(h * 100) / 100);

  // Calculate total hours for the week
  const totalHours = roundedHours.reduce((sum, h) => sum + h, 0);
  const totalWholeHours = Math.floor(totalHours);
  const totalMinutes = Math.round((totalHours - totalWholeHours) * 60);

  // Create gradient for bars
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, "#27ae60");
  gradient.addColorStop(1, "#2ecc71");

  // Chart configuration
  const chartConfig = {
    type: "bar",
    data: {
      labels: daysOfWeek,
      datasets: [
        {
          label: "Hours Worked",
          data: roundedHours,
          backgroundColor: gradient,
          borderColor: "#27ae60",
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: `Total Hours This Week: ${totalWholeHours}h ${totalMinutes}m`,
          font: {
            size: 16,
            weight: "bold",
          },
          color: "#2c3e50",
          padding: {
            bottom: 20,
          },
        },
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "rgba(44, 62, 80, 0.9)",
          padding: 12,
          titleFont: {
            size: 14,
            weight: "bold",
          },
          bodyFont: {
            size: 13,
          },
          cornerRadius: 8,
          callbacks: {
            label: function (context) {
              const hours = context.parsed.y;
              const wholeHours = Math.floor(hours);
              const minutes = Math.round((hours - wholeHours) * 60);
              return `Hours: ${wholeHours}h ${minutes}m`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              const wholeHours = Math.floor(value);
              const minutes = Math.round((value - wholeHours) * 60);
              return minutes > 0 ? `${wholeHours}h ${minutes}m` : `${wholeHours}h`;
            },
            font: {
              size: 12,
            },
            color: "#7f8c8d",
          },
          grid: {
            color: "rgba(0, 0, 0, 0.05)",
            drawBorder: false,
          },
          title: {
            display: true,
            text: "Hours",
            font: {
              size: 13,
              weight: "bold",
            },
            color: "#2c3e50",
          },
        },
        x: {
          ticks: {
            font: {
              size: 12,
            },
            color: "#7f8c8d",
          },
          grid: {
            display: false,
            drawBorder: false,
          },
        },
      },
      animation: {
        duration: 1000,
        easing: "easeInOutQuart",
      },
    },
  };

  // Create the chart
  weeklyHoursChart = new Chart(ctx, chartConfig);
}

/**
 * Helper function to parse date string (dd/MM/yyyy)
 */
function parseDate(dateStr) {
  if (!dateStr) return null;

  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;

  // Create date from dd/MM/yyyy format
  return new Date(parts[2], parts[1] - 1, parts[0]);
}

/**
 * Helper function to parse date string (dd/MM/yyyy)
 */
function parseDate(dateStr) {
  if (!dateStr) return null;

  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;

  // Create date from dd/MM/yyyy format
  return new Date(parts[2], parts[1] - 1, parts[0]);
}

// ============================================
// TAB SWITCHING WITH DATA LOADING
// ============================================

/**
 * Show Tab function with cleanup
 */
function showTab(tabName) {
  // Hide all tabs
  document.querySelectorAll(".tab-content").forEach((tab) => {
    tab.classList.add("hidden");
  });

  // Remove active class from all nav links
  document.querySelectorAll(".sidebar-nav a").forEach((link) => {
    link.classList.remove("active");
  });

  // Show selected tab
  document.getElementById(tabName + "-tab").classList.remove("hidden");

  // Add active class to clicked link
  if (event && event.target) {
    event.target.classList.add("active");
  }

  // Cleanup when leaving tracking tab
  if (clientSideTimeInterval && tabName !== "tracking") {
    clearInterval(clientSideTimeInterval);
    clientSideTimeInterval = null;
  }

  // Load data based on tab
  switch (tabName) {
    case "overview":
      loadDashboardOverview();
      break;
    case "register-shop":
      loadShopsList();
      break;
    case "register":
      loadShopsList();
      break;
    case "view-all":
      loadAllMarketers();
      break;
    case "tracking":
      if (!map) {
        setTimeout(initMap, 100);
      } else {
        loadActiveMarketersOnMap();
      }
      break;
    case "reports":
      loadAttendanceLogs();
      break;
  }
}

// ============================================
// AUTO-REFRESH FUNCTIONALITY
// ============================================
/**
 * AUTO-REFRESH with smart intervals
 */
function autoRefreshData() {
  const activeTab = document.querySelector(".tab-content:not(.hidden)");

  if (!activeTab) return;

  const tabId = activeTab.id;

  if (tabId === "overview-tab") {
    loadDashboardOverview();
  } else if (tabId === "tracking-tab" && map) {
    // Refresh server data every 20 seconds
    // Client-side time continues to update every second
    loadActiveMarketersOnMap();
  } else if (tabId === "view-all-tab") {
    // Refresh all marketers view
    loadAllMarketers();
  } 
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Shows loading state with spinner overlay
 */
function showLoadingState() {
  let overlay = document.getElementById("loading-overlay");

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "loading-overlay";
    overlay.className = "loading-overlay";
    overlay.innerHTML = '<div class="loading-spinner"></div>';
    document.body.appendChild(overlay);
  }

  overlay.classList.remove("hidden");
}

/**
 * Hides loading state
 */
function hideLoadingState() {
  const overlay = document.getElementById("loading-overlay");
  if (overlay) {
    overlay.classList.add("hidden");
  }
}

/**
 * Shows notification with auto-dismiss for info messages
 * Shows notification message to user
 * @param {string} message - The message to display
 * @param {string} type - Type of notification: 'error', 'success', or 'warning'
 */

function showNotification(message, type = "error") {
  // Remove any existing notifications
  const existingNotification = document.querySelector(".notification");
  if (existingNotification) {
    existingNotification.remove();
  }

  // Create notification element
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;

  // Add to page
  document.body.appendChild(notification);

  // Auto-remove based on type
  const dismissTime = type === "info" ? 2000 : 5000;

  // Auto-remove
  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease-out";
    setTimeout(() => notification.remove(), 300);
  }, dismissTime);
}

/**
 * Shows error message to user
 */
function showError(message) {
  showNotification(message, "error");
}

/**
 * Shows success message to user
 */
function showSuccess(message) {
  showNotification(message, "success");
}

/**
 * Shows warning message to user
 */
function showWarning(message) {
  showNotification(message, "warning");
}
