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
        button.style.color = '#E4405F';
    };
    
    button.appendChild(img);
    button.style.cssText = `
        position: absolute;
        z-index: 9999;
        right: ${forButton === 'single' ? '16' : '0'}px;
        top: ${forButton === 'single' ? '2' : '-10'}px;
        background-color: rgba(255, 255, 255, 0.9);
        border: 2px solid #E4405F;
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
        button.style.backgroundColor = '#E4405F';
        button.style.borderColor = '#E4405F';
        if (img.style.display !== 'none') {
            img.style.filter = 'brightness(0) invert(1)';
        } else {
            button.style.color = 'white';
        }
    });
    
    button.addEventListener('mouseleave', () => {
        button.style.transform = 'scale(1)';
        button.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        button.style.borderColor = '#E4405F';
        if (img.style.display !== 'none') {
            img.style.filter = 'none';
        } else {
            button.style.color = '#E4405F';
        }
    });
    
    return button;
};

const sendToInstagramFeed = (details) => {
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
        platform: 'Instagram',
        isSaved: true,
        postUrl: postUrl,
        caption: formattedCaption,
        metadata: {
            originalLink: postUrl,
            originalCaption: caption,
            captureTime: new Date().toISOString(),
            platform: 'Instagram'
        }
    }, response => {
        if (response.status === "success") {
            console.log("Item added to feed successfully");
            showSaveConfirmation();
        }
    });
};

const extractAuthorFeed = (postContainer) => {
    const authorElement = postContainer.querySelector('a[role="link"]');
    return authorElement ? authorElement.textContent.trim() : 'Unknown';
};

const extractDateFeed = (postContainer) => {
    const dateElement = postContainer.querySelector('time');
    return dateElement ? dateElement.getAttribute('datetime') : 'Unknown';
};

const extractContentFeed = (postContainer) => {
    const contentElement = postContainer.querySelector('.xqjyukv');
    return contentElement ? contentElement.textContent.trim() : 'No content';
};

const extractImageUrlFeed = (postContainer) => {
    const imageElement = postContainer.querySelector('._aagu img.x5yr21d');
    if (imageElement) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = imageElement.width;
        canvas.height = imageElement.height;
        ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/png');
    }
    return 'No image';
};

const extractLinkFeed = (postContainer) => {
    // Try different methods to get the post link
    const selectors = [
        'a[href*="/p/"]',
        'a[href*="/reel/"]',
        'time[datetime]',
        'a[role="link"]'
    ];
    
    for (const selector of selectors) {
        const linkElement = postContainer.querySelector(selector);
        if (linkElement && linkElement.href) {
            // Clean the URL (remove query parameters)
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
    const captionElement = postContainer.querySelector('._ap3a._aaco._aacu._aacx._aad7._aade');
    return captionElement ? captionElement.textContent.trim() : 'No caption';
};

const extractLikesFeed = (postContainer) => {
    const likesElement = postContainer.querySelector('a[href*="/liked_by/"] span');
    return likesElement ? likesElement.textContent.trim() : 'Unknown';
};

// Single post extraction functions
const extractAuthorSinglePost = (postContainer) => {
    const authorElement = postContainer.querySelector('a.x1i10hfl.xjbqb8w.x1ejq31n.xd10rxx.x1sy0etr.x17r0tee.x972fbf.xcfux6l.x1qhh985.xm0m39n.x9f619.x1ypdohk.xt0psk2.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x16tdsg8.x1hl2dhg.xggy1nq.x1a2a7pz._a6hd');
    return authorElement ? authorElement.textContent.trim() : 'Unknown';
};

const extractDateSinglePost = (postContainer) => {
    const dateElement = postContainer.querySelector('time.x1p4m5qa');
    return dateElement ? dateElement.getAttribute('datetime') : 'Unknown';
};

const extractContentSinglePost = (postContainer) => {
    // Adjust this selector if needed
    const contentElement = postContainer.querySelector('._ap3a._aaco._aacu._aacx._aad6._aade');
    return contentElement ? contentElement.textContent.trim() : 'No content';
};

const extractImageUrlSinglePost = (postContainer) => {
    const imageElement = postContainer.querySelector('img.x5yr21d');
    if (imageElement) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = imageElement.width;
        canvas.height = imageElement.height;
        ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/png');
    }
    return 'No image';
};

const extractLinkSinglePost = () => {
    // For single posts, clean up the current URL
    try {
        const url = new URL(window.location.href);
        // Remove query parameters and keep essential path
        return `${url.origin}${url.pathname}`;
    } catch (e) {
        return window.location.href;
    }
};

const extractCaptionSinglePost = (postContainer) => {
    const captionElement = postContainer.querySelector('span.x193iq5w.xeuugli.x1fj9vlw.x13faqbe.x1vvkbs.xt0psk2.x1i0vuye.xvs91rp.xo1l8bm.x5n08af.x10wh9bi.x1wdrske.x8viiok.x18hxmgj');
    return captionElement ? captionElement.textContent.trim() : 'No caption';
};

const extractLikesSinglePost = (postContainer) => {
    const likesElement = postContainer.querySelector('a[href$="/liked_by/"] span');
    if (likesElement) {
        const likesText = likesElement.textContent.trim();
        return likesText.replace(/,/g, ''); // Remove commas if present
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
    sendToInstagramFeed(postDetails);
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
    authorEl.style.cssText = `
        font-weight: bold;
        margin-bottom: 8px;
        font-size: 14px;
        color: #000000; /* Solid black so it doesn’t fade */
    `;
    authorEl.textContent = postData.author || 'Unknown Author';
    previewContent.appendChild(authorEl);

    
        // Add caption/content with link
    if (postData.caption || postData.content) {
        const contentEl = document.createElement('div');
        contentEl.style.cssText = 'margin-bottom: 12px;';

        // Add caption/content (fix blurry text)
        const textContent = document.createElement('div');
        textContent.innerHTML = postData.caption || postData.content; 
        textContent.style.cssText = `
            font-size: 14px;
            color: #000000;  /* solid black to avoid faded look */
            line-height: 1.4;
            font-weight: 400;
        `;
        contentEl.appendChild(textContent);

        // Add link separately
        if (postData.link || postData.postUrl) {
            const linkEl = document.createElement('a');
            linkEl.href = postData.link || postData.postUrl;
            linkEl.textContent = 'View original Instagram post';
            linkEl.target = '_blank';
            linkEl.style.cssText = `
                display: block;
                margin-top: 8px;
                color: #E4405F; /* Instagram pink */
                text-decoration: underline;
                font-weight: 500;
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
    messageEl.textContent = 'Your post is saved successfully!';
    previewContent.appendChild(messageEl);
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.cssText = `
        background-color: #0095f6;
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
        color: #E4405F;
        text-decoration: underline;
        cursor: pointer;
    `;
    
    // Remove direct href and handle click event
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

