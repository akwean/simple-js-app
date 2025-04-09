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
                    dayElement.addEventListener('click', () => {
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
            await this.fetchDisabledSlots();
            this.renderTimeSlots();
        },

        fetchDisabledSlots: async function() {
            try {
                const response = await fetch('/api/time-slots'); // Replace with your API endpoint
                const timeSlots = await response.json();

                // Filter unavailable slots
                this.disabledSlots = timeSlots
                    .filter(slot => !slot.is_available)
                    .map(slot => {
                        const time = new Date(`1970-01-01T${slot.appointment_time}Z`).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                        });
                        return time;
                    });
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
        },
        
        setupEventListeners: function() {
            // Confirm appointment button
            document.getElementById('confirmBtn').addEventListener('click', () => {
                this.completeBooking();
            });
        },
        
        completeBooking: function() {
            // Example of fixing the query
            const query = `
                INSERT INTO Appointments (user_id, service_id, appointment_date, appointment_time, status)
                VALUES (1, (SELECT service_id FROM Services WHERE service_name = 'Physical Examination'), '2025-04-09', '08:00:00', 'pending')
            `;

            // In a real application, this would send data to a server
            // For now, we'll simulate success
            
            // Generate a random confirmation code
            const confirmationCode = 'BUPC-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
            document.getElementById('confirmationCode').textContent = confirmationCode;
            
            // Copy confirmation details to success screen
            if (bookingState.selectedDate) {
                const dateText = bookingState.selectedDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                });
                document.getElementById('successDate').textContent = dateText;
            }
            
            if (bookingState.selectedTime) {
                document.getElementById('successTime').textContent = bookingState.selectedTime;
            }
            
            if (bookingState.selectedService) {
                document.getElementById('successService').textContent = bookingState.selectedService;
            }
            
            // Hide all steps
            document.querySelectorAll('.booking-step').forEach(el => {
                el.style.display = 'none';
            });
            
            // Show success message
            document.getElementById('successMessage').style.display = 'block';
            
            // Add animation class
            document.getElementById('successMessage').classList.add('animated');
            
            // Update progress indicator to 100%
            document.getElementById('progressIndicator').style.width = '100%';
            
            // Set all steps as completed
            document.querySelectorAll('.step').forEach(el => {
                el.classList.remove('active');
                el.classList.add('completed');
            });
        }
    };
    
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
        document.getElementById('dateNextBtn').addEventListener('click', () => {
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
    
    // Initialize the booking flow
    initBookingFlow();
});