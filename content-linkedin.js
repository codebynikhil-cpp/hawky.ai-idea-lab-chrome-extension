const createHforPostButton = (forButton) => {
    const button = document.createElement('button');
    const img = document.createElement('img');
    img.src = chrome.runtime.getURL('icons/icon48.png');
    img.style.cssText = `
        width: 20px;
        height: 20px;
        display: block;
        object-fit: contain;
    `;
    img.className = 'h-icon';
    img.alt = 'Hawky.ai';
    
    // Ensure image loads properly
    img.onerror = function() {
        console.error('Failed to load Hawky icon');
        // Fallback to text if image fails
        button.innerHTML = 'H';
        button.style.fontSize = '14px';
        button.style.fontWeight = 'bold';
        button.style.color = '#0073b1';
    };
    
    button.appendChild(img);
    button.style.cssText = `
        position: absolute;
        z-index: 9999;
        right: ${forButton === 'single' ? '16' : '0'}px;
        top: ${forButton === 'single' ? '2' : '-10'}px;
        background-color: rgba(255, 255, 255, 0.9);
        border: 2px solid #0073b1;
        border-radius: 50%;
        width: 28px;
        height: 28px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        transition: all 0.2s ease;
    `;
    
    // Add hover effect
    button.addEventListener('mouseenter', () => {
        button.style.transform = 'scale(1.1)';
        button.style.backgroundColor = '#0073b1';
        button.style.borderColor = '#0073b1';
        if (img.style.display !== 'none') {
            img.style.filter = 'brightness(0) invert(1)';
        } else {
            button.style.color = 'white';
        }
    });
    
    button.addEventListener('mouseleave', () => {
        button.style.transform = 'scale(1)';
        button.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        button.style.borderColor = '#0073b1';
        if (img.style.display !== 'none') {
            img.style.filter = 'none';
        } else {
            button.style.color = '#0073b1';
        }
    });
    
    return button;
};

const sendToLinkedInFeed = (details) => {
    console.log('Post details:', details);
    const domain = new URL(window.location.href).hostname;
    
    // Get post URL - try multiple sources
    const postUrl = details.link || details.postUrl || window.location.href;
    const caption = details.caption || details.content || '';
    
    // Format caption to include link
    const formattedCaption = `${caption}\n\nOriginal post: ${postUrl}`;
    
    chrome.runtime.sendMessage({
        ...details,
        action: 'addToFeed',
        time: new Date().toISOString(),
        domainName: domain,
        platform: 'LinkedIn',
        isSaved: true,
        postUrl: postUrl,
        caption: formattedCaption,
        metadata: {
            originalLink: postUrl,
            originalCaption: caption,
            captureTime: new Date().toISOString(),
            platform: 'LinkedIn'
        }
    }, response => {
        if (response.status === "success") {
            console.log("Item added to feed successfully");
            showSaveConfirmation();
        }
    });
};

// Feed posts extraction functions
const extractAuthorFeed = (postContainer) => {
    const selectors = [
        // Updated LinkedIn 2024 selectors
        'span.feed-shared-actor__name',
        'span.update-components-actor__name',
        'span.update-components-actor__title',
        // Link text selectors
        'a.app-aware-link strong',
        '.update-components-actor__meta a',
        '.feed-shared-actor__container a',
        // Direct name selectors
        'span.feed-shared-actor__title span',
        'span.update-components-actor__name span',
        // Article author
        '.article-author-info__name',
        // Nested selectors
        '.feed-shared-actor__container span[dir="ltr"]',
        '.update-components-actor__meta span[dir="ltr"]',
        // New post header selectors
        '.update-components-header span[dir="ltr"]',
        '.update-components-header__text-link'
    ];
    
    for (const selector of selectors) {
        const authorElement = postContainer.querySelector(selector);
        if (authorElement && authorElement.textContent) {
            // Clean up the author name
            let authorName = authorElement.textContent.trim();
            
            // Remove common LinkedIn action text and emojis
            authorName = authorName
                .replace(/Follow|Message|Connect|• [0-9].+|• Following/gi, '')
                .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Remove emojis
                .replace(/\s+/g, ' ') // Remove extra spaces
                .trim();
                
            if (authorName && authorName.length > 1) {
                return authorName;
            }
        }
    }

    // Try data attributes
    const actorElement = postContainer.querySelector('[data-actor-name], [data-attribution-title]');
    if (actorElement) {
        const name = actorElement.getAttribute('data-actor-name') || 
                    actorElement.getAttribute('data-attribution-title');
        if (name) return name.trim();
    }

    // Try finding in link href
    const profileLink = postContainer.querySelector('a[href*="/in/"]');
    if (profileLink) {
        const nameFromLink = profileLink.textContent.trim();
        if (nameFromLink && nameFromLink.length > 1) {
            return nameFromLink;
        }
    }

    return 'Unknown';
};

