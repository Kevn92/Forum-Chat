// Search highlight functionality
function highlightSearch() {
    const searchQuery = document.getElementById('searchInput')?.value.toLowerCase().trim();
    if (!searchQuery) {
        clearSearch();
        return;
    }

    // Remove existing highlights
    document.querySelectorAll('.highlight').forEach(el => {
        el.outerHTML = el.innerHTML;
    });

    // Search in message contents
    const messages = document.querySelectorAll('.message-content');
    let foundCount = 0;
    
    messages.forEach(message => {
        const originalHTML = message.innerHTML;
        const textContent = message.textContent.toLowerCase();
        
        if (textContent.includes(searchQuery)) {
            const regex = new RegExp(`(${searchQuery})`, 'gi');
            message.innerHTML = originalHTML.replace(regex, '<span class="highlight">$1</span>');
            foundCount++;
            
            // Scroll to first match
            if (foundCount === 1) {
                message.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    });

    // Show result count
    const toast = document.createElement('div');
    toast.className = 'position-fixed bottom-0 end-0 p-3';
    toast.style.zIndex = '11';
    toast.innerHTML = `
        <div class="toast show" role="alert">
            <div class="toast-header">
                <strong class="me-auto">Search Results</strong>
                <button type="button" class="btn-close" onclick="this.parentElement.parentElement.parentElement.remove()"></button>
            </div>
            <div class="toast-body">
                Found ${foundCount} message(s) containing "${searchQuery}"
            </div>
        </div>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    document.querySelectorAll('.highlight').forEach(el => {
        el.outerHTML = el.innerHTML;
    });
}

// Reply functionality
function replyTo(chatId, nickname) {
    const parentInput = document.getElementById('parent_chat_id');
    const messageInput = document.getElementById('messageInput');
    const indicator = document.getElementById('replyIndicator');
    
    if (parentInput && messageInput && indicator) {
        parentInput.value = chatId;
        messageInput.placeholder = `Replying to ${nickname}...`;
        messageInput.focus();
        
        document.getElementById('replyToName').textContent = nickname;
        indicator.classList.remove('d-none');
        
        // Scroll to message input
        messageInput.scrollIntoView({ behavior: 'smooth' });
    }
}

function cancelReply() {
    const parentInput = document.getElementById('parent_chat_id');
    const messageInput = document.getElementById('messageInput');
    const indicator = document.getElementById('replyIndicator');
    
    if (parentInput && messageInput && indicator) {
        parentInput.value = '';
        messageInput.placeholder = 'Type your message...';
        indicator.classList.add('d-none');
    }
}

// Edit message
function editMessage(chatId, currentMessage) {
    Swal.fire({
        title: 'Edit Message',
        input: 'textarea',
        inputValue: currentMessage,
        inputPlaceholder: 'Edit your message...',
        inputAttributes: {
            'aria-label': 'Edit message'
        },
        inputValidator: (value) => {
            if (!value || !value.trim()) {
                return 'Message cannot be empty!';
            }
        },
        showCancelButton: true,
        confirmButtonText: 'Save Changes',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#0d6efd',
        cancelButtonColor: '#6c757d',
        background: document.body.classList.contains('theme-dark') ? '#2d2d2d' : '#ffffff',
        color: document.body.classList.contains('theme-dark') ? '#ffffff' : '#1f2937'
    }).then((result) => {
        if (result.isConfirmed && result.value.trim() !== currentMessage) {
            const form = document.getElementById(`edit-form-${chatId}`);
            if (form) {
                form.querySelector('input[name="message"]').value = result.value.trim();
                form.submit();
            }
        }
    });
}

// Auto-refresh chat (optional - bisa diaktifkan jika ingin real-time)
let autoRefreshInterval;
let lastMessageCount = 0;

function startAutoRefresh(forumId) {
    // Hitung jumlah pesan awal
    lastMessageCount = document.querySelectorAll('.chat-message').length;
    
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    
    autoRefreshInterval = setInterval(() => {
        // Cek pesan baru tanpa reload
        fetch(`/chat/forum/${forumId}?ajax=1`)
            .then(response => response.text())
            .then(html => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const newMessages = doc.querySelectorAll('.chat-message');
                
                if (newMessages.length > lastMessageCount) {
                    // Ada pesan baru, reload halaman
                    location.reload();
                }
            })
            .catch(err => console.error('Auto-refresh error:', err));
    }, 10000); // Cek setiap 10 detik
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// Theme toggle
function toggleTheme() {
    const currentTheme = document.body.classList.contains('theme-dark') ? 'dark' : 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    fetch('/profile/update', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `theme=${newTheme}`
    })
    .then(() => {
        location.reload();
    })
    .catch(err => console.error('Theme toggle error:', err));
}

// Scroll functions
function scrollToBottom() {
    const container = document.querySelector('.chat-container');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

function scrollToMessage(messageId) {
    const message = document.querySelector(`[data-message-id="${messageId}"]`);
    if (message) {
        message.scrollIntoView({ behavior: 'smooth', block: 'center' });
        message.style.backgroundColor = 'var(--highlight-bg)';
        setTimeout(() => {
            message.style.backgroundColor = '';
        }, 2000);
    }
}

// Format timestamp
function formatTimestamp(date) {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    
    // Less than 1 minute
    if (diff < 60000) {
        return 'Just now';
    }
    // Less than 1 hour
    if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
    // Less than 24 hours
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    // Default format
    return d.toLocaleString();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on a chat page
    const forumId = document.getElementById('forum-id')?.value;
    if (forumId) {
        startAutoRefresh(forumId);
        scrollToBottom();
    }
    
    // Add search listener with debounce
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('keyup', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(highlightSearch, 500);
        });
        
        // Add enter key handler
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                highlightSearch();
            }
        });
    }
    
    // Add cancel reply button if exists
    const cancelBtn = document.getElementById('cancelReply');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', cancelReply);
    }
    
    // Auto-resize textarea if using textarea instead of input
    const messageInput = document.getElementById('messageInput');
    if (messageInput && messageInput.tagName === 'TEXTAREA') {
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
    }
    
    // Format all timestamps
    document.querySelectorAll('.timestamp').forEach(el => {
        const date = el.getAttribute('data-timestamp');
        if (date) {
            el.textContent = formatTimestamp(date);
        }
    });
});

// Clean up on page unload
window.addEventListener('beforeunload', function() {
    stopAutoRefresh();
});

// Export functions for global use
window.highlightSearch = highlightSearch;
window.clearSearch = clearSearch;
window.replyTo = replyTo;
window.cancelReply = cancelReply;
window.editMessage = editMessage;
window.toggleTheme = toggleTheme;
window.scrollToBottom = scrollToBottom;
window.scrollToMessage = scrollToMessage;