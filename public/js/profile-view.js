document.addEventListener('DOMContentLoaded', async function() {
  // Fetch and populate profile data
  async function fetchProfile() {
    try {
      // Fetch profile data for the logged-in user
      const res = await fetch('/api/profile');
      if (!res.ok) {
        const text = await res.text();
        console.error('Profile fetch failed:', res.status, text);
        if (res.status === 404) {
          showAlert('No profile found. Please complete your profile.', 'warning');
          return;
        }
        throw new Error('Failed to fetch profile');
      }

      const profile = await res.json();

      // Fill form fields
      document.getElementById('date_of_birth').value = profile.date_of_birth ? profile.date_of_birth.substring(0, 10) : '';
      document.getElementById('gender').value = profile.gender || '';
      document.getElementById('address').value = profile.address || '';
      document.getElementById('city').value = profile.city || '';
      document.getElementById('province').value = profile.province || '';
      document.getElementById('postal_code').value = profile.postal_code || '';
      document.getElementById('blood_type').value = profile.blood_type || '';
      document.getElementById('height').value = profile.height || '';
      document.getElementById('weight').value = profile.weight || '';
      document.getElementById('known_allergies').value = profile.known_allergies || '';
      document.getElementById('medical_conditions').value = profile.medical_conditions || '';
      document.getElementById('emergency_contact_name').value = profile.emergency_contact_name || '';
      document.getElementById('emergency_contact_phone').value = profile.emergency_contact_phone || '';
      document.getElementById('emergency_contact_relationship').value = profile.emergency_contact_relationship || '';
      document.getElementById('guardian_name').value = profile.guardian_name || '';
      document.getElementById('guardian_contact').value = profile.guardian_contact || '';
      document.getElementById('guardian_relationship').value = profile.guardian_relationship || '';
    } catch (err) {
      showAlert('Failed to load profile: ' + err.message, 'error');
    }
  }

  // Show alert
  function showAlert(message, type) {
    const alertContainer = document.getElementById('alert-container');
    alertContainer.innerHTML = `<div class="alert alert-${type === 'error' ? 'danger' : type}">${message}</div>`;
  }

  // Handle form submit
  document.getElementById('profileViewForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = document.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Updating...';

    const data = {
      dateOfBirth: document.getElementById('date_of_birth').value,
      gender: document.getElementById('gender').value,
      address: document.getElementById('address').value,
      city: document.getElementById('city').value,
      province: document.getElementById('province').value,
      postalCode: document.getElementById('postal_code').value,
      bloodType: document.getElementById('blood_type').value,
      height: document.getElementById('height').value,
      weight: document.getElementById('weight').value,
      allergies: document.getElementById('known_allergies').value,
      medicalConditions: document.getElementById('medical_conditions').value,
      emergencyContactName: document.getElementById('emergency_contact_name').value,
      emergencyContactPhone: document.getElementById('emergency_contact_phone').value,
      emergencyContactRelationship: document.getElementById('emergency_contact_relationship').value,
      guardianName: document.getElementById('guardian_name').value,
      guardianContact: document.getElementById('guardian_contact').value,
      guardianRelationship: document.getElementById('guardian_relationship').value
    };

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (res.ok) {
        showAlert('Profile updated successfully!', 'success');
      } else {
        showAlert(result.error || 'Failed to update profile', 'error');
      }
    } catch (err) {
      showAlert('Failed to update profile: ' + err.message, 'error');
    }
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save me-2"></i>Update Profile';
  });

  // Normalize touchpad scrolling behavior
  document.addEventListener('wheel', (event) => {
    const isTouchpad = Math.abs(event.deltaY) < 50; // Detect touchpad
    if (isTouchpad) {
      event.preventDefault();
      window.scrollBy({
        top: event.deltaY,
        behavior: 'smooth',
      });
    }
  });

  // Prevent unintended scroll behavior
  const profileContainer = document.querySelector('.profile-card');
  if (profileContainer) {
    profileContainer.addEventListener('wheel', (event) => {
      if (event.deltaY < 0 && profileContainer.scrollTop === 0) {
        event.preventDefault(); // Prevent scrolling up when at the top
      }
      if (event.deltaY > 0 && profileContainer.scrollTop + profileContainer.clientHeight >= profileContainer.scrollHeight) {
        event.preventDefault(); // Prevent scrolling down when at the bottom
      }
    });
  }

  fetchProfile();
});