const extractDateFeed = (postContainer) => {
    const selectors = [
        '.feed-shared-actor__sub-description time',
        '.update-components-actor__sub-description time',
        'time.visually-hidden',
        '.feed-shared-actor__sub-description span'
    ];
    
    for (const selector of selectors) {
        const dateElement = postContainer.querySelector(selector);
        if (dateElement && dateElement.textContent.trim()) {
            return dateElement.textContent.trim();
        }
    }
    return 'Unknown';
};

const extractContentFeed = (postContainer) => {
    const selectors = [
        '.feed-shared-text span[dir="ltr"]',
        '.update-components-text span',
        '.feed-shared-update-v2__description span',
        '.feed-shared-text'
    ];
    
    for (const selector of selectors) {
        const contentElement = postContainer.querySelector(selector);
        if (contentElement && contentElement.textContent.trim()) {
            return contentElement.textContent.trim();
        }
    }
    return 'No content';
};

const extractImageUrlFeed = (postContainer) => {
    const selectors = [
        '.feed-shared-image img',
        '.update-components-image img',
        '.feed-shared-article__image img',
        'img[src*="media.licdn.com"]'
    ];
    
    for (const selector of selectors) {
        const imageElement = postContainer.querySelector(selector);
        if (imageElement && imageElement.src && !imageElement.src.includes('profile') && !imageElement.src.includes('icon')) {
            // Try canvas conversion for data URL
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = imageElement.width || imageElement.naturalWidth;
                canvas.height = imageElement.height || imageElement.naturalHeight;
                
                ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
                return canvas.toDataURL('image/png');
            } catch (error) {
                console.warn('Canvas conversion failed, using image URL:', error);
                return imageElement.src;
            }
        }
    }
    return 'No image';
};

const extractLinkFeed = (postContainer) => {
    const selectors = [
        'a.app-aware-link[href*="/feed/update/"]',
        'a[href*="/posts/"]',
        'a[href*="/activity-"]',
        '.feed-shared-actor time'
    ];
    
    for (const selector of selectors) {
        const linkElement = postContainer.querySelector(selector);
        if (linkElement && linkElement.href) {
            // Clean the URL (remove tracking parameters)
            try {
                const url = new URL(linkElement.href);
                // Keep only essential parts of the URL
                return `${url.origin}${url.pathname}`;
            } catch (e) {
                return linkElement.href;
            }
        }
    }
    
    // Fallback to current URL if no specific link found
    return window.location.href;
};

const extractCaptionFeed = (postContainer) => {
    const selectors = [
        '.feed-shared-text span[dir="ltr"]',
        '.update-components-text span',
        '.feed-shared-update-v2__description'
    ];
    
    for (const selector of selectors) {
        const captionElement = postContainer.querySelector(selector);
        if (captionElement && captionElement.textContent.trim()) {
            return captionElement.textContent.trim();
        }
    }
    return 'No caption';
};

const extractLikesFeed = (postContainer) => {
    const selectors = [
        '.social-counts-reactions__count',
        '.feed-shared-social-action-bar__reaction-count',
        'button[aria-label*="reaction"] span'
    ];
    
    for (const selector of selectors) {
        const likesElement = postContainer.querySelector(selector);
        if (likesElement && likesElement.textContent.trim()) {
            return likesElement.textContent.trim();
        }
    }
    return 'Unknown';
};

// Single post extraction functions
const extractAuthorSinglePost = (postContainer) => {
    const selectors = [
        // Profile name in feed
        '.feed-shared-actor__name',
        '.update-components-actor__name',
        'h1 span[aria-hidden="true"]',
        // Additional selectors for different post types
        '.update-components-actor__title',
        'a.app-aware-link span[dir="ltr"]',
        '.feed-shared-actor__title',
        // Fallback selectors
        'a[data-control-name="actor"] span[dir="ltr"]',
        '.feed-shared-actor__container a[href*="/in/"] span',
        '.update-components-actor__meta a[href*="/in/"] span',
        // Article author
        '.article-author-info__name',
        // Profile name in single post view
        '.base-main-card__header .link-without-hover-state span'
    ];
    
    for (const selector of selectors) {
        const authorElement = postContainer.querySelector(selector);
        if (authorElement && authorElement.textContent.trim()) {
            // Clean up the author name
            let authorName = authorElement.textContent.trim();
            // Remove any "Follow" or other action text that might be included
            authorName = authorName.replace(/Follow|Message|Connect/gi, '').trim();
            return authorName;
        }
    }

    // Try finding nested author information
    const nestedAuthorElement = postContainer.querySelector('[data-attribution-title]');
    if (nestedAuthorElement) {
        return nestedAuthorElement.getAttribute('data-attribution-title').trim();
    }

    // Try finding author in metadata
    const metaAuthor = document.querySelector('meta[name="author"]');
    if (metaAuthor) {
        return metaAuthor.content.trim();
    }

    return 'Unknown';
};

