// Auth utility functions

// Intercept fetch responses to handle authentication errors
const originalFetch = window.fetch;
window.fetch = async function(...args) {
    const response = await originalFetch(...args);
    
    // If it's an API request and returns 401 Unauthorized
    if (response.status === 401 && args[0].toString().includes('/api/')) {
        console.log('Authentication required. Redirecting to login page.');
        
        // Save the current URL to redirect back after login
        const currentPage = window.location.pathname + window.location.search;
        if (currentPage !== '/login.html') {
            sessionStorage.setItem('loginRedirect', currentPage);
        }
        
        // Redirect to login page
        window.location.href = '/login.html';
    }
    
    return response;
};

// Check if user is logged in
async function checkAuth() {
  try {
    const response = await fetch('/api/user/me');
    
    if (!response.ok) {
      // If not authenticated, redirect to login
      window.location.href = '/login.html';
      return null;
    }
    
    // Get user data from session
    const userData = await response.json();
    return userData;
    
  } catch (error) {
    console.error('Auth check error:', error);
    window.location.href = '/login.html';
    return null;
  }
}

// Check if user is staff
async function checkStaffAuth() {
  const user = await checkAuth();
  
  if (!user) {
    return false;
  }
  
  if (user.user_type !== 'staff') {
    // If not staff, redirect to home
    window.location.href = '/index.html';
    return false;
  }
  
  return true;
}

// Logout function
async function logout() {
  try {
    await fetch('/api/logout');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
  } catch (error) {
    console.error('Logout error:', error);
  }
}

// Update UI based on authentication state
function updateAuthUI() {
  const user = JSON.parse(localStorage.getItem('user'));
  const logoutBtn = document.getElementById('logoutBtn');
  const loginBtn = document.querySelector('.btn-signin');
  const userInfo = document.getElementById('userInfo');
  
  if (user) {
    // User is logged in
    if (loginBtn) {
      loginBtn.style.display = 'none';
    }
    
    if (userInfo) {
      userInfo.style.display = 'flex';
      userInfo.querySelector('.user-name').textContent = user.name;
    }
    
    if (logoutBtn) {
      logoutBtn.style.display = 'block';
      logoutBtn.addEventListener('click', logout);
    }
  } else {
    // User is not logged in
    if (loginBtn) {
      loginBtn.style.display = 'flex';
    }
    
    if (userInfo) {
      userInfo.style.display = 'none';
    }
    
    if (logoutBtn) {
      logoutBtn.style.display = 'none';
    }
  }
}

// Function to check if user is logged in before booking
function checkAuthForBooking() {
  // Check session storage first
  const pendingAppointment = localStorage.getItem('pendingAppointment');
  
  // If there's a pending appointment, the user just logged in to complete it
  if (pendingAppointment && window.location.pathname.includes('appointments.html')) {
    // Wait a moment for page to load
    setTimeout(() => {
      try {
        // Parse the saved appointment data
        const appointmentData = JSON.parse(pendingAppointment);
        
        // Restore appointment form with saved data
        restoreAppointmentData(appointmentData);
        
        // Clear the pending appointment
        localStorage.removeItem('pendingAppointment');
        
        // Show message to user
        showAlert('Your appointment details have been restored. Please confirm to continue.', 'success');
      } catch (error) {
        console.error('Error restoring appointment data:', error);
      }
    }, 1000);
  }
}

// Function to restore appointment data to form
function restoreAppointmentData(data) {
  // This would need to be customized based on your appointment form structure
  if (data.date) {
    // Set date
    const dateObj = new Date(data.date);
    // Your code to select this date in the calendar
  }
  
  if (data.time) {
    // Set time
    // Your code to select this time slot
  }
  
  if (data.service) {
    // Set service
    // Your code to select this service
  }
  
  if (data.notes) {
    // Set notes
    const notesField = document.getElementById('additionalNotes');
    if (notesField) notesField.value = data.notes;
  }
  
  // Jump to the confirmation step
  // Your code to navigate to the confirmation step
}

// Call this when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  updateAuthUI();
  
  if (window.location.pathname.includes('appointments.html')) {
    checkAuthForBooking();
  }
});
