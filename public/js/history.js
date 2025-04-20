document.addEventListener('DOMContentLoaded', function() {
    // Pagination settings
    const recordsPerPage = 8;
    let currentPage = 1;
    let allRecords = [];
    
    // Function to fetch medical history
    async function fetchMedicalHistory() {
        try {
            // Remove URL parameter dependency - use the authenticated user from session
            const response = await fetch('/api/medical-history');
            
            if (!response.ok) {
                // If 401 Unauthorized, the user will be redirected by the fetch interceptor
                throw new Error('Failed to fetch medical history');
            }
            
            const data = await response.json();
            
            // Sort data by created_at in descending order (newest first)
            allRecords = data.sort((a, b) => {
                return new Date(b.created_at) - new Date(a.created_at);
            });
            
            renderMedicalHistory(paginate(allRecords, currentPage, recordsPerPage));
            renderPagination(allRecords.length, recordsPerPage, currentPage);
        } catch (error) {
            console.error('Error:', error);
            document.getElementById('history-table-body').innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">Failed to load medical history. Please try again later.</td>
                </tr>
            `;
        }
    }
    
    // Function to format date nicely
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    // Function to paginate the data
    function paginate(data, page, recordsPerPage) {
        const startIndex = (page - 1) * recordsPerPage;
        const endIndex = startIndex + recordsPerPage;
        return data.slice(startIndex, endIndex);
    }
    
    // Function to render medical history
    function renderMedicalHistory(history) {
        const tableBody = document.getElementById('history-table-body');
        
        if (!history || history.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">No medical history found.</td>
                </tr>
            `;
            return;
        }
        
        let htmlContent = '';
        
        history.forEach(record => {
            const statusClass = `status-${record.status.toLowerCase()}`;
            // Format the date nicely
            const formattedDate = formatDate(record.date);
            
            htmlContent += `
                <tr>
                    <td data-label="Date">${formattedDate}</td>
                    <td data-label="Time">${record.time}</td>
                    <td data-label="Description">${record.description}</td>
                    <td data-label="Status"><span class="${statusClass}">${record.status}</span></td>
                    <td data-label="Confirmation Code">${record.confirmation_code || 'N/A'}</td>
                    <td data-label="Notes">${record.notes || 'None'}</td>
                </tr>
            `;
        });
        
        tableBody.innerHTML = htmlContent;
    }
    
    // Function to render pagination
    function renderPagination(totalRecords, recordsPerPage, currentPage) {
        const paginationContainer = document.getElementById('historyPagination');
        const totalPages = Math.ceil(totalRecords / recordsPerPage);
        
        // Clear previous pagination
        paginationContainer.innerHTML = '';
        
        // Don't show pagination if there's only one page
        if (totalPages <= 1) return;
        
        // Create pagination buttons
        for (let i = 1; i <= totalPages; i++) {
            const button = document.createElement('button');
            button.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
            button.textContent = i;
            
            button.addEventListener('click', () => {
                currentPage = i;
                renderMedicalHistory(paginate(allRecords, currentPage, recordsPerPage));
                renderPagination(totalRecords, recordsPerPage, currentPage);
            });
            
            paginationContainer.appendChild(button);
        }
    }
    
    // Initialize - No need to check for URL parameters anymore
    fetchMedicalHistory();
    
    // Apply navbar scroll effect - modified to ensure proper positioning
    const navbar = document.querySelector(".navbar");
    
    window.addEventListener("scroll", function() {
        navbar.classList.toggle("scrolled", window.scrollY > 20);
    });
    
    // Trigger the scroll event once to apply initial styling
    window.dispatchEvent(new Event('scroll'));
});