// Function to show alert messages
function showAlert(message, type) {
  const alertBox = document.createElement('div');
  alertBox.className = `alert ${type}`;
  alertBox.textContent = message;
  document.body.appendChild(alertBox);
  setTimeout(() => {
    alertBox.remove();
  }, 3000);
}

// Registration form logic
const registerForm = document.getElementById('registerForm');
const registerButton = document.getElementById('registerButton');

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  registerButton.disabled = true;
  registerButton.textContent = 'Registering...';

  const formData = {
    first_name: document.getElementById('firstName').value,
    last_name: document.getElementById('lastName').value,
    email: document.getElementById('email').value,
    password: document.getElementById('password').value
  };

  // Add logic after successful registration to redirect to profile
  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      // Show success message
      showAlert('Registration successful! Please complete your profile.', 'success');
      
      // Store basic user info in localStorage
      localStorage.setItem('user', JSON.stringify({
        id: result.user_id,
        name: `${result.first_name} ${result.last_name}`,
        email: result.email,
        userType: 'student', // Default user type is student
        profileCompleted: false // New users need to complete profile
      }));
      
      // Redirect to profile page
      setTimeout(() => {
        window.location.href = 'profile.html';
      }, 1500);
    } else {
      // Show error message
      showAlert(result.error || 'Registration failed. Please try again.', 'error');
      registerButton.disabled = false;
      registerButton.textContent = 'Register';
    }
  } catch (error) {
    console.error('Error:', error);
    showAlert('An error occurred. Please try again later.', 'error');
    registerButton.disabled = false;
    registerButton.textContent = 'Register';
  }
});