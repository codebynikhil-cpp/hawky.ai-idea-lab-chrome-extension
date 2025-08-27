// Saved Posts JavaScript
let allPosts = [];
let filteredPosts = [];
let currentFilter = 'all';

// DOM elements
const loadingState = document.getElementById('loadingState');
const postsContainer = document.getElementById('postsContainer');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const filterButtons = document.querySelectorAll('.filter-btn');

// Stats elements
const totalPostsEl = document.getElementById('totalPosts');
const instagramPostsEl = document.getElementById('instagramPosts');
const facebookPostsEl = document.getElementById('facebookPosts');
const linkedinPostsEl = document.getElementById('linkedinPosts');

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    loadSavedPosts();
    setupEventListeners();
});

// Load saved posts from background script
function loadSavedPosts() {
    chrome.runtime.sendMessage({ action: 'getSavedPosts' }, (response) => {
        if (response && Array.isArray(response)) {
            allPosts = response;
            filteredPosts = [...allPosts];
            updateStats();
            renderPosts();
        } else {
            allPosts = [];
            filteredPosts = [];
            updateStats();
            renderPosts();
        }
        
        loadingState.style.display = 'none';
        
        if (allPosts.length === 0) {
            emptyState.style.display = 'block';
            postsContainer.style.display = 'none';
        } else {
            emptyState.style.display = 'none';
            postsContainer.style.display = 'grid';
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    // Search functionality
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    
    // Filter buttons
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            applyFilters();
        });
    });

    // Handle view original post button clicks
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('view-btn')) {
            const url = e.target.getAttribute('onclick').match(/'([^']+)'/)[1];
            if (url && url !== 'undefined') {
                window.open(url, '_blank', 'noopener,noreferrer');
            }
        }
    });

    // Handle direct link clicks
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('post-link')) {
            e.preventDefault();
            const url = e.target.href;
            if (url && url !== 'undefined') {
                window.open(url, '_blank', 'noopener,noreferrer');
            }
        }
    });
}

// Handle search
function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    applyFilters(searchTerm);
}

// Apply filters and search
function applyFilters(searchTerm = '') {
    filteredPosts = allPosts.filter(post => {
        // Platform filter
        const platformMatch = currentFilter === 'all' || post.platform === currentFilter;
        
        // Search filter
        const searchMatch = searchTerm === '' || 
            (post.author && post.author.toLowerCase().includes(searchTerm)) ||
            (post.content && post.content.toLowerCase().includes(searchTerm)) ||
            (post.platform && post.platform.toLowerCase().includes(searchTerm));
        
        return platformMatch && searchMatch;
    });
    
    renderPosts();
}

// Update statistics
function updateStats() {
    const stats = {
        total: allPosts.length,
        Instagram: allPosts.filter(p => p.platform === 'Instagram').length,
        Facebook: allPosts.filter(p => p.platform === 'Facebook').length,
        LinkedIn: allPosts.filter(p => p.platform === 'LinkedIn').length
    };
    
    totalPostsEl.textContent = stats.total;
    instagramPostsEl.textContent = stats.Instagram;
    facebookPostsEl.textContent = stats.Facebook;
    linkedinPostsEl.textContent = stats.LinkedIn;
}

// Render posts
function renderPosts() {
    if (filteredPosts.length === 0) {
        if (allPosts.length === 0) {
            emptyState.style.display = 'block';
            postsContainer.style.display = 'none';
        } else {
            postsContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: white; padding: 40px;"><h3>No posts match your search criteria</h3><p>Try adjusting your search or filter settings</p></div>';
            postsContainer.style.display = 'grid';
            emptyState.style.display = 'none';
        }
        return;
    }
    
    emptyState.style.display = 'none';
    postsContainer.style.display = 'grid';
    
    postsContainer.innerHTML = filteredPosts.map(post => createPostCard(post)).join('');
    
    // Add event listeners to action buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const postId = e.target.dataset.postId;
            deletePost(postId);
        });
    });
}

// Update the createPostCard function to handle post links better
function createPostCard(post) {
    const formattedDate = formatDate(post.savedAt || post.time);
    const platformClass = `platform-${post.platform.toLowerCase()}`;
    const hasImage = post.imageDataUrl && post.imageDataUrl !== 'undefined';
    const hasVideo = post.videoUrl && post.videoUrl !== 'undefined';
    
    // Get the post URL from multiple possible sources
    const postUrl = post.metadata?.originalLink || post.postUrl || post.directLink || post.url;
    const hasUrl = postUrl && postUrl !== 'undefined';
    
    // Get caption from metadata if available, otherwise use direct caption
    const caption = post.metadata?.originalCaption || post.caption || post.content;
    
    return `
        <div class="post-card">
            ${hasVideo ? `
                <video controls class="post-media" preload="metadata">
                    <source src="${post.videoUrl}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            ` : hasImage ? `
                <img src="${post.imageDataUrl}" alt="Post screenshot" class="post-media" onerror="this.style.display='none'">
            ` : ''}
            
            <div class="post-content">
                <div class="post-header">
                    <div>
                        <div class="post-author">${escapeHtml(post.author || 'Unknown Author')}</div>
                        <span class="post-platform ${platformClass}">${post.platform || 'Unknown'}</span>
                    </div>
                </div>
                ${caption ? `
                    <div class="post-text">
                        ${escapeHtml(caption)}
                        ${hasUrl ? `
                            <a href="${postUrl}" 
                               target="_blank" 
                               class="post-link"
                               rel="noopener noreferrer">
                                View original post
                            </a>
                        ` : ''}
                    </div>
                ` : ''}
                <div class="post-footer">
                    <div class="post-date">${formattedDate}</div>
                    <div class="post-actions">
                        ${hasUrl ? `
                            <button class="action-btn view-btn" 
                                    onclick="window.open('${postUrl}', '_blank', 'noopener,noreferrer')"
                                    title="Open original post">
                                View Original
                            </button>
                        ` : ''}
                        <button class="action-btn delete-btn" 
                                data-post-id="${post.id}"
                                title="Delete saved post">
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Delete post
function deletePost(postId) {
    if (confirm('Are you sure you want to delete this saved post?')) {
        chrome.runtime.sendMessage({ 
            action: 'deleteSavedPost', 
            postId: postId 
        }, (response) => {
            if (response && response.status === 'success') {
                // Remove from local arrays
                allPosts = allPosts.filter(post => post.id !== postId);
                filteredPosts = filteredPosts.filter(post => post.id !== postId);
                
                // Refresh the posts display
                
                // Update UI
                updateStats();
                renderPosts();
                
                // Show success message
                showNotification('Post deleted successfully', 'success');
            } else {
                showNotification('Failed to delete post', 'error');
            }
        });
    }
}

// Format date
function formatDate(dateString) {
    if (!dateString) return 'Unknown date';
    
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString();
        }
    } catch (error) {
        return 'Unknown date';
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        background-color: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
    `;
    notification.textContent = message;
    
    // Add slide-in animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
        style.remove();
    }, 3000);
}

// Refresh posts (can be called from popup or other parts)
function refreshPosts() {
    loadingState.style.display = 'block';
    postsContainer.style.display = 'none';
    emptyState.style.display = 'none';
    loadSavedPosts();
}

// Export functions for potential use by other scripts
window.savedPostsApp = {
    refreshPosts,
    loadSavedPosts
};
