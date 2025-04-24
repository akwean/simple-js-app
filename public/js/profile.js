document.addEventListener('DOMContentLoaded', function() {
    // Get form elements
    const profileForm = document.getElementById('profileForm');
    const formSections = document.querySelectorAll('.form-section');
    const progressSteps = document.querySelectorAll('.progress-step');
    const nextButtons = document.querySelectorAll('.next-btn');
    const prevButtons = document.querySelectorAll('.prev-btn');
    const hasInsuranceCheckbox = document.getElementById('hasInsurance');
    const insuranceDetailsSection = document.getElementById('insuranceDetails');
    
    // Toggle insurance details based on checkbox
    hasInsuranceCheckbox.addEventListener('change', function() {
        insuranceDetailsSection.classList.toggle('d-none', !this.checked);
    });
    
    // Handle next button clicks
    nextButtons.forEach(button => {
        button.addEventListener('click', function() {
            const currentSection = parseInt(this.getAttribute('data-next')) - 1;
            const nextSection = parseInt(this.getAttribute('data-next'));
            
            // Validate current section before proceeding
            if (validateSection(currentSection)) {
                // Hide current section and show next
                formSections.forEach(section => {
                    section.classList.remove('active');
                });
                
                document.querySelector(`.form-section[data-section="${nextSection}"]`).classList.add('active');
                
                // Update progress steps
                progressSteps.forEach(step => {
                    step.classList.remove('active');
                });
                
                progressSteps[nextSection - 1].classList.add('active');
                progressSteps[currentSection - 1].classList.add('completed');
            }
        });
    });
    
    // Handle previous button clicks
    prevButtons.forEach(button => {
        button.addEventListener('click', function() {
            const prevSection = parseInt(this.getAttribute('data-prev'));
            
            // Hide current section and show previous
            formSections.forEach(section => {
                section.classList.remove('active');
            });
            
            document.querySelector(`.form-section[data-section="${prevSection}"]`).classList.add('active');
            
            // Update progress steps
            progressSteps.forEach(step => {
                step.classList.remove('active');
            });
            
            progressSteps[prevSection - 1].classList.add('active');
        });
    });
    
    // Validate form sections
    function validateSection(sectionIndex) {
        const section = document.querySelector(`.form-section[data-section="${sectionIndex}"]`);
        const requiredFields = section.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                isValid = false;
                field.classList.add('is-invalid');
                
                // Add event listener to remove invalid styling when user types
                field.addEventListener('input', function() {
                    this.classList.remove('is-invalid');
                }, { once: true });
            } else {
                field.classList.remove('is-invalid');
            }
        });
        
        if (!isValid) {
            showAlert('Please fill in all required fields.', 'error');
        }
        
        return isValid;
    }
    
    // Handle form submission
    profileForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Validate final section
        if (!validateSection(3)) {
            return;
        }
        
        // Disable submit button and show loading state
        const submitBtn = document.querySelector('.submit-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
        
        // Collect form data
        const formData = {
            dateOfBirth: document.getElementById('dateOfBirth').value,
            gender: document.getElementById('gender').value,
            address: document.getElementById('address').value,
            city: document.getElementById('city').value,
            province: document.getElementById('province').value,
            postalCode: document.getElementById('postalCode').value,
            bloodType: document.getElementById('bloodType').value,
            height: document.getElementById('height').value,
            weight: document.getElementById('weight').value,
            allergies: document.getElementById('allergies').value,
            medicalConditions: document.getElementById('medicalConditions').value,
            hasInsurance: document.getElementById('hasInsurance').checked,
            insuranceProvider: document.getElementById('insuranceProvider').value,
            insurancePolicyNumber: document.getElementById('insurancePolicyNumber').value,
            emergencyContactName: document.getElementById('emergencyContactName').value,
            emergencyContactPhone: document.getElementById('emergencyContactPhone').value,
            emergencyContactRelationship: document.getElementById('emergencyContactRelationship').value,
            guardianName: document.getElementById('guardianName').value,
            guardianContact: document.getElementById('guardianContact').value,
            guardianRelationship: document.getElementById('guardianRelationship').value
        };
        
        try {
            // Submit profile data to server
            const response = await fetch('/api/profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                // Show success message
                showAlert('Profile completed successfully! Redirecting...', 'success');
                
                // Update user data in localStorage to reflect profile completion
                const userString = localStorage.getItem('user');
                if (userString) {
                    const user = JSON.parse(userString);
                    user.profileCompleted = true;
                    localStorage.setItem('user', JSON.stringify(user));
                }
                
                // Redirect to home page after short delay
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            } else {
                // Show error message
                showAlert(result.error || 'An error occurred. Please try again.', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Complete Profile';
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('An error occurred. Please try again.', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Complete Profile';
        }
    });
    
    // Function to show alerts
    function showAlert(message, type) {
        const alertContainer = document.getElementById('alert-container');
        
        // Create alert element
        const alert = document.createElement('div');
        alert.className = `alert alert-${type === 'error' ? 'danger' : 'success'}`;
        alert.textContent = message;
        
        // Clear previous alerts
        alertContainer.innerHTML = '';
        
        // Add new alert
        alertContainer.appendChild(alert);
        
        // Scroll to alert
        alertContainer.scrollIntoView({ behavior: 'smooth' });
        
        // Remove alert after 5 seconds
        setTimeout(() => {
            alert.remove();
        }, 5000);
    }
});
