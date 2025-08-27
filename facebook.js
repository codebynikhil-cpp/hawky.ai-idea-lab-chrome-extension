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
        button.style.color = '#1877F2';
    };
    
    button.appendChild(img);
    button.style.cssText = `
        position: absolute;
        z-index: 9999;
        right: ${forButton === 'single' ? '16' : '0'}px;
        top: ${forButton === 'single' ? '2' : '-10'}px;
        background-color: rgba(255, 255, 255, 0.9);
        border: 2px solid #1877F2;
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
        button.style.backgroundColor = '#1877F2';
        button.style.borderColor = '#1877F2';
        if (img.style.display !== 'none') {
            img.style.filter = 'brightness(0) invert(1)';
        } else {
            button.style.color = 'white';
        }
    });
    
    button.addEventListener('mouseleave', () => {
        button.style.transform = 'scale(1)';
        button.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        button.style.borderColor = '#1877F2';
        if (img.style.display !== 'none') {
            img.style.filter = 'none';
        } else {
            button.style.color = '#1877F2';
        }
    });
    
    return button;
};

const sendToFacebookFeed = (details) => {
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
        platform: 'Facebook',
        isSaved: true,
        postUrl: postUrl,
        caption: formattedCaption,
        metadata: {
            originalLink: postUrl,
            originalCaption: caption,
            captureTime: new Date().toISOString(),
            platform: 'Facebook'
        }
    }, response => {
        if (response.status === "success") {
            console.log("Item added to feed successfully");
            showSaveConfirmation();
        }
    });
};

// Feed posts extraction functions (like Instagram feed)
const extractAuthorFeed = (postContainer) => {
    const selectors = [
        'a[role="link"] strong span',
        'h3 a span',
        'h4 a span',
        'a[data-hovercard-type="user"] span'
    ];
    
    for (const selector of selectors) {
        const authorElement = postContainer.querySelector(selector);
        if (authorElement && authorElement.textContent.trim()) {
            return authorElement.textContent.trim();
        }
    }
    return 'Unknown';
};

const extractDateFeed = (postContainer) => {
    const selectors = [
        'a[href*="permalink"] span',
        'a[href*="posts"] span',
        'span[id^=":r"] span',
        'time'
    ];
    
    for (const selector of selectors) {
        const dateElement = postContainer.querySelector(selector);
        if (dateElement && dateElement.textContent.trim()) {
            const text = dateElement.textContent.trim();
            // Check if it looks like a timestamp
            if (text.match(/(\d+\s*(min|hr|d|w|mo|yr)|just now|now)/i)) {
                return text;
            }
        }
    }
    return 'Unknown';
};

const extractContentFeed = (postContainer) => {
    const selectors = [
        'div[data-ad-preview="message"]',
        'div[dir="auto"].xdj266r.x11i5rnm.xat24cr.x1mh8g0r.x1vvkbs',
        '.xqjyukv',
        'div[data-testid="post_message"]'
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
        'img[src*="scontent"]',
        'img.x1ey2m1c',
        'img.x5yr21d',
        'div[role="img"] img'
    ];
    
    for (const selector of selectors) {
        const imageElement = postContainer.querySelector(selector);
        if (imageElement) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = imageElement.width || imageElement.naturalWidth;
            canvas.height = imageElement.height || imageElement.naturalHeight;
            
            try {
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
        'a[href*="/posts/"]',
        'a[href*="/permalink/"]',
        'a[href*="/photo/"]',
        'a[href*="/videos/"]',
        'a[href*="/story.php"]',
        // Add timestamp link selector
        'a.x1i10hfl[href*="facebook.com"]',
        // Add "More" button link selector
        'a[role="link"][href*="facebook.com"]'
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
        'div[data-ad-preview="message"] span',
        'div[dir="auto"] span',
        'span[data-testid="post_message"]'
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
        'span[aria-label*="reaction"]',
        'div[aria-label*="reaction"] span',
        'span.xt0b8zv.x1e558r4'
    ];
    
    for (const selector of selectors) {
        const likesElement = postContainer.querySelector(selector);
        if (likesElement && likesElement.textContent.trim()) {
            return likesElement.textContent.trim();
        }
    }
    return 'Unknown';
};

// Single post extraction functions (like Instagram single post)
const extractAuthorSinglePost = (postContainer) => {
    const selectors = [
        'h2 a span',
        'h3 a span',
        'h4 a span',
        'a[data-hovercard-type="user"] span'
    ];
    
    for (const selector of selectors) {
        const authorElement = postContainer.querySelector(selector);
        if (authorElement && authorElement.textContent.trim()) {
            return authorElement.textContent.trim();
        }
    }
    return 'Unknown';
};

const extractDateSinglePost = (postContainer) => {
    const selectors = [
        'span.x4k7w5x a',
        'time',
        'a[href*="permalink"] span'
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
        '.html-span.xdj266r.x11i5rnm.xat24cr.xmh8g0r',
        '.xyinxu5.x4uap5.x1g2khh7.xkhd6sd',
        'div[dir="auto"]'
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
        'img.x1bwycvy.x193iq5w.x4fas0m.x19kjcj4',
        'img[src*="scontent"]',
        'img.x5yr21d'
    ];
    
    for (const selector of selectors) {
        const imageElement = postContainer.querySelector(selector);
        if (imageElement) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = imageElement.width || imageElement.naturalWidth;
            canvas.height = imageElement.height || imageElement.naturalHeight;
            
            try {
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
        'span.x193iq5w.xeuugli.x1fj9vlw.x13faqbe.x1vvkbs.xt0psk2.x1i0vuye.xvs91rp.xo1l8bm.x5n08af.x10wh9bi.x1wdrske.x8viiok.x18hxmgj',
        'div[data-testid="post_message"] span',
        'div[dir="auto"] span'
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
        'div[aria-label*="reaction"] span',
        'span[aria-label*="reaction"]',
        'a[href$="/liked_by/"] span'
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
    sendToFacebookFeed(postDetails);
};

// Create a visual preview of the saved post (same as Instagram)
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
                color: #1877F2;
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
    messageEl.textContent = 'Your Facebook post is saved successfully!';
    previewContent.appendChild(messageEl);
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.cssText = `
        background-color: #1877F2;
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
        color: #1877F2;
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

