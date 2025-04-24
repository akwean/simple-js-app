document.addEventListener('DOMContentLoaded', async function() {
  // Validate session with server before using localStorage data
  try {
    // Check session validity first
    const response = await fetch('/api/user/me');
    
    if (response.status === 401) {
      // Session is invalid - clear localStorage
      localStorage.removeItem('user');
      setupGuestNavbar();
      return;
    }
    
    // Get user info from localStorage only if session is valid
    const userString = localStorage.getItem('user');
    let user = null;
    
    try {
      user = userString ? JSON.parse(userString) : null;
    } catch (e) {
      console.error('Error parsing user data:', e);
      localStorage.removeItem('user');
    }
    
    // Select navbar elements
    const signInBtn = document.querySelector('.nav-item .btn-signin');
    const userDropdownContainer = document.createElement('li');
    userDropdownContainer.className = 'nav-item dropdown user-dropdown';
    
    // Check if we're on the nurse dashboard
    const isNurseDashboard = window.location.pathname.includes('nurse-dashboard');
    
    if (user) {
      // User is logged in - show user dropdown with logout
      setupUserNavbar(user, signInBtn, userDropdownContainer, isNurseDashboard);
    } else {
      // No user data - show default guest navbar
      setupGuestNavbar();
    }
  } catch (error) {
    console.error('Error validating session:', error);
    // On error, clear localStorage and show guest navbar
    localStorage.removeItem('user');
    setupGuestNavbar();
  }
  
  // Function to set up navbar for guests
  function setupGuestNavbar() {
    // Keep the sign-in button as is, no changes needed
  }
  
  // Function to set up navbar for logged-in users
  function setupUserNavbar(user, signInBtn, userDropdownContainer, isNurseDashboard) {
    if (signInBtn) {
      // Create dropdown toggle
      if (isNurseDashboard && user.userType === 'staff') {
        // Simplified dropdown for nurse dashboard - only logout
        userDropdownContainer.innerHTML = `
          <a class="nav-link dropdown-toggle" href="#" id="userDropdown" role="button" 
             data-bs-toggle="dropdown" aria-expanded="false">
            <i class="fas fa-user-circle me-1"></i>
            <span>${user.name} (Staff)</span>
          </a>
          <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
            <li><span class="dropdown-item-text">
              <small class="text-muted">${user.email}</small>
            </span></li>
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item logout-btn" href="#" id="logoutBtn">
              <i class="fas fa-sign-out-alt me-2"></i>Logout
            </a></li>
          </ul>
        `;
      } else {
        // Regular dropdown with all links for other pages
        userDropdownContainer.innerHTML = `
          <a class="nav-link dropdown-toggle" href="#" id="userDropdown" role="button" 
             data-bs-toggle="dropdown" aria-expanded="false">
            <i class="fas fa-user-circle me-1"></i>
            <span>${user.name}</span>
          </a>
          <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
            <li><span class="dropdown-item-text">
              <small class="text-muted">${user.email}</small>
            </span></li>
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item" href="History.html?user_id=${user.id}">
              <i class="fas fa-history me-2"></i>Medical History
            </a></li>
            ${user.userType === 'staff' ? 
              `<li><a class="dropdown-item" href="nurse-dashboard.html">
                <i class="fas fa-stethoscope me-2"></i>Nurse Dashboard
              </a></li>` : ''}
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item logout-btn" href="#" id="logoutBtn">
              <i class="fas fa-sign-out-alt me-2"></i>Logout
            </a></li>
          </ul>
        `;
      }
      
      // Replace sign-in button with user dropdown
      signInBtn.parentNode.replaceWith(userDropdownContainer);
      
      // Add logout functionality
      document.getElementById('logoutBtn').addEventListener('click', logout);
    }
  }
});

// Logout function
async function logout() {
  try {
    const response = await fetch('/api/logout');
    
    // Clear local storage regardless of server response
    localStorage.removeItem('user');
    
    if (response.ok) {
      // Redirect to home page
      window.location.href = 'index.html';
    } else {
      console.error('Logout failed, but local data cleared');
      // Redirect anyway
      window.location.href = 'index.html';
    }
  } catch (error) {
    console.error('Error during logout:', error);
    // Still clear localStorage and redirect on error
    localStorage.removeItem('user');
    window.location.href = 'index.html';
  }
}
