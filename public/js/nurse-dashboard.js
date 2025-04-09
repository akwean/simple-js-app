document.addEventListener('DOMContentLoaded', function() {

    const appointmentsPerPage = 4;
    const newAppointmentsContainer = document.getElementById('newAppointments');
    const upcomingAppointmentsContainer = document.getElementById('upcomingAppointments');
    const conflictAppointmentsContainer = document.getElementById('conflictAppointments');

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
                conflicts.push(appt);
                conflicts.push(appointmentMap.get(key));
            } else {
                appointmentMap.set(key, appt);
            }

            // Compare normalized dates
            if (apptDate >= today && appt.status === 'pending') {
                newAppointments.push(appt);
            } else if (apptDate > today) {
                upcomingAppointments.push(appt);
            }
        });

        return { newAppointments, upcomingAppointments, conflicts: [...new Set(conflicts)] };
    }

    // Updated renderAppointments to format the date field correctly
    function renderAppointments(container, appointments, page = 1) {
        container.innerHTML = '';
        const start = (page - 1) * appointmentsPerPage;
        const end = start + appointmentsPerPage;
        const paginatedAppointments = appointments.slice(start, end);

        if (paginatedAppointments.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No appointments found.</p>';
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
                    <p>Status: <span class="badge bg-${getStatusBadge(appointment.status)}">${appointment.status}</span></p>
                </div>
                <div class="actions">
                    ${appointment.status === 'pending' ? `<button class="btn btn-approve" data-id="${appointment.id}">Approve</button>` : ''}
                    ${appointment.status === 'pending' ? `<button class="btn btn-reject" data-id="${appointment.id}">Reject</button>` : ''}
                </div>
            `;
            container.appendChild(card);
        });

        // Add pagination controls
        const totalPages = Math.ceil(appointments.length / appointmentsPerPage);
        renderPagination(container.nextElementSibling, totalPages, page, (newPage) => {
            renderAppointments(container, appointments, newPage);
        });
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

    initDashboard();
});