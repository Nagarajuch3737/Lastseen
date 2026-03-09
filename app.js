class LastSeenApp {
    constructor() {
        this.items = [];
        this.useLocalStorage = false;
        this.updateIntervals = new Map();
        this.longPressTimer = null;
        this.longPressThreshold = 600;
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadItems();
        this.startHealthCheck();
    }

    setupEventListeners() {
        // Form submission
        document.getElementById('addItemForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addItem();
        });

        // Export/Import
        document.getElementById('exportBtn').addEventListener('click', () => this.exportItems());
        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('importFile').click();
        });
        document.getElementById('importFile').addEventListener('change', (e) => this.importItems(e));

        // Tooltip modal
        document.getElementById('tooltipClose').addEventListener('click', () => this.closeTooltip());
        document.getElementById('tooltipBackdrop').addEventListener('click', () => this.closeTooltip());
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeTooltip();
            }
        });
    }

    async loadItems() {
        try {
            this.showLoading(true);
            
            // Try to load from API first
            const response = await fetch('/api/health');
            if (response.ok) {
                const itemsResponse = await fetch('/api/items');
                if (itemsResponse.ok) {
                    this.items = await itemsResponse.json();
                    this.useLocalStorage = false;
                } else {
                    throw new Error('API error');
                }
            } else {
                throw new Error('Health check failed');
            }
        } catch (error) {
            // Fallback to localStorage
            console.log('API unavailable, using localStorage');
            this.items = this.loadFromLocalStorage();
            this.useLocalStorage = true;
            this.showStatus('Using offline mode - changes saved locally', 'success');
        }
        
        this.renderItems();
        this.showLoading(false);
    }

    loadFromLocalStorage() {
        const stored = localStorage.getItem('lastseen_items');
        return stored ? JSON.parse(stored) : [];
    }

    saveToLocalStorage() {
        localStorage.setItem('lastseen_items', JSON.stringify(this.items));
    }

    async addItem() {
        const form = document.getElementById('addItemForm');
        const formData = new FormData(form);
        const name = formData.get('name').trim();
        const notes = formData.get('notes').trim();

        if (!name) {
            this.showStatus('Please enter an item name', 'error');
            return;
        }

        const newItem = {
            name,
            notes: notes || undefined
        };

        try {
            let createdItem;
            
            if (this.useLocalStorage) {
                createdItem = {
                    id: this.generateUUID(),
                    name: newItem.name,
                    notes: newItem.notes || '',
                    createdAt: new Date().toISOString()
                };
                this.items.push(createdItem);
                this.saveToLocalStorage();
            } else {
                const response = await fetch('/api/items', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newItem)
                });
                
                if (!response.ok) throw new Error('Failed to create item');
                createdItem = await response.json();
                this.items.push(createdItem);
            }

            form.reset();
            this.renderItems();
            this.showStatus(`Added "${createdItem.name}"`, 'success');
        } catch (error) {
            this.showStatus('Failed to add item', 'error');
        }
    }

    formatDatetimeForInput(isoString) {
        // Convert ISO string to datetime-local format (YYYY-MM-DDTHH:mm) in LOCAL time
        const date = new Date(isoString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    async editItem(id) {
        const item = this.items.find(i => i.id === id);
        if (!item) return;

        // Format dates for input fields
        const createdDateValue = this.formatDatetimeForInput(item.createdAt);

        // Create edit modal
        const modal = document.createElement('div');
        modal.className = 'edit-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-labelledby', `editTitle-${id}`);
        modal.innerHTML = `
            <div class="edit-backdrop"></div>
            <div class="edit-content">
                <div class="edit-header">
                    <h3 id="editTitle-${id}">Edit Item</h3>
                    <button type="button" class="edit-close-btn" id="closeEdit-${id}" aria-label="Close editor" title="Close">
                        ×
                    </button>
                </div>
                <form id="editForm-${id}">
                    <div class="form-group">
                        <label for="editName-${id}" class="form-label">
                            <span>Item name</span>
                            <span class="label-required" aria-label="required">*</span>
                        </label>
                        <input 
                            type="text" 
                            id="editName-${id}" 
                            class="form-input"
                            value="${this.escapeHtml(item.name)}" 
                            required
                            aria-required="true"
                            aria-describedby="editNameHelp-${id}"
                            placeholder="Enter item name"
                        >
                        <small id="editNameHelp-${id}" class="form-help">Update the name of your item</small>
                    </div>
                    <div class="form-group">
                        <label for="editNotes-${id}" class="form-label">
                            <span>Notes</span>
                            <span class="label-optional" aria-label="optional">(optional)</span>
                        </label>
                        <textarea 
                            id="editNotes-${id}" 
                            class="form-textarea"
                            aria-describedby="editNotesHelp-${id}"
                            placeholder="Add any additional notes..."
                        >${this.escapeHtml(item.notes || '')}</textarea>
                        <small id="editNotesHelp-${id}" class="form-help">Add any extra information</small>
                    </div>
                    <div class="datetime-section">
                        <h4 class="datetime-title">📅 Date & Time (Optional)</h4>
                        <div class="form-group">
                            <label for="editCreatedDate-${id}" class="form-label">
                                <span>Date Added</span>
                                <span class="label-optional" aria-label="optional">(optional)</span>
                            </label>
                            <input 
                                type="datetime-local" 
                                id="editCreatedDate-${id}" 
                                class="form-input"
                                value="${createdDateValue}"
                            >
                        </div>
                    </div>
                    <div class="edit-actions">
                        <button type="button" class="btn btn-secondary" id="cancelEdit-${id}" aria-label="Cancel editing">
                            Cancel
                        </button>
                        <button type="submit" class="btn btn-primary" aria-label="Save changes">
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        // Use setTimeout to trigger animation
        setTimeout(() => modal.classList.add('active'), 10);

        // Focus on name input
        const nameInput = document.getElementById(`editName-${id}`);
        nameInput.focus();
        nameInput.select();

        // Setup event listeners
        const form = document.getElementById(`editForm-${id}`);
        const closeBtn = document.getElementById(`closeEdit-${id}`);
        const backdrop = modal.querySelector('.edit-backdrop');

        const closeModal = () => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
            document.removeEventListener('keydown', handleEscape);
        };

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newName = document.getElementById(`editName-${id}`).value.trim();
            const newNotes = document.getElementById(`editNotes-${id}`).value.trim();
            const newCreatedDate = document.getElementById(`editCreatedDate-${id}`).value;

            if (!newName) {
                this.showStatus('Item name cannot be empty', 'error');
                return;
            }

            const updates = { name: newName, notes: newNotes };

            // If dates are provided, convert to ISO format
            if (newCreatedDate) {
                updates.createdAt = new Date(newCreatedDate).toISOString();
            }

            await this.updateItem(id, updates);
            closeModal();
        });

        const cancelBtn = document.getElementById(`cancelEdit-${id}`);
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        
        // Close on Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeModal();
            }
        };
        document.addEventListener('keydown', handleEscape);
    }

    escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    async updateItem(id, updates) {
        try {
            let updatedItem;
            
            if (this.useLocalStorage) {
                const item = this.items.find(i => i.id === id);
                if (item) {
                    Object.assign(item, updates);
                    // Only modify timestamp if user explicitly changed date/time in editor
                    // For name/notes only changes, preserve existing timestamp
                    updatedItem = item;
                    this.saveToLocalStorage();
                }
            } else {
                const response = await fetch(`/api/items/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updates)
                });
                
                if (!response.ok) throw new Error('Failed to update item');
                updatedItem = await response.json();
                
                // Don't automatically touch/update timestamp for name/notes changes
                // Only the explicit date changes from the editor window will update timestamps
                
                const index = this.items.findIndex(i => i.id === id);
                if (index !== -1) {
                    this.items[index] = updatedItem;
                }
            }

            this.renderItems();
            this.showStatus(`Updated "${updatedItem.name}"`, 'success');
        } catch (error) {
            this.showStatus('Failed to update item', 'error');
        }
    }

    async deleteItem(id) {
        if (!confirm('Are you sure you want to delete this item?')) return;

        try {
            if (this.useLocalStorage) {
                this.items = this.items.filter(i => i.id !== id);
                this.saveToLocalStorage();
            } else {
                const response = await fetch(`/api/items/${id}`, {
                    method: 'DELETE'
                });
                
                if (!response.ok) throw new Error('Failed to delete item');
                this.items = this.items.filter(i => i.id !== id);
            }

            this.renderItems();
            this.showStatus('Item deleted', 'success');
        } catch (error) {
            this.showStatus('Failed to delete item', 'error');
        }
    }

    renderItems() {
        const container = document.getElementById('itemsContainer');
        const list = document.getElementById('itemsList');
        const emptyState = document.getElementById('emptyState');
        const loading = document.getElementById('loading');

        loading.style.display = 'none';

        if (this.items.length === 0) {
            list.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        list.style.display = 'block';
        emptyState.style.display = 'none';
        
        // Clear existing intervals
        this.updateIntervals.forEach(interval => clearInterval(interval));
        this.updateIntervals.clear();

        list.innerHTML = '';
        
        this.items.forEach(item => {
            const li = this.createItemElement(item);
            list.appendChild(li);
        });
        
        // Initialize time displays after elements are in DOM
        this.items.forEach(item => {
            this.updateTimeDisplay(item.id);
            this.startTimeUpdates(item.id);
        });
    }

    createItemElement(item) {
        const li = document.createElement('li');
        li.className = 'item';
        li.dataset.id = item.id;

        const content = document.createElement('div');
        content.className = 'item-content';

        const name = document.createElement('div');
        name.className = 'item-name';
        name.textContent = item.name;
        name.setAttribute('tabindex', '0');
        name.setAttribute('role', 'button');
        name.setAttribute('aria-label', `View details for ${item.name}`);
        
        // Add click event to show tooltip (instead of hover)
        name.addEventListener('click', () => this.showTooltip(item));
        name.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.showTooltip(item);
            }
        });

        if (item.notes) {
            const notes = document.createElement('div');
            notes.className = 'item-notes';
            notes.textContent = item.notes;
            content.appendChild(notes);
        }

        const time = document.createElement('div');
        time.className = 'item-time';
        time.dataset.id = item.id;
        
        content.appendChild(name);

        // Remove hover events from content area - only click on name will show tooltip
        // Long press for mobile on content area
        content.addEventListener('touchstart', (e) => this.startLongPress(e, item));
        content.addEventListener('touchend', () => this.endLongPress());
        content.addEventListener('touchmove', () => this.endLongPress());
        
        // Remove focusability from content area - only name will be clickable
        content.removeAttribute('tabindex');
        content.removeAttribute('role');
        content.removeAttribute('aria-label');

        const actions = document.createElement('div');
        actions.className = 'item-actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-primary btn-small';
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', () => this.editItem(item.id));

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger btn-small';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => this.deleteItem(item.id));

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);

        li.appendChild(content);
        li.appendChild(time);
        li.appendChild(actions);

        return li;
    }

    updateTimeDisplay(itemId) {
        const item = this.items.find(i => i.id === itemId);
        if (!item) return;

        const timeElement = document.querySelector(`.item-time[data-id="${itemId}"]`);
        if (!timeElement) return;

        const timestamp = item.createdAt;
        timeElement.textContent = this.formatTimeAgo(new Date(timestamp));
    }

    startTimeUpdates(itemId) {
        const updateFrequency = this.getUpdateFrequency(itemId);
        
        const interval = setInterval(() => {
            this.updateTimeDisplay(itemId);
            
            // Check if we need to change the update frequency
            const newFrequency = this.getUpdateFrequency(itemId);
            if (newFrequency !== updateFrequency) {
                clearInterval(interval);
                this.startTimeUpdates(itemId);
            }
        }, updateFrequency);
        
        this.updateIntervals.set(itemId, interval);
    }

    getUpdateFrequency(itemId) {
        const item = this.items.find(i => i.id === itemId);
        if (!item) return 60000; // default to 1 minute

        const timestamp = item.createdAt;
        const now = new Date();
        const diffMs = now - new Date(timestamp);
        const diffMinutes = diffMs / (1000 * 60);

        if (diffMinutes < 1) return 1000; // every second
        if (diffMinutes < 60) return 60000; // every minute
        return 3600000; // every hour
    }

    formatTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);
        const diffWeeks = Math.floor(diffDays / 7);
        const diffMonths = Math.floor(diffDays / 30);
        const diffYears = Math.floor(diffDays / 365);

        if (diffSeconds < 10) return 'just now';
        if (diffSeconds < 60) return `${diffSeconds} seconds ago`;
        if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        if (diffDays === 1) return 'yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffWeeks < 4) return `${diffWeeks} weeks ago`;
        if (diffMonths < 12) return `${diffMonths} months ago`;
        return `${diffYears} years ago`;
    }

    showTooltip(item) {
        const modal = document.getElementById('tooltipModal');
        const title = document.getElementById('tooltip-title');
        const date = document.querySelector('.tooltip-date');
        const iso = document.querySelector('.tooltip-iso');

        const timestamp = item.createdAt;
        const dateObj = new Date(timestamp);

        title.textContent = item.name;
        date.textContent = this.formatFriendlyDate(dateObj);
        iso.textContent = timestamp;

        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
    }

    hideTooltip() {
        const modal = document.getElementById('tooltipModal');
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
    }

    closeTooltip() {
        this.hideTooltip();
    }

    startLongPress(event, item) {
        this.longPressTimer = setTimeout(() => {
            event.preventDefault();
            this.showTooltip(item);
        }, this.longPressThreshold);
    }

    endLongPress() {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    }

    formatFriendlyDate(date) {
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
        };
        return date.toLocaleDateString('en-US', options);
    }

    updateItemElement(itemId) {
        this.updateTimeDisplay(itemId);
        // Restart time updates with potentially new frequency
        const interval = this.updateIntervals.get(itemId);
        if (interval) {
            clearInterval(interval);
            this.startTimeUpdates(itemId);
        }
    }

    exportItems() {
        const dataStr = JSON.stringify(this.items, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `lastseen-export-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        this.showStatus('Items exported successfully', 'success');
    }

    async importItems(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const importedItems = JSON.parse(text);
            
            if (!Array.isArray(importedItems)) {
                throw new Error('Invalid file format');
            }

            // Validate items
            const validItems = importedItems.filter(item => 
                item.id && item.name && item.createdAt
            );

            if (validItems.length === 0) {
                throw new Error('No valid items found in file');
            }

            // Merge with existing items (avoid duplicates by ID)
            const existingIds = new Set(this.items.map(i => i.id));
            const newItems = validItems.filter(item => !existingIds.has(item.id));
            
            this.items = [...this.items, ...newItems];

            if (this.useLocalStorage) {
                this.saveToLocalStorage();
            } else {
                // Try to sync with server
                try {
                    for (const item of newItems) {
                        await fetch('/api/items', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                name: item.name,
                                notes: item.notes
                            })
                        });
                    }
                } catch (error) {
                    console.warn('Failed to sync imported items with server');
                }
            }

            this.renderItems();
            this.showStatus(`Imported ${newItems.length} new items`, 'success');
        } catch (error) {
            this.showStatus('Failed to import items: ' + error.message, 'error');
        }

        // Reset file input
        event.target.value = '';
    }

    showStatus(message, type = 'info') {
        const container = document.getElementById('statusContainer');
        const status = document.createElement('div');
        status.className = `status-message ${type}`;
        status.textContent = message;
        
        container.appendChild(status);
        
        setTimeout(() => {
            status.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => status.remove(), 300);
        }, 3000);
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        const emptyState = document.getElementById('emptyState');
        const list = document.getElementById('itemsList');
        
        if (show) {
            loading.style.display = 'flex';
            emptyState.style.display = 'none';
            list.style.display = 'none';
        } else {
            loading.style.display = 'none';
        }
    }

    startHealthCheck() {
        // Check server connectivity every 30 seconds
        setInterval(async () => {
            try {
                const response = await fetch('/api/health');
                const isOnline = response.ok;
                
                if (isOnline && this.useLocalStorage) {
                    // Server is back online, try to sync
                    await this.syncWithServer();
                } else if (!isOnline && !this.useLocalStorage) {
                    // Server went offline, switch to localStorage
                    this.useLocalStorage = true;
                    this.showStatus('Server offline - switched to local mode', 'error');
                }
            } catch (error) {
                if (!this.useLocalStorage) {
                    this.useLocalStorage = true;
                    this.showStatus('Server offline - switched to local mode', 'error');
                }
            }
        }, 30000);
    }

    async syncWithServer() {
        try {
            // Get server items
            const response = await fetch('/api/items');
            const serverItems = await response.json();
            
            // Merge local and server items
            const serverIds = new Set(serverItems.map(i => i.id));
            const localOnlyItems = this.items.filter(i => !serverIds.has(i.id));
            
            // Upload local-only items to server
            for (const item of localOnlyItems) {
                await fetch('/api/items', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: item.name,
                        notes: item.notes
                    })
                });
            }
            
            // Reload from server
            this.useLocalStorage = false;
            await this.loadItems();
            this.showStatus('Synced with server', 'success');
        } catch (error) {
            console.warn('Failed to sync with server:', error);
        }
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new LastSeenApp();
});
