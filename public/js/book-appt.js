// Appointment Booking JS
document.addEventListener('DOMContentLoaded', function() {
    // ----- State Management -----
    const bookingState = {
        currentStep: 1,
        selectedDate: null,
        selectedTime: null,
        selectedService: null,
        additionalNotes: '',
        
        // Update the state and UI based on the current step
        updateStep: function(step) {
            if (step < 1 || step > 4) return;
            
            // Hide all steps
            document.querySelectorAll('.booking-step').forEach(el => {
                el.style.display = 'none';
            });
            
            // Show current step
            document.getElementById(`step${step}`).style.display = 'block';
            
            // Update progress indicator
            document.getElementById('progressIndicator').style.width = `${step * 25}%`;
            
            // Update step indicators
            document.querySelectorAll('.step').forEach(el => {
                const stepNum = parseInt(el.dataset.step);
                el.classList.remove('active', 'completed');
                
                if (stepNum === step) {
                    el.classList.add('active');
                } else if (stepNum < step) {
                    el.classList.add('completed');
                }
            });
            
            // Update current step
            this.currentStep = step;
            
            // Scroll to top of booking container
            const bookingContainer = document.querySelector('.booking-container');
            if (bookingContainer) {
                bookingContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    };
    
    // ----- Calendar Implementation -----
    const calendar = {
        currentDate: new Date(),
        selectedDate: null,
        
        initialize: function() {
            this.updateCalendarHeader();
            this.renderCalendar();
            this.setupEventListeners();
        },
        
        updateCalendarHeader: function() {
            const monthYearText = this.currentDate.toLocaleString('default', { 
                month: 'long', 
                year: 'numeric' 
            });
            document.getElementById('currentMonth').textContent = monthYearText;
        },
        
        renderCalendar: function() {
            const calendarDays = document.getElementById('calendarDays');
            calendarDays.innerHTML = '';
            
            const year = this.currentDate.getFullYear();
            const month = this.currentDate.getMonth();
            
            // First day of the month
            const firstDay = new Date(year, month, 1);
            // Last day of the month
            const lastDay = new Date(year, month + 1, 0);
            
            // Days from previous month to show
            const daysFromPrevMonth = firstDay.getDay();
            // Total days to show (42 to ensure 6 rows)
            const totalDaysToShow = 42;
            
            // Get current date for "today" highlighting
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Get days from previous month
            const prevMonth = new Date(year, month, 0);
            const prevMonthDays = prevMonth.getDate();
            
            // Create array of day objects
            const days = [];
            
            // Previous month days
            for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
                days.push({
                    day: prevMonthDays - i,
                    month: month - 1,
                    year: year,
                    isCurrentMonth: false,
                    isPast: new Date(year, month - 1, prevMonthDays - i) < today,
                    isToday: false
                });
            }
            
            // Current month days
            for (let i = 1; i <= lastDay.getDate(); i++) {
                const date = new Date(year, month, i);
                date.setHours(0, 0, 0, 0);
                
                days.push({
                    day: i,
                    month: month,
                    year: year,
                    isCurrentMonth: true,
                    isPast: date < today,
                    isToday: date.getTime() === today.getTime()
                });
            }
            
            // Next month days
            let nextMonthDays = totalDaysToShow - days.length;
            for (let i = 1; i <= nextMonthDays; i++) {
                days.push({
                    day: i,
                    month: month + 1,
                    year: year,
                    isCurrentMonth: false,
                    isPast: false,
                    isToday: false
                });
            }
            
            // Render days
            days.forEach(day => {
                const dayElement = document.createElement('div');
                dayElement.className = 'calendar-day';
                dayElement.textContent = day.day;
                
                // Apply classes
                if (!day.isCurrentMonth) {
                    dayElement.classList.add('outside-month');
                }
                
                if (day.isPast) {
                    dayElement.classList.add('disabled');
                }
                
                if (day.isToday) {
                    dayElement.classList.add('today');
                    // Also mark today as unavailable for appointments
                    if (!day.isPast) { // This check is redundant but kept for clarity
                        dayElement.classList.add('unavailable-today');
                        
                        // Add tooltip element to show unavailable message
                        const tooltipElement = document.createElement('span');
                        tooltipElement.className = 'today-tooltip';
                        tooltipElement.textContent = 'Same-day appointments not available';
                        dayElement.appendChild(tooltipElement);
                    }
                }
                
                // Check if this day is the selected date
                if (this.selectedDate) {
                    const selectedDateObj = new Date(this.selectedDate);
                    
                    if (day.day === selectedDateObj.getDate() && 
                        day.month === selectedDateObj.getMonth() && 
                        day.year === selectedDateObj.getFullYear()) {
                        dayElement.classList.add('selected');
                    }
                }
                
                // Add click event for date selection
                if (!day.isPast && !day.isToday) { // Don't allow today to be selected
                    dayElement.addEventListener('click', async () => {
                        // Remove selected class from all days
                        document.querySelectorAll('.calendar-day').forEach(el => {
                            el.classList.remove('selected');
                        });
                        
                        // Add selected class to clicked day
                        dayElement.classList.add('selected');
                        
                        // Set selected date
                        this.selectedDate = new Date(day.year, day.month, day.day);
                        
                        // Update booking state
                        bookingState.selectedDate = this.selectedDate;
                        
                        // Update selected date text
                        const dateText = this.selectedDate.toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            month: 'long', 
                            day: 'numeric', 
                            year: 'numeric' 
                        });
                        document.getElementById('selectedDateText').textContent = dateText;
                        
                        // Enable next button
                        document.getElementById('dateNextBtn').disabled = false;
                        
                        // Fetch time slots for the selected date
                        await timeSlots.fetchDisabledSlots();
                        timeSlots.renderTimeSlots();
                    });
                }
                
                calendarDays.appendChild(dayElement);
            });
        },
        
        setupEventListeners: function() {
            // Previous month button
            document.getElementById('prevMonth').addEventListener('click', () => {
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                this.updateCalendarHeader();
                this.renderCalendar();
            });
            
            // Next month button
            document.getElementById('nextMonth').addEventListener('click', () => {
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                this.updateCalendarHeader();
                this.renderCalendar();
            });
        }
    };
    
    // ----- Time Slots Implementation -----
    const timeSlots = {
        morningSlots: ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM'],
        afternoonSlots: ['1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'],
        disabledSlots: [], // Dynamically fetched disabled slots
        selectedSlot: null,

        initialize: async function() {
            // Only fetch disabled slots if a date is selected
            if (bookingState.selectedDate) {
                await this.fetchDisabledSlots();
            }
            this.renderTimeSlots();
        },

        fetchDisabledSlots: async function() {
            try {
                // Safety check to ensure selectedDate exists
                if (!bookingState.selectedDate) {
                    console.log('No date selected yet, skipping time slot check');
                    return;
                }
                
                // Format date as YYYY-MM-DD with proper timezone handling
                const year = bookingState.selectedDate.getFullYear();
                const month = (bookingState.selectedDate.getMonth() + 1).toString().padStart(2, '0');
                const day = bookingState.selectedDate.getDate().toString().padStart(2, '0');
                const formattedDate = `${year}-${month}-${day}`;
                
                console.log('Fetching time slots for date:', formattedDate);
                
                const response = await fetch(`/api/time-slots?date=${formattedDate}`);
                const data = await response.json();
                console.log('Time slots response:', data);

                // Use available slots instead of disabled slots
                const availableSlots = data.availableSlots || [];

                // Mark unavailable slots
                this.disabledSlots = [
                    ...this.morningSlots,
                    ...this.afternoonSlots
                ].filter(slot => !availableSlots.includes(slot));
                
                console.log('Disabled slots:', this.disabledSlots);
            } catch (error) {
                console.error('Error fetching time slots:', error);
            }
        },

        renderTimeSlots: function() {
            // Render morning slots
            const morningContainer = document.getElementById('morningSlots');
            morningContainer.innerHTML = '';

            this.morningSlots.forEach(slot => {
                const isDisabled = this.disabledSlots.includes(slot);
                const timeSlotElement = this.createTimeSlotElement(slot, isDisabled);
                morningContainer.appendChild(timeSlotElement);
            });

            // Render afternoon slots
            const afternoonContainer = document.getElementById('afternoonSlots');
            afternoonContainer.innerHTML = '';

            this.afternoonSlots.forEach(slot => {
                const isDisabled = this.disabledSlots.includes(slot);
                const timeSlotElement = this.createTimeSlotElement(slot, isDisabled);
                afternoonContainer.appendChild(timeSlotElement);
            });
        },

        createTimeSlotElement: function(time, isDisabled) {
            const slotElement = document.createElement('div');
            slotElement.className = 'time-slot';
            slotElement.textContent = time;

            if (isDisabled) {
                slotElement.classList.add('disabled');
                slotElement.style.textDecoration = 'line-through'; // Add strikethrough for disabled slots
            } else {
                slotElement.addEventListener('click', () => {
                    // Remove selected class from all slots
                    document.querySelectorAll('.time-slot').forEach(el => {
                        el.classList.remove('selected');
                    });

                    // Add selected class to clicked slot
                    slotElement.classList.add('selected');

                    // Set selected time
                    this.selectedSlot = time;

                    // Update booking state
                    bookingState.selectedTime = time;

                    // Update selected time text
                    document.getElementById('selectedTimeText').textContent = time;

                    // Enable next button
                    document.getElementById('timeNextBtn').disabled = false;
                });
            }

            return slotElement;
        }
    };
    
    // ----- Service Selection Implementation -----
    const serviceSelection = {
        selectedService: null,
        
        initialize: function() {
            this.setupEventListeners();
        },
        
        setupEventListeners: function() {
            // Add click event to service cards
            document.querySelectorAll('.service-card').forEach(card => {
                card.addEventListener('click', () => {
                    // Remove selected class from all cards
                    document.querySelectorAll('.service-card').forEach(el => {
                        el.classList.remove('selected');
                    });
                    
                    // Add selected class to clicked card
                    card.classList.add('selected');
                    
                    // Set selected service
                    this.selectedService = card.dataset.service;
                    
                    // Update booking state
                    bookingState.selectedService = this.getServiceNameFromType(this.selectedService);
                    
                    // Enable next button
                    document.getElementById('serviceNextBtn').disabled = false;
                });
            });
            
            // Additional notes textarea
            document.getElementById('additionalNotes').addEventListener('input', (e) => {
                bookingState.additionalNotes = e.target.value.trim();
            });
        },
        
        getServiceNameFromType: function(type) {
            const serviceMap = {
                'medical': 'Medical Consultation & Treatment',
                'physical': 'Physical Examination',
                'dental': 'Dental Consultation & Treatment',
                'vaccination': 'Vaccination'
            };
            
            return serviceMap[type] || 'Unknown Service';
        }
    };
    
    // ----- Confirmation Implementation -----
    const confirmation = {
        initialize: function() {
            this.setupEventListeners();
        },
        
        updateConfirmationDetails: function() {
            // Set date
            if (bookingState.selectedDate) {
                const dateText = bookingState.selectedDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                });
                document.getElementById('confirmDate').textContent = dateText;
            }
            
            // Set time
            if (bookingState.selectedTime) {
                document.getElementById('confirmTime').textContent = bookingState.selectedTime;
            }
            
            // Set service
            if (bookingState.selectedService) {
                document.getElementById('confirmService').textContent = bookingState.selectedService;
            }
            
            // Set notes or hide notes row if empty
            if (bookingState.additionalNotes) {
                document.getElementById('confirmNotes').textContent = bookingState.additionalNotes;
                document.getElementById('notesRow').style.display = 'flex';
            } else {
                document.getElementById('notesRow').style.display = 'none';
            }

            // Check if user is logged in before allowing confirmation
            const userString = localStorage.getItem('user');
            if (!userString) {
                // If not logged in, disable the confirm button
                const confirmBtn = document.getElementById('confirmBtn');
                if (confirmBtn) {
                    confirmBtn.disabled = true;
                    confirmBtn.title = "Please log in to book an appointment";
                    
                    // Add a warning message
                    const warningMsg = document.createElement('div');
                    warningMsg.className = 'login-warning';
                    warningMsg.innerHTML = '<i class="fas fa-exclamation-triangle"></i> You must be logged in to book an appointment.';
                    
                    // Insert after the confirmation details
                    const confirmDetails = document.querySelector('.confirmation-details');
                    if (confirmDetails && !document.querySelector('.login-warning')) {
                        confirmDetails.parentNode.insertBefore(warningMsg, confirmDetails.nextSibling);
                    }
                }
            } else {
                // If logged in, ensure the button is enabled
                const confirmBtn = document.getElementById('confirmBtn');
                if (confirmBtn) {
                    confirmBtn.disabled = false;
                    confirmBtn.title = "";
                }
                
                // Remove any warning message
                const warningMsg = document.querySelector('.login-warning');
                if (warningMsg) {
                    warningMsg.remove();
                }
            }
        },
        
        setupEventListeners: function() {
            // Confirm appointment button
            const confirmBtn = document.getElementById('confirmBtn');
            
            // Track if we're currently submitting to prevent double submission
            let isSubmitting = false;
            
            confirmBtn.addEventListener('click', async function() {
                // Prevent double submission
                if (isSubmitting) {
                    console.log('Submission already in progress, preventing duplicate');
                    return;
                }
                
                try {
                    // Set submitting state and disable button
                    isSubmitting = true;
                    confirmBtn.disabled = true;
                    confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Booking...';
                    
                    // Get the selected date as a properly formatted string
                    const selectedDate = bookingState.selectedDate;
                    if (!selectedDate) {
                        isSubmitting = false;
                        confirmBtn.disabled = false;
                        confirmBtn.textContent = 'Confirm Appointment';
                        return;
                    }
                    
                    // Use the date object directly from bookingState to build the data
                    const appointmentData = {
                        date: document.getElementById('confirmDate').textContent,
                        time: document.getElementById('confirmTime').textContent,
                        service: document.getElementById('confirmService').textContent,
                        notes: document.getElementById('confirmNotes').textContent || null
                    };
                    
                    console.log('Submitting appointment:', appointmentData);
                    
                    await submitAppointment(appointmentData);
                } catch (error) {
                    console.error('Error booking appointment:', error);
                    
                    // Show a more user-friendly error message
                    const errorMessage = document.createElement('div');
                    errorMessage.className = 'alert alert-danger';
                    errorMessage.innerHTML = `
                        <strong>Booking failed:</strong> ${error.message || 'Unknown error'}
                    `;
                    
                    // Insert the error message at the top of the confirmation step
                    const confirmStep = document.getElementById('step4');
                    
                    // Remove any existing error messages
                    const existingError = confirmStep.querySelector('.alert');
                    if (existingError) {
                        confirmStep.removeChild(existingError);
                    }
                    
                    confirmStep.insertBefore(errorMessage, confirmStep.firstChild);
                } finally {
                    // Always reset submitting state and button
                    isSubmitting = false;
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = 'Confirm Appointment';
                }
            });
        }
    };

    // Enhance the submit appointment function
    async function submitAppointment(appointmentData) {
        try {
            // Get the currently logged in user
            const userString = localStorage.getItem('user');
            if (!userString) {
                showAuthError('You must be logged in to book an appointment.', '/login.html?redirect=appointments.html');
                return;
            }
            
            const user = JSON.parse(userString);
            
            // Disable the button and show loading state
            const confirmBtn = document.getElementById('confirmBtn');
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Booking...';
            
            // Add the user ID from the logged-in user
            appointmentData.userId = user.id;
            
            // Submit to the server
            const response = await fetch('/api/appointments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(appointmentData)
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                // Handle auth error
                if (response.status === 401) {
                    showAuthError(result.message || 'Your session has expired. Please log in again.', '/login.html?redirect=appointments.html');
                    // Save appointment data for later
                    localStorage.setItem('pendingAppointment', JSON.stringify(appointmentData));
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = 'Confirm Appointment';
                    return;
                }
                
                // For other errors
                showAlert(result.error || 'Booking failed', 'error');
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Confirm Appointment';
                return;
            }
            
            // Success handling continues as before
            document.getElementById('confirmationCode').textContent = result.confirmationCode;
            
            // Display the appointment details
            document.getElementById('successDate').textContent = appointmentData.date;
            document.getElementById('successTime').textContent = appointmentData.time;
            document.getElementById('successService').textContent = appointmentData.service;
            
            // Hide all booking steps and show success message
            document.querySelectorAll('.booking-step').forEach(el => {
                el.style.display = 'none';
            });
            document.getElementById('successMessage').style.display = 'block';
            document.getElementById('successMessage').classList.add('animated');
            document.getElementById('progressIndicator').style.width = '100%';
            
            // Set all steps as completed
            document.querySelectorAll('.step').forEach(el => {
                el.classList.remove('active');
                el.classList.add('completed');
            });
        } catch (error) {
            console.error('Error:', error);
            // Show a more user-friendly error message
            const errorMessage = document.createElement('div');
            errorMessage.className = 'alert alert-danger';
            errorMessage.innerHTML = `
                <strong>Booking failed:</strong> ${error.message || 'Unknown error'}
            `;
            
            // Insert the error message at the top of the confirmation step
            const confirmStep = document.getElementById('step4');
            
            // Remove any existing error messages
            const existingError = confirmStep.querySelector('.alert');
            if (existingError) {
                confirmStep.removeChild(existingError);
            }
            
            confirmStep.insertBefore(errorMessage, confirmStep.firstChild);
        } finally {
            // Always reset submitting state and button
            const confirmBtn = document.getElementById('confirmBtn');
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Confirm Appointment';
        }
    }

    // Function to show authentication error with login option
    function showAuthError(message, loginUrl) {
        const overlay = document.createElement('div');
        overlay.className = 'auth-error-overlay';
        
        const dialog = document.createElement('div');
        dialog.className = 'auth-error-dialog';
        
        dialog.innerHTML = `
            <div class="auth-error-header">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Authentication Required</h3>
            </div>
            <div class="auth-error-body">
                <p>${message}</p>
                <p>Please log in to continue with your appointment booking.</p>
            </div>
            <div class="auth-error-footer">
                <button id="auth-error-cancel" class="btn-secondary">Cancel</button>
                <a href="${loginUrl}" class="btn-primary">Log in now</a>
            </div>
        `;
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // Handle cancel button
        document.getElementById('auth-error-cancel').addEventListener('click', function() {
            document.body.removeChild(overlay);
        });
    }
    
    // ----- Initialize Booking Flow -----
    function initBookingFlow() {
        // Initialize components
        calendar.initialize();
        timeSlots.initialize();
        serviceSelection.initialize();
        confirmation.initialize();
        
        // Setup navigation buttons
        setupNavigationButtons();
        
        // Start at step 1
        bookingState.updateStep(1);
    }
    
    function setupNavigationButtons() {
        // Step 1 to Step 2 (Date to Time)
        document.getElementById('dateNextBtn').addEventListener('click', async () => {
            // Ensure time slots are fetched for the selected date before moving to the time selection step
            if (bookingState.selectedDate) {
                await timeSlots.fetchDisabledSlots();
                timeSlots.renderTimeSlots();
            }
            bookingState.updateStep(2);
        });
        
        // Step 2 to Step 1 (Time to Date)
        document.getElementById('timeBackBtn').addEventListener('click', () => {
            bookingState.updateStep(1);
        });
        
        // Step 2 to Step 3 (Time to Service)
        document.getElementById('timeNextBtn').addEventListener('click', () => {
            bookingState.updateStep(3);
        });
        
        // Step 3 to Step 2 (Service to Time)
        document.getElementById('serviceBackBtn').addEventListener('click', () => {
            bookingState.updateStep(2);
        });
        
        // Step 3 to Step 4 (Service to Confirmation)
        document.getElementById('serviceNextBtn').addEventListener('click', () => {
            confirmation.updateConfirmationDetails();
            bookingState.updateStep(4);
        });
        
        // Step 4 to Step 3 (Confirmation to Service)
        document.getElementById('confirmBackBtn').addEventListener('click', () => {
            bookingState.updateStep(3);
        });
        
        // Add to Calendar button
        document.querySelector('.btn-calendar').addEventListener('click', function() {
            // In a real app, this would create a calendar event
            alert('Calendar event would be created here. Feature coming soon!');
        });
    }

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
    const bookingContainer = document.querySelector('.booking-container');
    if (bookingContainer) {
        bookingContainer.addEventListener('wheel', (event) => {
            if (event.deltaY < 0 && bookingContainer.scrollTop === 0) {
                event.preventDefault(); // Prevent scrolling up when at the top
            }
            if (event.deltaY > 0 && bookingContainer.scrollTop + bookingContainer.clientHeight >= bookingContainer.scrollHeight) {
                event.preventDefault(); // Prevent scrolling down when at the bottom
            }
        });
    }
    
    // Initialize the booking flow
    initBookingFlow();
});