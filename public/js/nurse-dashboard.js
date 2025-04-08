document.addEventListener('DOMContentLoaded', function() {
    // Sample data for appointments
    const appointments = [
        { id: 1, patient: 'John Doe', date: '2025-04-10', time: '10:00 AM', status: 'pending' },
        { id: 2, patient: 'Jane Smith', date: '2025-04-11', time: '2:00 PM', status: 'approved' },
        { id: 3, patient: 'Alice Johnson', date: '2025-04-12', time: '11:00 AM', status: 'pending' },
        { id: 4, patient: 'Bob Brown', date: '2025-04-13', time: '3:00 PM', status: 'canceled' },
    ];

    const appointmentList = document.querySelector('.appointment-list');
    const filterDate = document.getElementById('filterDate');
    const filterStatus = document.getElementById('filterStatus');
    const filterPatient = document.getElementById('filterPatient');
    const applyFiltersButton = document.getElementById('applyFilters');

    // Render appointments
    function renderAppointments(filteredAppointments) {
        appointmentList.innerHTML = '';

        if (filteredAppointments.length === 0) {
            appointmentList.innerHTML = '<p class="text-center text-muted">No appointments found.</p>';
            return;
        }

        filteredAppointments.forEach(appointment => {
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
            appointmentList.appendChild(card);
        });

        // Add event listeners for approve/reject buttons
        document.querySelectorAll('.btn-approve').forEach(button => {
            button.addEventListener('click', () => handleApprove(button.dataset.id));
        });

        document.querySelectorAll('.btn-reject').forEach(button => {
            button.addEventListener('click', () => handleReject(button.dataset.id));
        });
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

    // Handle approve action
    function handleApprove(id) {
        const appointment = appointments.find(appt => appt.id == id);
        if (appointment) {
            appointment.status = 'approved';
            renderAppointments(filterAppointments());
        }
    }

    // Handle reject action
    function handleReject(id) {
        const appointment = appointments.find(appt => appt.id == id);
        if (appointment) {
            appointment.status = 'canceled';
            renderAppointments(filterAppointments());
        }
    }

    // Filter appointments
    function filterAppointments() {
        return appointments.filter(appt => {
            const matchesDate = !filterDate.value || appt.date === filterDate.value;
            const matchesStatus = filterStatus.value === 'all' || appt.status === filterStatus.value;
            const matchesPatient = !filterPatient.value || appt.patient.toLowerCase().includes(filterPatient.value.toLowerCase());
            return matchesDate && matchesStatus && matchesPatient;
        });
    }

    // Apply filters
    applyFiltersButton.addEventListener('click', () => {
        renderAppointments(filterAppointments());
    });

    // Initial render
    renderAppointments(appointments);
});