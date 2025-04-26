document.addEventListener('DOMContentLoaded', function() {

    const appointmentsPerPage = 6;
    const newAppointmentsContainer = document.getElementById('newAppointments');
    const upcomingAppointmentsContainer = document.getElementById('upcomingAppointments');
    const conflictAppointmentsContainer = document.getElementById('conflictAppointments');
    const allAppointmentsContainer = document.getElementById('allAppointmentsContainer');
    const allAppointmentsTable = document.getElementById('allAppointmentsTable');
    const allAppointmentsPagination = document.getElementById('allAppointmentsPagination');
    const toggleAllAppointmentsButton = document.getElementById('toggleAllAppointments');

    // Improved toggle functionality to ensure data is shown when expanded
    toggleAllAppointmentsButton.addEventListener('click', () => {
        const isHidden = allAppointmentsContainer.classList.contains('d-none');
        allAppointmentsContainer.classList.toggle('d-none', !isHidden);
        toggleAllAppointmentsButton.textContent = isHidden ? 'Collapse' : 'Expand';
        
        // If expanding the section, ensure appointments are rendered
        if (isHidden) {
            renderAllAppointments(1);
        }
    });

    // Add search and filter functionality for all appointments
    document.getElementById('searchAppointments').addEventListener('input', filterAppointments);
    document.getElementById('filterDate').addEventListener('change', filterAppointments);
    document.getElementById('filterStatus').addEventListener('change', filterAppointments);

    let allAppointments = []; // Store all appointments globally
    let filteredAppointments = []; // Store filtered appointments

    async function fetchAppointments() {
        try {
            const response = await fetch('/api/appointments');
            if (!response.ok) throw new Error('Failed to fetch appointments');
            allAppointments = await response.json(); // Store all appointments globally
            console.log('Fetched appointments:', allAppointments); // Debug
            return allAppointments;
        } catch (error) {
            console.error('Error fetching appointments:', error);
            return [];
        }
    }

    function filterAppointments() {
        const searchTerm = document.getElementById('searchAppointments').value.toLowerCase();
        const filterDate = document.getElementById('filterDate').value; // Date in YYYY-MM-DD format
        const filterStatus = document.getElementById('filterStatus').value.toLowerCase();

        // Filter the global dataset
        filteredAppointments = allAppointments.filter(appointment => {
            const patient = appointment.patient.toLowerCase();
            const status = appointment.status.toLowerCase();
            const appointmentDate = new Date(appointment.date);
            const formattedDate = new Date(appointmentDate.getTime() - appointmentDate.getTimezoneOffset() * 60000)
                .toISOString()
                .split('T')[0];

            const matchesSearch = !searchTerm || patient.includes(searchTerm);
            const matchesDate = !filterDate || formattedDate === filterDate;
            const matchesStatus = filterStatus === 'all' || status === filterStatus;

            return matchesSearch && matchesDate && matchesStatus;
        });

        renderAllAppointments(1); // Re-render starting from the first page
    }

    // Helper to get correct appointment id and user id for all appointment objects
    function getAppointmentId(appointment) {
        return appointment.id || appointment.appointment_id;
    }
    
    function getUserId(appointment) {
        // Ensure user_id is retrieved correctly
        return appointment.user_id || appointment.userId || null;
    }

    async function renderAllAppointments(page = 1) {
        allAppointmentsTable.innerHTML = '';
        if (!filteredAppointments || filteredAppointments.length === 0) {
            filteredAppointments = [...allAppointments];
        }
        const start = (page - 1) * appointmentsPerPage;
        const end = start + appointmentsPerPage;
        const paginatedAppointments = filteredAppointments.slice(start, end);

        if (paginatedAppointments.length === 0) {
            allAppointmentsTable.innerHTML = '<tr><td colspan="4" class="text-center">No appointments found</td></tr>';
            return;
        }

        paginatedAppointments.forEach(appointment => {
            const appointmentId = getAppointmentId(appointment);
            const userId = getUserId(appointment);
            
            console.log('Rendering appointment:', { appointmentId, userId, patient: appointment.patient }); // Debug
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                  <a href="#" class="patient-link" data-user-id="${userId}" data-appointment-id="${appointmentId}">
                    ${appointment.patient}
                  </a>
                </td>
                <td>${new Date(appointment.date).toLocaleDateString()}</td>
                <td>${appointment.time}</td>
                <td><span class="badge bg-${getStatusBadge(appointment.status)}">${appointment.status}</span></td>
            `;
            allAppointmentsTable.appendChild(row);
        });

        // Add click event for patient links
        allAppointmentsTable.querySelectorAll('.patient-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const userId = this.getAttribute('data-user-id');
                const appointmentId = this.getAttribute('data-appointment-id');
                
                console.log('Clicked patient link:', { userId, appointmentId }); // Debug
                
                if (userId && appointmentId) {
                    showPatientDetails(userId, appointmentId);
                } else {
                    alert('Missing user or appointment ID.');
                }
            });
        });

        const totalPages = Math.ceil(filteredAppointments.length / appointmentsPerPage);
        renderPagination(allAppointmentsPagination, totalPages, page, renderAllAppointments);
    }

    async function updateAppointmentStatus(id, action) {
        try {
            const response = await fetch(`/api/appointments/${id}/${action}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!response.ok) {
                throw new Error(`Failed to ${action} appointment`);
            }
            const result = await response.json();
            console.log(result.message);
        } catch (error) {
            console.error(`Error updating appointment status:`, error);
        }
    }

    // Updated categorizeAppointments to handle date formatting and time zone conversion
    function categorizeAppointments(appointments) {
        const today = new Date(); // Current date
        today.setHours(0, 0, 0, 0); // Normalize to start of the day
        const newAppointments = [];
        const upcomingAppointments = [];
        const conflicts = [];

        const appointmentMap = new Map();

        appointments.forEach(appt => {
            // Convert date and time to local Date object
            const apptDate = new Date(appt.date);
            const apptTime = appt.time.split(':');
            apptDate.setHours(apptTime[0], apptTime[1], apptTime[2]);

            const key = `${appt.date}-${appt.time}`;

            // Check for conflicts
            if (appointmentMap.has(key)) {
                const existingAppt = appointmentMap.get(key);
                if (appt.status === 'pending' || existingAppt.status === 'pending') {
                    conflicts.push(appt);
                    conflicts.push(existingAppt);
                }
            } else {
                appointmentMap.set(key, appt);
            }

            // Categorize appointments
            if (apptDate >= today && appt.status === 'pending') {
                newAppointments.push(appt);
            } else if (apptDate > today && appt.status === 'approved') {
                upcomingAppointments.push(appt);
            }
        });

        return { newAppointments, upcomingAppointments, conflicts: [...new Set(conflicts)] };
    }

    function renderAppointments(container, appointments, page = 1) {
        container.innerHTML = '';
        const start = (page - 1) * appointmentsPerPage;
        const end = start + appointmentsPerPage;
        const paginatedAppointments = appointments.slice(start, end);

        if (paginatedAppointments.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No new appointments found.</p>';
            return;
        }

        paginatedAppointments.forEach(appointment => {
            const userId = getUserId(appointment);
            const appointmentId = getAppointmentId(appointment);
            
            console.log('Rendering appointment card:', { userId, appointmentId, patient: appointment.patient }); // Debug

            const card = document.createElement('div');
            card.className = `appointment-card`;
            card.innerHTML = `
                <div class="details">
                    <h5>
                      <a href="#" class="patient-link" data-user-id="${userId}" data-appointment-id="${appointmentId}">
                        ${appointment.patient}
                      </a>
                    </h5>
                    <p>${new Date(appointment.date).toLocaleDateString()} at ${appointment.time}</p>
                    <p>Service: <strong>${appointment.service || 'Unknown'}</strong></p>
                    <p>Confirmation Code: <strong>${appointment.confirmation_code || 'N/A'}</strong></p>
                    <p>Status: <span class="badge bg-${getStatusBadge(appointment.status)}">${appointment.status}</span></p>
                </div>
                <div class="actions">
                    ${appointment.status === 'pending' ? `<button class="btn btn-approve" data-id="${appointmentId}">Approve</button>` : ''}
                    ${appointment.status === 'pending' ? `<button class="btn btn-reject" data-id="${appointmentId}">Reject</button>` : ''}
                </div>
            `;
            container.appendChild(card);

            // Patient name click event
            const patientLink = card.querySelector('.patient-link');
            if (patientLink) {
                patientLink.addEventListener('click', function(e) {
                    e.preventDefault();
                    if (userId && appointmentId) {
                        showPatientDetails(userId, appointmentId);
                    } else {
                        alert('Missing user or appointment ID.');
                    }
                });
            }

            const approveButton = card.querySelector('.btn-approve');
            if (approveButton) {
                approveButton.addEventListener('click', async () => {
                    await updateAppointmentStatus(appointmentId, 'approve');
                    initDashboard();
                });
            }
            
            const rejectButton = card.querySelector('.btn-reject');
            if (rejectButton) {
                rejectButton.addEventListener('click', async () => {
                    await updateAppointmentStatus(appointmentId, 'reject');
                    initDashboard();
                });
            }
        });

        const totalPages = Math.ceil(appointments.length / appointmentsPerPage);
        renderPagination(container.nextElementSibling, totalPages, page, (newPage) => {
            renderAppointments(container, appointments, newPage);
        });
    }

    async function showPatientDetails(userId, appointmentId) {
        if (!userId || !appointmentId) {
            console.error('Missing user or appointment ID:', { userId, appointmentId });
            alert('Missing user or appointment ID.');
            return;
        }
        
        try {
            console.log('Fetching details for user:', userId, 'appointment:', appointmentId); // Debug
            
            // Fetch user basic info
            const userResponse = await fetch(`/api/users/${userId}`);
            if (!userResponse.ok) throw new Error('Failed to fetch user details');
            const userData = await userResponse.json();
            
            // Fetch user complete profile
            const profileResponse = await fetch(`/api/profile/${userId}`);
            let profileData = {};
            if (profileResponse.ok) {
                profileData = await profileResponse.json();
            }
            
            // Fetch appointment details
            const appointmentResponse = await fetch(`/api/appointments/${appointmentId}`);
            if (!appointmentResponse.ok) throw new Error('Failed to fetch appointment details');
            const appointmentData = await appointmentResponse.json();
            
            // Get elements
            const modalTitle = document.getElementById('patientModalLabel');
            const modalBody = document.getElementById('patientModalBody');
            
            // Set title
            modalTitle.textContent = `Patient: ${userData.first_name} ${userData.last_name}`;
            
            // Create modal content with improved styling
            modalBody.innerHTML = `
                <div class="patient-profile">
                    <div class="profile-section">
                        <h5 class="section-title"><i class="fas fa-user-circle"></i> Personal Information</h5>
                        <div class="profile-grid">
                            <div class="profile-item">
                                <label>Name:</label>
                                <span>${userData.first_name} ${userData.last_name}</span>
                            </div>
                            <div class="profile-item">
                                <label>Email:</label>
                                <span>${userData.email}</span>
                            </div>
                            <div class="profile-item">
                                <label>Phone:</label>
                                <span>${userData.phone_number || 'N/A'}</span>
                            </div>
                            <div class="profile-item">
                                <label>Gender:</label>
                                <span>${profileData.gender || 'N/A'}</span>
                            </div>
                            <div class="profile-item">
                                <label>Date of Birth:</label>
                                <span>${profileData.date_of_birth ? new Date(profileData.date_of_birth).toLocaleDateString() : 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="profile-section">
                        <h5 class="section-title"><i class="fas fa-map-marker-alt"></i> Contact Information</h5>
                        <div class="profile-grid">
                            <div class="profile-item">
                                <label>Address:</label>
                                <span>${profileData.address || 'N/A'}</span>
                            </div>
                            <div class="profile-item">
                                <label>City:</label>
                                <span>${profileData.city || 'N/A'}</span>
                            </div>
                            <div class="profile-item">
                                <label>Province:</label>
                                <span>${profileData.province || 'N/A'}</span>
                            </div>
                            <div class="profile-item">
                                <label>Postal Code:</label>
                                <span>${profileData.postal_code || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="profile-section">
                        <h5 class="section-title"><i class="fas fa-heartbeat"></i> Medical Information</h5>
                        <div class="profile-grid">
                            <div class="profile-item">
                                <label>Blood Type:</label>
                                <span>${profileData.blood_type || 'N/A'}</span>
                            </div>
                            <div class="profile-item">
                                <label>Height:</label>
                                <span>${profileData.height ? profileData.height + ' cm' : 'N/A'}</span>
                            </div>
                            <div class="profile-item">
                                <label>Weight:</label>
                                <span>${profileData.weight ? profileData.weight + ' kg' : 'N/A'}</span>
                            </div>
                            <div class="profile-item full-width">
                                <label>Allergies:</label>
                                <span>${profileData.known_allergies || 'None reported'}</span>
                            </div>
                            <div class="profile-item full-width">
                                <label>Medical Conditions:</label>
                                <span>${profileData.medical_conditions || 'None reported'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="profile-section">
                        <h5 class="section-title"><i class="fas fa-phone-alt"></i> Emergency Contact</h5>
                        <div class="profile-grid">
                            <div class="profile-item">
                                <label>Name:</label>
                                <span>${profileData.emergency_contact_name || 'N/A'}</span>
                            </div>
                            <div class="profile-item">
                                <label>Phone:</label>
                                <span>${profileData.emergency_contact_phone || 'N/A'}</span>
                            </div>
                            <div class="profile-item">
                                <label>Relationship:</label>
                                <span>${profileData.emergency_contact_relationship || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="profile-section">
                        <h5 class="section-title"><i class="fas fa-calendar-check"></i> Current Appointment</h5>
                        <div class="profile-grid">
                            <div class="profile-item">
                                <label>Date:</label>
                                <span>${new Date(appointmentData.date).toLocaleDateString()}</span>
                            </div>
                            <div class="profile-item">
                                <label>Time:</label>
                                <span>${appointmentData.time}</span>
                            </div>
                            <div class="profile-item">
                                <label>Service:</label>
                                <span>${appointmentData.service}</span>
                            </div>
                            <div class="profile-item">
                                <label>Status:</label>
                                <span class="badge bg-${getStatusBadge(appointmentData.status)}">${appointmentData.status}</span>
                            </div>
                            <div class="profile-item full-width">
                                <label>Notes:</label>
                                <span>${appointmentData.notes || 'No additional notes'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Display the modal
            const patientModal = new bootstrap.Modal(document.getElementById('patientDetailsModal'));
            patientModal.show();
        } catch (error) {
            console.error('Error showing patient details:', error);
            alert('Failed to load patient details. Please try again.');
        }
    }

    // Render pagination controls
    function renderPagination(container, totalPages, currentPage, onPageChange) {
        container.innerHTML = '';
        
        for (let i = 1; i <= totalPages; i++) {
            const button = document.createElement('button');
            button.className = `btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-outline-primary'}`;
            button.textContent = i;
            
            // Prevent default behavior and handle pagination
            button.addEventListener('click', (event) => {
                event.preventDefault(); // Prevent page refresh
                onPageChange(i); // Call the provided callback for the new page
            });
            
            container.appendChild(button);
        }
    }

    // Get badge color based on status
    function getStatusBadge(status) {
        switch (status) {
            case 'pending':
                return 'warning';
            case 'approved':
                return 'success';
            case 'canceled':
                return 'danger';
            default:
                return 'secondary';
        }
    }

    // Pass the fetched appointments to categorizeAppointments in initDashboard
    async function initDashboard() {
        await fetchAppointments();
        filteredAppointments = [...allAppointments]; // Initialize filteredAppointments with a copy of all data
        const { newAppointments, upcomingAppointments, conflicts } = categorizeAppointments(allAppointments);

        renderAppointments(newAppointmentsContainer, newAppointments);
        renderAppointments(upcomingAppointmentsContainer, upcomingAppointments);
        renderAppointments(conflictAppointmentsContainer, conflicts);
        
        // Make sure the all appointments table is ready to be displayed with data
        renderAllAppointments(1);
    }

    initDashboard();
});