const extractDateSinglePost = (postContainer) => {
    const selectors = [
        'time',
        '.feed-shared-actor__sub-description time',
        '.update-components-actor__sub-description'
    ];
    
    for (const selector of selectors) {
        const dateElement = postContainer.querySelector(selector);
        if (dateElement && dateElement.textContent.trim()) {
            return dateElement.textContent.trim();
        }
    }
    return 'Unknown';
};

const extractContentSinglePost = (postContainer) => {
    const selectors = [
        '.feed-shared-text',
        '.update-components-text',
        '.feed-shared-update-v2__description'
    ];
    
    let contents = [];
    for (const selector of selectors) {
        const elements = postContainer.querySelectorAll(selector);
        elements.forEach(el => {
            const text = el.textContent.trim();
            if (text && !contents.includes(text)) {
                contents.push(text);
            }
        });
    }
    
    return contents.length > 0 ? contents.join('\n\n') : 'No content';
};

const extractImageUrlSinglePost = (postContainer) => {
    const selectors = [
        '.feed-shared-image img',
        '.update-components-image img',
        'img[src*="media.licdn.com"]'
    ];
    
    for (const selector of selectors) {
        const imageElement = postContainer.querySelector(selector);
        if (imageElement && !imageElement.src.includes('profile') && !imageElement.src.includes('icon')) {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = imageElement.width || imageElement.naturalWidth;
                canvas.height = imageElement.height || imageElement.naturalHeight;
                
                ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
                return canvas.toDataURL('image/png');
            } catch (error) {
                console.warn('Canvas conversion failed, using image URL:', error);
                return imageElement.src;
            }
        }
    }
    return 'No image';
};

const extractLinkSinglePost = () => {
    return window.location.href;
};

const extractCaptionSinglePost = (postContainer) => {
    const selectors = [
        '.feed-shared-text span',
        '.update-components-text',
        '.feed-shared-update-v2__description'
    ];
    
    for (const selector of selectors) {
        const captionElement = postContainer.querySelector(selector);
        if (captionElement && captionElement.textContent.trim()) {
            return captionElement.textContent.trim();
        }
    }
    return 'No caption';
};

const extractLikesSinglePost = (postContainer) => {
    const selectors = [
        '.social-counts-reactions__count',
        'button[aria-label*="reaction"] span',
        '.feed-shared-social-action-bar__reaction-count'
    ];
    
    for (const selector of selectors) {
        const likesElement = postContainer.querySelector(selector);
        if (likesElement) {
            const likesText = likesElement.textContent.trim();
            return likesText.replace(/,/g, ''); // Remove commas if present
        }
    }
    return 'Unknown';
};

const handleHButtonClick = (event, postContainer, isSinglePost) => {
    event.preventDefault();
    event.stopPropagation();

    const postDetails = {};

    if (isSinglePost) {
        postDetails.author = extractAuthorSinglePost(postContainer);
        postDetails.date = extractDateSinglePost(postContainer);
        postDetails.content = extractContentSinglePost(postContainer);
        postDetails.imageDataUrl = extractImageUrlSinglePost(postContainer);
        postDetails.link = extractLinkSinglePost();
        postDetails.caption = extractCaptionSinglePost(postContainer);
        postDetails.likes = extractLikesSinglePost(postContainer);
    } else {
        postDetails.author = extractAuthorFeed(postContainer);
        postDetails.date = extractDateFeed(postContainer);
        postDetails.content = extractContentFeed(postContainer);
        postDetails.imageDataUrl = extractImageUrlFeed(postContainer);
        postDetails.link = extractLinkFeed(postContainer);
        postDetails.caption = extractCaptionFeed(postContainer);
        postDetails.likes = extractLikesFeed(postContainer);
    }

    // Create a preview of the post
    createPostPreview(postDetails);
    
    // Send to feed
    sendToLinkedInFeed(postDetails);
};

