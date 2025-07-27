// Main JavaScript for BARUA KAZI

document.addEventListener('DOMContentLoaded', function() {
    // Auto-hide flash messages after 5 seconds
    const alerts = document.querySelectorAll('.alert-reqflash');
    alerts.forEach(alert => {
        setTimeout(() => {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }, 5000);
    });

    // File upload handling
    const fileInput = document.getElementById('cv');
    const uploadArea = document.querySelector('.upload-area');
    
    if (fileInput && uploadArea) {
        // Click to select file
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        // File selection handler
        fileInput.addEventListener('change', handleFileSelect);

        // Drag and drop handlers
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('dragleave', handleDragLeave);
        uploadArea.addEventListener('drop', handleFileDrop);
    }

    // Form submission with loading state
    const generateForm = document.getElementById('generateForm');
    if (generateForm) {
        generateForm.addEventListener('submit', handleFormSubmit);
    }
});

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        updateUploadArea(file);
    }
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('dragover');
}

function handleFileDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const fileInput = document.getElementById('cv');
        fileInput.files = files;
        updateUploadArea(files[0]);
    }
}

function updateUploadArea(file) {
    const uploadArea = document.querySelector('.upload-area');
    const fileName = file.name;
    const fileSize = (file.size / 1024 / 1024).toFixed(2);
    
    uploadArea.innerHTML = `
        <i class="bi bi-file-earmark-pdf text-success" style="font-size: 2rem;"></i>
        <p class="mb-1 mt-2"><strong>${fileName}</strong></p>
        <small class="text-muted">${fileSize} MB</small>
    `;
}

function handleFormSubmit(e) {
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const progressContainer = document.querySelector('.progress-container');
    
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Generating...';
    }
    
    if (progressContainer) {
        progressContainer.style.display = 'block';
    }
}

// Utility function to show toast notifications
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    document.body.appendChild(container);
    return container;
}