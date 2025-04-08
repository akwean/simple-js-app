document.addEventListener('DOMContentLoaded', function() {
    // Sample data for appointments
    const appointments = [
        { id: 1, patient: 'John Doe', date: '2025-04-10', time: '10:00 AM', status: 'pending' },
        { id: 2, patient: 'Jane Smith', date: '2025-04-11', time: '2:00 PM', status: 'approved' },
        { id: 3, patient: 'Alice Johnson', date: '2025-04-10', time: '10:00 AM', status: 'pending' }, // Conflict example
        { id: 4, patient: 'Bob Brown', date: '2025-04-13', time: '3:00 PM', status: 'canceled' },
        { id: 5, patient: 'Charlie Davis', date: '2025-04-12', time: '11:00 AM', status: 'pending' },
        { id: 6, patient: 'Emily White', date: '2025-04-10', time: '10:00 AM', status: 'pending' }, // Conflict example
    ];

    const appointmentsPerPage = 5;
    const newAppointmentsContainer = document.getElementById('newAppointments');
    const upcomingAppointmentsContainer = document.getElementById('upcomingAppointments');
    const conflictAppointmentsContainer = document.getElementById('conflictAppointments');

    // Categorize appointments
    function categorizeAppointments() {
        const today = new Date('2025-04-08'); // Current date
        const newAppointments = [];
        const upcomingAppointments = [];
        const conflicts = [];

        const appointmentMap = new Map();

        appointments.forEach(appt => {
            const apptDate = new Date(appt.date);
            const key = `${appt.date}-${appt.time}`;

            // Check for conflicts
            if (appointmentMap.has(key)) {
                conflicts.push(appt);
                conflicts.push(appointmentMap.get(key));
            } else {
                appointmentMap.set(key, appt);
            }

            if (apptDate >= today && appt.status === 'pending') {
                newAppointments.push(appt);
            } else if (apptDate > today) {
                upcomingAppointments.push(appt);
            }
        });

        return { newAppointments, upcomingAppointments, conflicts: [...new Set(conflicts)] };
    }

    // Render appointments with pagination
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
            const card = document.createElement('div');
            card.className = 'appointment-card';
            card.innerHTML = `
                <div class="details">
                    <h5>${appointment.patient}</h5>
                    <p>${appointment.date} at ${appointment.time}</p>
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

    // Initialize dashboard
    function initDashboard() {
        const { newAppointments, upcomingAppointments, conflicts } = categorizeAppointments();

        renderAppointments(newAppointmentsContainer, newAppointments);
        renderAppointments(upcomingAppointmentsContainer, upcomingAppointments);
        renderAppointments(conflictAppointmentsContainer, conflicts);
    }

    initDashboard();
});