// Create a visual preview of the saved post
const createPostPreview = (postData) => {
    // Remove any existing preview
    const existingPreview = document.querySelector('.hawky-post-preview');
    if (existingPreview) existingPreview.remove();
    
    // Create preview container
    const previewContainer = document.createElement('div');
    previewContainer.className = 'hawky-post-preview';
    previewContainer.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        padding: 16px;
        z-index: 10001;
        max-width: 400px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
    `;
    
    // Create preview content
    const previewContent = document.createElement('div');
    
    // Add author
    const authorEl = document.createElement('div');
    authorEl.style.cssText = 'font-weight: bold; margin-bottom: 8px;';
    authorEl.textContent = postData.author || 'Unknown Author';
    previewContent.appendChild(authorEl);
    
    // Add caption/content with link
    if (postData.caption || postData.content) {
        const contentEl = document.createElement('div');
        contentEl.style.cssText = 'margin-bottom: 12px;';
        
        // Add caption/content
        const textContent = document.createElement('div');
        textContent.textContent = postData.caption || postData.content;
        contentEl.appendChild(textContent);
        
        // Add link separately
        if (postData.link || postData.postUrl) {
            const linkEl = document.createElement('a');
            linkEl.href = postData.link || postData.postUrl;
            linkEl.textContent = 'View original post';
            linkEl.target = '_blank';
            linkEl.style.cssText = `
                display: block;
                margin-top: 8px;
                color: #0073b1;
                text-decoration: underline;
            `;
            contentEl.appendChild(linkEl);
        }
        
        previewContent.appendChild(contentEl);
    }
    
    // Add image if available
    if (postData.imageDataUrl) {
        const imageEl = document.createElement('img');
        imageEl.src = postData.imageDataUrl;
        imageEl.style.cssText = 'max-width: 100%; border-radius: 4px; margin-bottom: 12px;';
        previewContent.appendChild(imageEl);
    }
    
    // Add success message
    const messageEl = document.createElement('div');
    messageEl.style.cssText = 'color: #4CAF50; font-weight: bold; text-align: center; margin-top: 12px;';
    messageEl.textContent = 'Your LinkedIn post is saved successfully!';
    previewContent.appendChild(messageEl);
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.cssText = `
        background-color: #0073b1;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 8px 16px;
        margin-top: 12px;
        cursor: pointer;
        width: 100%;
    `;
    closeButton.addEventListener('click', () => previewContainer.remove());
    previewContent.appendChild(closeButton);
    
    // Update the saved posts link handling
    const savedPostsLink = document.createElement('a');
    savedPostsLink.textContent = 'View all saved posts';
    savedPostsLink.style.cssText = `
        display: block;
        text-align: center;
        margin-top: 8px;
        color: #0073b1;
        text-decoration: underline;
        cursor: pointer;
    `;
    
    // Remove the direct href and handle click event instead
    savedPostsLink.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Send message to background script to open saved posts
        chrome.runtime.sendMessage({
            action: 'openSavedPosts',
            timestamp: Date.now() // Add timestamp to ensure unique message
        }, (response) => {
            if (response && response.success) {
                previewContainer.remove();
            }
        });
    });

    previewContent.appendChild(savedPostsLink);
    
    // Add content to container
    previewContainer.appendChild(previewContent);
    
    // Add to page
    document.body.appendChild(previewContainer);
    
    // Close on click outside
    document.addEventListener('click', function closePreview(e) {
        if (!previewContainer.contains(e.target) && e.target.className !== 'h-button' && !e.target.closest('.h-button')) {
            previewContainer.remove();
            document.removeEventListener('click', closePreview);
        }
    });
}

const addHButtonToLinkedInPosts = () => {
    const currentUrl = window.location.href;
    if (currentUrl.includes('/feed/update/') || currentUrl.includes('/posts/')) {
        // Individual post page
        addHButtonToSinglePost();
    } else {
        // Feed page
        addHButtonToFeedPosts();
    }
};

const addHButtonToFeedPosts = () => {
    const selectors = [
        '.feed-shared-update-v2',
        'div[data-urn*="activity"]',
        '.update-components-content'
    ];
    
    let postContainers = [];
    for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        postContainers = [...postContainers, ...Array.from(elements)];
    }
    
    postContainers.forEach(postContainer => {
        // Only add button to posts with images or videos
        const hasMedia = postContainer.querySelector('img[src*="media.licdn.com"], .feed-shared-image, video') ||
                        postContainer.querySelector('.update-components-image, .feed-shared-video');
        if (!postContainer.querySelector('.h-button') && hasMedia) {
            const hButton = createHforPostButton('feed');
            hButton.classList.add('h-button');
            postContainer.style.position = 'relative';
            postContainer.appendChild(hButton);

            hButton.addEventListener('click', (event) => handleHButtonClick(event, postContainer, false));
        }
    });
};

const addHButtonToSinglePost = () => {
    const selectors = [
        '.feed-shared-update-v2',
        'article',
        'div[data-urn*="activity"]'
    ];
    
    let postContainer = null;
    for (const selector of selectors) {
        postContainer = document.querySelector(selector);
        if (postContainer) break;
    }

    if (postContainer && !postContainer.querySelector('.h-button')) {
        const imageElement = postContainer.querySelector('img[src*="media.licdn.com"], .feed-shared-image img');
        if (imageElement) {
            if (imageElement.complete) {
                addHButton(postContainer);
            } else {
                imageElement.addEventListener('load', () => {
                    addHButton(postContainer);
                });
            }
        }
    }
};

const addHButton = (postContainer) => {
    const hButton = createHforPostButton('single');
    hButton.classList.add('h-button');
    postContainer.style.position = 'relative';
    postContainer.appendChild(hButton);

    hButton.addEventListener('click', (event) => handleHButtonClick(event, postContainer, true));
};

// Clone user button (adapted for LinkedIn)
const addCloneUserButton = () => {
    // LinkedIn profile pages have different structure
    const selectors = [
        '.pv-s-profile-actions',
        '.pv-top-card-v2-ctas',
        'div.pv-top-card-profile-picture__container + div'
    ];
    
    let actionButtonContainer = null;
    for (const selector of selectors) {
        actionButtonContainer = document.querySelector(selector);
        if (actionButtonContainer) break;
    }
    
    console.log(actionButtonContainer, 'actionButtonContainer');
    if (actionButtonContainer && !document.querySelector('.clone-user-button')) {
        const cloneButton = document.createElement('button');
        const img = document.createElement('img');
        const textNode = document.createElement('span');

        // Set up the image
        img.src = chrome.runtime.getURL('icons/icon48.png');
        img.style.width = '22px';
        img.style.height = '22px';
        img.className = 'h-icon';
        textNode.textContent = ' Clone User';
        cloneButton.style.display = 'flex';
        cloneButton.style.alignItems = 'center';
        cloneButton.style.gap = '5px';
        cloneButton.appendChild(img);
        cloneButton.appendChild(textNode);

        cloneButton.classList.add('artdeco-button', 'artdeco-button--2', 'artdeco-button--secondary', 'clone-user-button');
        cloneButton.style.cssText = `
            margin-left: 8px;
            border: 1px solid #0073b1;
            color: #0073b1;
            background: transparent;
            padding: 8px 16px;
            border-radius: 2px;
        `;

        cloneButton.addEventListener('click', handleCloneUserClick);

        actionButtonContainer.appendChild(cloneButton);
    }
};

const handleCloneUserClick = (event) => {
    event.preventDefault();
    const selectors = [
        'h1.text-heading-xlarge',
        '.pv-text-details__left-panel h1', 
        '.ph5 h1'
    ];
    
    let username = 'Unknown';
    for (const selector of selectors) {
        const usernameElement = document.querySelector(selector);
        if (usernameElement && usernameElement.textContent.trim()) {
            username = usernameElement.textContent.trim();
            break;
        }
    }
    
    console.log(`Cloning LinkedIn user: ${username}`);
    // Add your cloning logic here
};

const observePostChanges = () => {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                const addedNodes = mutation.addedNodes;
                addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE && window.location.href.includes('linkedin.com')) {
                        if (node.querySelector('img[src*="media.licdn.com"], .feed-shared-image')) {
                            addHButtonToSinglePost();
                        } else {
                            addHButtonToFeedPosts();
                        }
                        addCloneUserButton();
                    }
                });
            }
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
};

// Function to show save confirmation message
const showSaveConfirmation = () => {
    const confirmationDiv = document.createElement('div');
    confirmationDiv.textContent = 'LinkedIn content saved by Hawky.ai!';
    confirmationDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: rgba(0, 115, 177, 0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        z-index: 10000;
        font-weight: bold;
        font-family: Arial, sans-serif;
    `;
    document.body.appendChild(confirmationDiv);

    // Fade out and remove after 2 seconds
    setTimeout(() => {
        confirmationDiv.style.transition = 'opacity 1s';
        confirmationDiv.style.opacity = '0';
        setTimeout(() => {
            if (document.body.contains(confirmationDiv)) {
                document.body.removeChild(confirmationDiv);
            }
        }, 1000);
    }, 2000);
};

// Call this function after the page loads
window.addEventListener('load', () => {
    observePostChanges();
    addCloneUserButton();
});