const addHButtonToInstagramPosts = () => {
    const currentUrl = window.location.href;
    if (currentUrl.includes('/p/')) {
        // Individual post page
        addHButtonToSinglePost();
    } else {
        // Feed page
        addHButtonToFeedPosts();
    }
};

const addHButtonToFeedPosts = () => {
    const postContainers = document.querySelectorAll('article');
    postContainers.forEach(postContainer => {
        // Only add button to posts with images or videos
        const hasMedia = postContainer.querySelector('img.x5yr21d') || postContainer.querySelector('video');
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
    const postContainer = document.querySelector('div.x1yvgwvq.x1dqoszc.x1ixjvfu.xhk4uv.x13fuv20.xu3j5b3.x1q0q8m5.x26u7qi.x178xt8z.xm81vs4.xso031l.xy80clv.x78zum5.x1q0g3np.xh8yej3');

    if (postContainer && !postContainer.querySelector('.h-button')) {
        const imageElement = postContainer.querySelector('img.x5yr21d');
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

//for clone button
const addCloneUserButton = () => {
    const messageButtonContainer = document.querySelector('div.x6s0dn4.x78zum5.x1q0g3np.xs83m0k.xeuugli.x1n2onr6');
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
    const username = document.querySelector('h2.x1lliihq span').textContent;
    console.log(`Cloning user: ${username}`);
    // Add your cloning logic here
    // For example, you might want to send a message to your background script:
    // chrome.runtime.sendMessage({
    //     action: 'cloneUser',
    //     username: username
    // }, response => {
    //     if (response.status === "success") {
    //         console.log("User cloned successfully");
    //     }
    // });
};


const observePostChanges = () => {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                const addedNodes = mutation.addedNodes;
                addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE && window.location.href.includes('www.instagram.com')) {
                        if (node.querySelector('img.x5yr21d')) {
                            addHButtonToSinglePost();
                        } else {
                            addHButtonToFeedPosts();
                        }
                        if (window.location.href.includes('www.instagram.com/')) {
                            // Redirect to personal Instagram profile if on another profile
                            if (window.location.pathname !== '/nivi_krishn1408/' && 
                                window.location.pathname.match(/^\/[^/]+\/?$/) && 
                                !window.location.pathname.includes('explore') && 
                                !window.location.pathname.includes('direct')) {
                                window.location.href = 'https://www.instagram.com/nivi_krishn1408/';
                            }
                            addCloneUserButton();
                        }
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
    confirmationDiv.textContent = 'Content saved by Hawky.ai!';
    confirmationDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: rgba(0, 0, 0, 0.8);
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
            document.body.removeChild(confirmationDiv);
        }, 1000);
    }, 2000);
};

// Call this function after the page loads
window.addEventListener('load', () => {
    observePostChanges();
    if (window.location.href.includes('www.instagram.com/')) {
        // Redirect to personal Instagram profile if on another profile
        if (window.location.pathname !== '/nivi_krishn1408/' && 
            window.location.pathname.match(/^\/[^/]+\/?$/) && 
            !window.location.pathname.includes('explore') && 
            !window.location.pathname.includes('direct')) {
            window.location.href = 'https://www.instagram.com/nivi_krishn1408/';
        }
        addCloneUserButton();
    }
});