const addHButtonToFacebookPosts = () => {
    const currentUrl = window.location.href;
    if (currentUrl.includes('/photo/') || currentUrl.includes('/permalink/') || currentUrl.includes('/posts/')) {
        // Individual post page
        addHButtonToSinglePost();
    } else {
        // Feed page
        addHButtonToFeedPosts();
    }
};

const addHButtonToFeedPosts = () => {
    const selectors = [
        'div[role="article"]',
        'div.x1lliihq',
        'div[data-pagelet*="FeedUnit"]'
    ];
    
    let postContainers = [];
    for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        postContainers = [...postContainers, ...Array.from(elements)];
    }
    
    postContainers.forEach(postContainer => {
        // Only add button to posts with images or videos
        const hasMedia = postContainer.querySelector('img[src*="scontent"], img.x5yr21d, video') ||
                        postContainer.querySelector('img.x1ey2m1c, div[role="img"]');
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
        'div[aria-label="Photo viewer"]',
        'div[data-pagelet="MediaViewerPhoto"]',
        'div.x78zum5.xdt5ytf.xg6iff7.x1n2onr6.x1ja2u2z.x443n21',
        'div[role="dialog"]'
    ];
    
    let postContainer = null;
    for (const selector of selectors) {
        postContainer = document.querySelector(selector);
        if (postContainer) break;
    }

    if (postContainer && !postContainer.querySelector('.h-button')) {
        const imageElement = postContainer.querySelector('img[src*="scontent"], img.x5yr21d');
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

// Clone user button (adapted from Instagram)
const addCloneUserButton = () => {
    // Facebook profile pages have different structure
    const selectors = [
        'div[data-pagelet="ProfileActions"]',
        'div.x78zum5.x1a02dak.x139jcc6.xcud41i.x9otpla.x1ke80iy',
        'div[role="button"][aria-label*="Message"]'
    ];
    
    let messageButtonContainer = null;
    for (const selector of selectors) {
        messageButtonContainer = document.querySelector(selector);
        if (messageButtonContainer) break;
    }
    
    console.log(messageButtonContainer, 'messageButtonContainer');
    if (messageButtonContainer && !document.querySelector('.clone-user-button')) {
        const cloneButton = document.createElement('div');
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

        cloneButton.classList.add('x1i10hfl', 'xjqpnuy', 'xa49m3k', 'xqeqjp1', 'x2hbi6w', 'x972fbf', 'xcfux6l', 'x1qhh985', 'xm0m39n', 'xdl72j9', 'x2lah0s', 'xe8uvvx', 'xdj266r', 'x11i5rnm', 'xat24cr', 'x1mh8g0r', 'x2lwn1j', 'xeuugli', 'xexx8yu', 'x18d9i69', 'x1hl2dhg', 'xggy1nq', 'x1ja2u2z', 'x1t137rt', 'x1q0g3np', 'x1lku1pv', 'x1a2a7pz', 'x6s0dn4', 'xjyslct', 'x1lq5wgf', 'xgqcy7u', 'x30kzoy', 'x9jhf4c', 'x1ejq31n', 'xd10rxx', 'x1sy0etr', 'x17r0tee', 'x9f619', 'x1ypdohk', 'x78zum5', 'x1f6kntn', 'xwhw2v2', 'x10w6t97', 'xl56j7k', 'x17ydfre', 'x1swvt13', 'x1pi30zi', 'x1n2onr6', 'x2b8uid', 'xlyipyv', 'x87ps6o', 'x14atkfc', 'xcdnw81', 'x1i0vuye', 'x1gjpkn9', 'x5n08af', 'xsz8vos','clone-user-button');

        cloneButton.addEventListener('click', handleCloneUserClick);

        messageButtonContainer.appendChild(cloneButton);
    }
};

const handleCloneUserClick = (event) => {
    event.preventDefault();
    const selectors = [
        'h1 span',
        'h2 span', 
        '[data-testid="profile_name"] span',
        '.x1lliihq span'
    ];
    
    let username = 'Unknown';
    for (const selector of selectors) {
        const usernameElement = document.querySelector(selector);
        if (usernameElement && usernameElement.textContent.trim()) {
            username = usernameElement.textContent.trim();
            break;
        }
    }
    
    console.log(`Cloning Facebook user: ${username}`);
    // Add your cloning logic here
};

const observePostChanges = () => {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                const addedNodes = mutation.addedNodes;
                addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE && window.location.href.includes('www.facebook.com')) {
                        if (node.querySelector('img[src*="scontent"], img.x5yr21d')) {
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

// Function to show save confirmation message (same as Instagram)
const showSaveConfirmation = () => {
    const confirmationDiv = document.createElement('div');
    confirmationDiv.textContent = 'Facebook content saved by Hawky.ai!';
    confirmationDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: rgba(24, 119, 242, 0.8);
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

// Call this function after the page loads (same as Instagram)
window.addEventListener('load', () => {
    observePostChanges();
    addCloneUserButton();
});