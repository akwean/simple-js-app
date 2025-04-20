document.addEventListener('DOMContentLoaded', function() {
  // Get user info from localStorage
  const userString = localStorage.getItem('user');
  let user = null;
  
  try {
    user = userString ? JSON.parse(userString) : null;
  } catch (e) {
    console.error('Error parsing user data:', e);
    // Clear invalid user data
    localStorage.removeItem('user');
  }
  
  // Select navbar elements
  const signInBtn = document.querySelector('.nav-item .btn-signin');
  const userDropdownContainer = document.createElement('li');
  userDropdownContainer.className = 'nav-item dropdown user-dropdown';
  
  if (user) {
    // User is logged in - show user dropdown with logout
    if (signInBtn) {
      // Create dropdown toggle
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
      
      // Replace sign in button with user dropdown
      signInBtn.parentNode.replaceWith(userDropdownContainer);
      
      // Add logout functionality
      document.getElementById('logoutBtn').addEventListener('click', async function(e) {
        e.preventDefault();
        await logout();
      });
    }
  } else {
    // User is not logged in - ensure sign in button is visible
    if (!signInBtn) {
      // If sign in button doesn't exist but should, we could add it here
      const navbarNav = document.querySelector('.navbar-nav');
      if (navbarNav) {
        const signInItem = document.createElement('li');
        signInItem.className = 'nav-item';
        signInItem.innerHTML = `
          <a href="login.html" class="btn-signin btn-3d">
            Sign In
            <div class="stars"></div>
            <div class="sparkle-1"></div>
            <div class="sparkle-2"></div>
            <div class="sparkle-3"></div>
          </a>
        `;
        navbarNav.appendChild(signInItem);
      }
    }
  }
});

// Logout function
async function logout() {
  try {
    const response = await fetch('/api/logout');
    
    if (response.ok) {
      // Clear user data from localStorage
      localStorage.removeItem('user');
      
      // Redirect to home page
      window.location.href = 'index.html';
    } else {
      console.error('Logout failed');
    }
  } catch (error) {
    console.error('Error during logout:', error);
  }
}
