document.addEventListener('DOMContentLoaded', function() {

    const appointmentsPerPage = 6;
    const newAppointmentsContainer = document.getElementById('newAppointments');
    const upcomingAppointmentsContainer = document.getElementById('upcomingAppointments');
    const conflictAppointmentsContainer = document.getElementById('conflictAppointments');
    const allAppointmentsContainer = document.getElementById('allAppointmentsContainer');
    const allAppointmentsTable = document.getElementById('allAppointmentsTable');
    const allAppointmentsPagination = document.getElementById('allAppointmentsPagination');
    const toggleAllAppointmentsButton = document.getElementById('toggleAllAppointments');

    toggleAllAppointmentsButton.addEventListener('click', () => {
        const isHidden = allAppointmentsContainer.classList.contains('d-none');
        allAppointmentsContainer.classList.toggle('d-none', !isHidden);
        toggleAllAppointmentsButton.textContent = isHidden ? 'Collapse' : 'Expand';
    });

    // Add search and filter functionality for all appointments
    document.getElementById('searchAppointments').addEventListener('input', filterAppointments);
    document.getElementById('filterDate').addEventListener('change', filterAppointments);
    document.getElementById('filterStatus').addEventListener('change', filterAppointments);

    function filterAppointments() {
        const searchTerm = document.getElementById('searchAppointments').value.toLowerCase();
        const filterDate = document.getElementById('filterDate').value; // Date in YYYY-MM-DD format
        const filterStatus = document.getElementById('filterStatus').value.toLowerCase();

        const rows = document.querySelectorAll('#allAppointmentsTable tr');
        rows.forEach(row => {
            const patient = row.querySelector('td:nth-child(1)')?.textContent.toLowerCase();
            const date = row.querySelector('td:nth-child(2)')?.textContent; // Date in table
            const status = row.querySelector('td:nth-child(4)')?.textContent.toLowerCase();

            // Convert the table date to YYYY-MM-DD format for comparison
            const tableDate = new Date(date);
            const formattedDate = new Date(tableDate.getTime() - tableDate.getTimezoneOffset() * 60000)
                .toISOString()
                .split('T')[0];

            const matchesSearch = !searchTerm || patient.includes(searchTerm);
            const matchesDate = !filterDate || formattedDate === filterDate;
            const matchesStatus = filterStatus === 'all' || status === filterStatus;

            row.style.display = matchesSearch && matchesDate && matchesStatus ? '' : 'none';
        });
    }

    async function fetchAppointments() {
        try {
            const response = await fetch('/api/appointments');
            if (!response.ok) throw new Error('Failed to Fetch appointments');
            return await response.json();
        } catch (error) {
            console.error('Error fetching appointments:', error);
            return [];
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

    // Updated renderAppointments to format the date field correctly and include confirmation code
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
            // Format the date to a readable format
            const formattedDate = new Date(appointment.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const card = document.createElement('div');
            card.className = 'appointment-card';
            card.innerHTML = `
                <div class="details">
                    <h5>${appointment.patient}</h5>
                    <p>${formattedDate} at ${appointment.time}</p>
                    <p>Confirmation Code: <strong>${appointment.confirmation_code || 'N/A'}</strong></p>
                    <p>Status: <span class="badge bg-${getStatusBadge(appointment.status)}">${appointment.status}</span></p>
                </div>
                <div class="actions">
                    ${appointment.status === 'pending' ? `<button class="btn btn-approve" data-id="${appointment.id}">Approve</button>` : ''}
                    ${appointment.status === 'pending' ? `<button class="btn btn-reject" data-id="${appointment.id}">Reject</button>` : ''}
                </div>
            `;
            container.appendChild(card);

            // Add event listeners for approve and reject buttons
            const approveButton = card.querySelector('.btn-approve');
            const rejectButton = card.querySelector('.btn-reject');

            if (approveButton) {
                approveButton.addEventListener('click', async () => {
                    await updateAppointmentStatus(appointment.id, 'approve');
                    initDashboard(); // Refresh the dashboard
                });
            }

            if (rejectButton) {
                rejectButton.addEventListener('click', async () => {
                    await updateAppointmentStatus(appointment.id, 'reject');
                    initDashboard(); // Refresh the dashboard
                });
            }
        });

        // Add pagination controls
        const totalPages = Math.ceil(appointments.length / appointmentsPerPage);
        renderPagination(container.nextElementSibling, totalPages, page, (newPage) => {
            renderAppointments(container, appointments, newPage);
        });
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

    // Render pagination controls
    function renderPagination(container, totalPages, currentPage, onPageChange) {
        container.innerHTML = '';

        for (let i = 1; i <= totalPages; i++) {
            const button = document.createElement('button');
            button.className = `btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-outline-primary'}`;
            button.textContent = i;
            button.addEventListener('click', () => onPageChange(i));
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
        const appointments = await fetchAppointments();
        const { newAppointments, upcomingAppointments, conflicts } = categorizeAppointments(appointments);

        renderAppointments(newAppointmentsContainer, newAppointments);
        renderAppointments(upcomingAppointmentsContainer, upcomingAppointments);
        renderAppointments(conflictAppointmentsContainer, conflicts);
    }

    async function renderAllAppointments(page = 1) {
        const appointments = await fetchAppointments();
        const start = (page - 1) * appointmentsPerPage;
        const end = start + appointmentsPerPage;
        const paginatedAppointments = appointments.slice(start, end);

        allAppointmentsTable.innerHTML = '';
        paginatedAppointments.forEach(appointment => {
            const row = document.createElement('tr');
            row.innerHTML = `
                
                <td>${appointment.patient}</td>
                <td>${new Date(appointment.date).toLocaleDateString()}</td>
                <td>${appointment.time}</td>
                <td>${appointment.status}</td>
            `;
            allAppointmentsTable.appendChild(row);
        });

        const totalPages = Math.ceil(appointments.length / appointmentsPerPage);
        renderPagination(allAppointmentsPagination, totalPages, page, renderAllAppointments);
    }

    initDashboard();
    renderAllAppointments();
});