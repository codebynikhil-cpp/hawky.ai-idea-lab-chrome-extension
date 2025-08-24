// Hawky.xyz Website Integration Script
// This script should be added to your hawky.xyz website to receive saved posts from the Chrome extension

(function() {
    'use strict';
    
    // Configuration
    const HAWKY_CONFIG = {
        apiEndpoint: '/api/extension/saved-posts',
        storageKey: 'hawkyExtensionPosts',
        containerId: 'hawky-saved-posts-container'
    };
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeHawkyIntegration);
    } else {
        initializeHawkyIntegration();
    }
    
    function initializeHawkyIntegration() {
        console.log('Hawky.xyz integration initialized');
        
        // Listen for extension messages
        window.addEventListener('message', handleExtensionMessage);
        
        // Listen for custom events from extension
        window.addEventListener('hawkyPostsReceived', handlePostsReceived);
        
        // Check for existing data in sessionStorage
        checkForExistingData();
        
        // Create saved posts section if on the right page
        if (window.location.pathname.includes('saved-posts') || 
            window.location.hash.includes('saved-posts')) {
            createSavedPostsSection();
        }
    }
    
    function handleExtensionMessage(event) {
        // Verify origin for security
        if (event.origin !== window.location.origin) return;
        
        if (event.data && event.data.action === 'receiveSavedPosts') {
            console.log('Received saved posts from extension:', event.data.data);
            displaySavedPosts(event.data.data);
        }
    }
    
    function handlePostsReceived(event) {
        console.log('Custom event received with posts:', event.detail);
        displaySavedPosts(event.detail);
    }
    
    function checkForExistingData() {
        const storedData = sessionStorage.getItem(HAWKY_CONFIG.storageKey);
        if (storedData) {
            try {
                const posts = JSON.parse(storedData);
                console.log('Found existing posts in sessionStorage:', posts);
                displaySavedPosts(posts);
                // Clear after use
                sessionStorage.removeItem(HAWKY_CONFIG.storageKey);
            } catch (error) {
                console.error('Error parsing stored posts:', error);
            }
        }
    }
    
    function createSavedPostsSection() {
        // Check if container already exists
        if (document.getElementById(HAWKY_CONFIG.containerId)) return;
        
        // Create main container
        const container = document.createElement('div');
        container.id = HAWKY_CONFIG.containerId;
        container.innerHTML = `
            <div class="hawky-saved-posts">
                <div class="hawky-header">
                    <h1>🦅 Your Saved Posts</h1>
                    <p>Posts captured from social media using Hawky Chrome Extension</p>
                </div>
                <div class="hawky-stats" id="hawky-stats">
                    <div class="stat-card">
                        <span class="stat-number" id="total-posts">0</span>
                        <span class="stat-label">Total Posts</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number" id="instagram-posts">0</span>
                        <span class="stat-label">Instagram</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number" id="facebook-posts">0</span>
                        <span class="stat-label">Facebook</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number" id="linkedin-posts">0</span>
                        <span class="stat-label">LinkedIn</span>
                    </div>
                </div>
                <div class="hawky-controls">
                    <input type="text" id="hawky-search" placeholder="Search your saved posts..." />
                    <div class="hawky-filters">
                        <button class="filter-btn active" data-filter="all">All</button>
                        <button class="filter-btn" data-filter="Instagram">Instagram</button>
                        <button class="filter-btn" data-filter="Facebook">Facebook</button>
                        <button class="filter-btn" data-filter="LinkedIn">LinkedIn</button>
                    </div>
                </div>
                <div class="hawky-posts-grid" id="hawky-posts-grid">
                    <div class="hawky-loading">
                        <div class="spinner"></div>
                        <p>Waiting for posts from Chrome extension...</p>
                    </div>
                </div>
            </div>
        `;
        
        // Add styles
        addHawkyStyles();
        
        // Insert into page (adjust selector based on your website structure)
        const targetElement = document.querySelector('main') || 
                            document.querySelector('.content') || 
                            document.body;
        targetElement.appendChild(container);
        
        // Setup event listeners
        setupEventListeners();
    }
    
    function addHawkyStyles() {
        if (document.getElementById('hawky-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'hawky-styles';
        styles.textContent = `
            .hawky-saved-posts {
                max-width: 1200px;
                margin: 0 auto;
                padding: 20px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            .hawky-header {
                text-align: center;
                margin-bottom: 40px;
            }
            
            .hawky-header h1 {
                font-size: 2.5rem;
                margin-bottom: 10px;
                color: #333;
            }
            
            .hawky-header p {
                color: #666;
                font-size: 1.1rem;
            }
            
            .hawky-stats {
                display: flex;
                justify-content: center;
                gap: 20px;
                margin-bottom: 30px;
                flex-wrap: wrap;
            }
            
            .stat-card {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 20px;
                border-radius: 12px;
                text-align: center;
                min-width: 120px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            }
            
            .stat-number {
                display: block;
                font-size: 2rem;
                font-weight: bold;
                margin-bottom: 5px;
            }
            
            .stat-label {
                font-size: 0.9rem;
                opacity: 0.9;
            }
            
            .hawky-controls {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 30px;
                gap: 20px;
                flex-wrap: wrap;
            }
            
            #hawky-search {
                flex: 1;
                max-width: 400px;
                padding: 12px 20px;
                border: 2px solid #ddd;
                border-radius: 25px;
                font-size: 16px;
                outline: none;
                transition: border-color 0.3s ease;
            }
            
            #hawky-search:focus {
                border-color: #667eea;
            }
            
            .hawky-filters {
                display: flex;
                gap: 10px;
            }
            
            .filter-btn {
                padding: 10px 20px;
                border: 2px solid #667eea;
                border-radius: 20px;
                background: white;
                color: #667eea;
                cursor: pointer;
                transition: all 0.3s ease;
                font-weight: 500;
            }
            
            .filter-btn:hover,
            .filter-btn.active {
                background: #667eea;
                color: white;
                transform: translateY(-2px);
            }
            
            .hawky-posts-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
                gap: 25px;
            }
            
            .hawky-loading {
                grid-column: 1 / -1;
                text-align: center;
                padding: 60px 20px;
                color: #666;
            }
            
            .spinner {
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #667eea;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .hawky-post-card {
                background: white;
                border-radius: 15px;
                overflow: hidden;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                transition: all 0.3s ease;
            }
            
            .hawky-post-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
            }
            
            .hawky-post-image {
                width: 100%;
                height: 200px;
                object-fit: cover;
                background: #f5f5f5;
            }
            
            .hawky-post-content {
                padding: 20px;
            }
            
            .hawky-post-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 15px;
            }
            
            .hawky-post-author {
                font-weight: bold;
                color: #333;
                margin-bottom: 5px;
            }
            
            .hawky-post-platform {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 500;
                text-transform: uppercase;
                color: white;
            }
            
            .platform-instagram {
                background: linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%);
            }
            
            .platform-facebook {
                background: #1877f2;
            }
            
            .platform-linkedin {
                background: #0077b5;
            }
            
            .hawky-post-text {
                color: #666;
                line-height: 1.5;
                margin-bottom: 15px;
                display: -webkit-box;
                -webkit-line-clamp: 3;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
            
            .hawky-post-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding-top: 15px;
                border-top: 1px solid #eee;
            }
            
            .hawky-post-date {
                color: #999;
                font-size: 14px;
            }
            
            .hawky-post-actions {
                display: flex;
                gap: 10px;
            }
            
            .hawky-action-btn {
                padding: 8px 16px;
                border: none;
                border-radius: 20px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 500;
                transition: all 0.3s ease;
            }
            
            .hawky-view-btn {
                background: #4285f4;
                color: white;
            }
            
            .hawky-action-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }
            
            @media (max-width: 768px) {
                .hawky-posts-grid {
                    grid-template-columns: 1fr;
                }
                
                .hawky-controls {
                    flex-direction: column;
                }
                
                .hawky-stats {
                    flex-direction: column;
                    gap: 15px;
                }
                
                .hawky-header h1 {
                    font-size: 2rem;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    function setupEventListeners() {
        const searchInput = document.getElementById('hawky-search');
        const filterButtons = document.querySelectorAll('.filter-btn');
        
        if (searchInput) {
            searchInput.addEventListener('input', debounce(handleSearch, 300));
        }
        
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                filterPosts(btn.dataset.filter);
            });
        });
    }
    
    let allPosts = [];
    let currentFilter = 'all';
    
    function displaySavedPosts(posts) {
        allPosts = posts || [];
        updateStats();
        renderPosts();
    }
    
    function updateStats() {
        const stats = {
            total: allPosts.length,
            Instagram: allPosts.filter(p => p.platform === 'Instagram').length,
            Facebook: allPosts.filter(p => p.platform === 'Facebook').length,
            LinkedIn: allPosts.filter(p => p.platform === 'LinkedIn').length
        };
        
        const totalEl = document.getElementById('total-posts');
        const instagramEl = document.getElementById('instagram-posts');
        const facebookEl = document.getElementById('facebook-posts');
        const linkedinEl = document.getElementById('linkedin-posts');
        
        if (totalEl) totalEl.textContent = stats.total;
        if (instagramEl) instagramEl.textContent = stats.Instagram;
        if (facebookEl) facebookEl.textContent = stats.Facebook;
        if (linkedinEl) linkedinEl.textContent = stats.LinkedIn;
    }
    
    function renderPosts() {
        const grid = document.getElementById('hawky-posts-grid');
        if (!grid) return;
        
        if (allPosts.length === 0) {
            grid.innerHTML = `
                <div class="hawky-loading">
                    <div style="font-size: 4rem; margin-bottom: 20px;">📱</div>
                    <h3>No saved posts yet</h3>
                    <p>Use the Hawky Chrome Extension to save posts from Instagram, Facebook, and LinkedIn!</p>
                </div>
            `;
            return;
        }
        
        const filteredPosts = filterPostsBySearch(allPosts);
        
        grid.innerHTML = filteredPosts.map(post => createPostHTML(post)).join('');
        
        // Add event listeners to view buttons
        grid.querySelectorAll('.hawky-view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const url = e.target.dataset.url;
                if (url && url !== 'undefined') {
                    window.open(url, '_blank');
                }
            });
        });
    }
    
    function createPostHTML(post) {
        const formattedDate = formatDate(post.savedAt || post.time);
        const platformClass = `platform-${post.platform.toLowerCase()}`;
        const hasImage = post.imageDataUrl && post.imageDataUrl !== 'undefined';
        const hasUrl = post.url && post.url !== 'undefined';
        
        return `
            <div class="hawky-post-card">
                ${hasImage ? `<img src="${post.imageDataUrl}" alt="Post screenshot" class="hawky-post-image" onerror="this.style.display='none'">` : ''}
                <div class="hawky-post-content">
                    <div class="hawky-post-header">
                        <div>
                            <div class="hawky-post-author">${escapeHtml(post.author || 'Unknown Author')}</div>
                            <span class="hawky-post-platform ${platformClass}">${post.platform || 'Unknown'}</span>
                        </div>
                    </div>
                    ${post.content ? `<div class="hawky-post-text">${escapeHtml(post.content)}</div>` : ''}
                    <div class="hawky-post-footer">
                        <div class="hawky-post-date">${formattedDate}</div>
                        <div class="hawky-post-actions">
                            ${hasUrl ? `<button class="hawky-action-btn hawky-view-btn" data-url="${post.url}">View Original</button>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    function handleSearch() {
        renderPosts();
    }
    
    function filterPosts(filter) {
        currentFilter = filter;
        renderPosts();
    }
    
    function filterPostsBySearch(posts) {
        const searchTerm = document.getElementById('hawky-search')?.value.toLowerCase().trim() || '';
        
        return posts.filter(post => {
            // Platform filter
            const platformMatch = currentFilter === 'all' || post.platform === currentFilter;
            
            // Search filter
            const searchMatch = searchTerm === '' || 
                (post.author && post.author.toLowerCase().includes(searchTerm)) ||
                (post.content && post.content.toLowerCase().includes(searchTerm)) ||
                (post.platform && post.platform.toLowerCase().includes(searchTerm));
            
            return platformMatch && searchMatch;
        });
    }
    
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
    
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
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
    
    // Export for external use
    window.HawkyIntegration = {
        displaySavedPosts,
        createSavedPostsSection
    };
    
})();
