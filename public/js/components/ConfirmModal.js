
class ConfirmModal {
  constructor() {
    this.isOpen = false;
    this.modal = null;
    this.onConfirm = null;
    this.onCancel = null;
  }

  show({ message, onConfirm, onCancel }) {
    if (this.isOpen) return;
    
    this.isOpen = true;
    this.onConfirm = onConfirm;
    this.onCancel = onCancel;
    
    // Create modal with same styling as toast
    this.modal = document.createElement('div');
    this.modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 opacity-0 transition-opacity duration-300';
    this.modal.innerHTML = `
      <div class="bg-white rounded-xl p-6 max-w-md mx-4 shadow-2xl transform scale-95 transition-all duration-300 border border-slate-200">
        <div class="flex items-center gap-3 mb-4">
          <div class="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5 text-red-600"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
          </div>
          <h3 class="text-lg font-semibold text-slate-800">Confirm Action</h3>
        </div>
        <p class="text-slate-600 mb-6 leading-relaxed">${message}</p>
        <div class="flex gap-3 justify-end">
          <button id="modal-cancel" class="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium">
            Cancel
          </button>
          <button id="modal-confirm" class="px-4 py-2 bg-color-primary hover:bg-color-light-primary text-white rounded-lg transition-colors font-medium">
            OK
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.modal);
    
    // Animate in
    requestAnimationFrame(() => {
      this.modal.classList.remove('opacity-0');
      this.modal.querySelector('div').classList.remove('scale-95');
      this.modal.querySelector('div').classList.add('scale-100');
    });
    
    // Add event listeners
    const cancelBtn = this.modal.querySelector('#modal-cancel');
    const confirmBtn = this.modal.querySelector('#modal-confirm');
    
    cancelBtn.addEventListener('click', () => this.hide(false));
    confirmBtn.addEventListener('click', () => this.hide(true));
    
    // Close on escape key
    this.handleEscape = (e) => {
      if (e.key === 'Escape') {
        this.hide(false);
      }
    };
    document.addEventListener('keydown', this.handleEscape);
    
    // Close on backdrop click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.hide(false);
      }
    });
  }
  
  hide(confirmed) {
    if (!this.isOpen || !this.modal) return;
    
    // Animate out
    this.modal.classList.add('opacity-0');
    this.modal.querySelector('div').classList.remove('scale-100');
    this.modal.querySelector('div').classList.add('scale-95');
    
    setTimeout(() => {
      if (this.modal && document.body.contains(this.modal)) {
        document.body.removeChild(this.modal);
      }
      document.removeEventListener('keydown', this.handleEscape);
      
      this.isOpen = false;
      this.modal = null;
      
      // Call appropriate callback
      if (confirmed && this.onConfirm) {
        this.onConfirm();
      } else if (!confirmed && this.onCancel) {
        this.onCancel();
      }
    }, 300);
  }
}

// Global instance for easy access
const confirmModal = new ConfirmModal();

// Helper function for Promise-based usage
function confirmDialog(message) {
  return new Promise((resolve) => {
    confirmModal.show({
      message,
      onConfirm: () => resolve(true),
      onCancel: () => resolve(false)
    });
  });
}

// Export for module usage (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ConfirmModal, confirmModal, confirmDialog };
}
