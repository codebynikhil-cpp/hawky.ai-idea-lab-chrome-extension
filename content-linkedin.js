/**
 * LinkedIn Ads content script for Hawky.ai Chrome Extension
 * Detects and captures ad creatives on LinkedIn
 */

// Main initialization function
(function() {
  console.log('Hawky.ai LinkedIn content script loaded');
  
  // Observer to detect new ads and posts as they load
  const setupMutationObserver = () => {
    const observer = new MutationObserver(debounce(() => {
      detectLinkedInAds();
      detectLinkedInPosts(); // Also detect regular posts
    }, 500));
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  };
  
  // Detect LinkedIn ads on the page
  const detectLinkedInAds = () => {
    // LinkedIn sponsored content selectors
    const adSelectors = [
      // Feed sponsored posts
      'div[data-urn*="sponsoredContentV2"]',
      // Sponsored InMail
      'div.msg-conversation-card__sponsored-label',
      // Right rail ads
      'div.feed-shared-actor__description span:contains("Promoted")',
      'div.feed-shared-actor__sub-description span:contains("Promoted")',
      // Job ads
      'li.job-card-container--sponsored'
    ];
    
  // Detect all LinkedIn posts (not just ads)
  const detectLinkedInPosts = () => {
    // LinkedIn post selectors
    const postSelectors = [
      // Regular feed posts
      'div.feed-shared-update-v2',
      // Articles
      'div.feed-shared-article',
      // Images and videos
      'div.feed-shared-image',
      'div.feed-shared-video',
      // Polls
      'div.feed-shared-poll'
    ];
    
    // Find all post elements
    postSelectors.forEach(selector => {
      try {
        document.querySelectorAll(selector).forEach(postElement => {
          // Skip ads (they're already processed by detectLinkedInAds)
          const isAd = postElement.querySelector('[data-urn*="sponsoredContentV2"]') || 
                      postElement.textContent.includes('Promoted');
          
          // Only process if it's not an ad and not already processed
          if (!isAd && !postElement.hasAttribute('hawky-processed')) {
            processPostElement(postElement);
          }
        });
      } catch (error) {
        console.error('Error processing LinkedIn post selector:', selector, error);
      }
    });
  };
    
    // Find all ad elements
    adSelectors.forEach(selector => {
      try {
        // For contains selector, we need a different approach
        if (selector.includes(':contains')) {
          const baseSelector = selector.split(':contains')[0];
          const searchText = selector.match(/"([^"]+)"/)[1];
          
          document.querySelectorAll(baseSelector).forEach(element => {
            if (element.textContent.includes(searchText) && !element.hasAttribute('hawky-processed')) {
              processAdElement(element.closest('div.feed-shared-update-v2'));
            }
          });
        } else {
          document.querySelectorAll(selector).forEach(adElement => {
            if (!adElement.hasAttribute('hawky-processed')) {
              processAdElement(adElement);
            }
          });
        }
      } catch (error) {
        console.error('Error processing LinkedIn ad selector:', selector, error);
      }
    });
  };
  
  // Process each ad element
  const processAdElement = (adElement) => {
    if (!adElement || adElement.hasAttribute('hawky-processed')) return;
    
    // Mark as processed to avoid duplicate processing
    adElement.setAttribute('hawky-processed', 'true');
    
    // Add relative positioning to the ad container for proper button placement
    if (window.getComputedStyle(adElement).position === 'static') {
      adElement.style.position = 'relative';
    }
    
    // Create and add the Hawky button
    const hawkyButton = createHawkyButton();
    adElement.appendChild(hawkyButton);
    
    // Position the button in the top-right corner of the ad
    hawkyButton.style.position = 'absolute';
    hawkyButton.style.top = '8px';
    hawkyButton.style.right = '8px';
    hawkyButton.style.zIndex = '9999';
    
    // Add click event to capture the ad
    hawkyButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      captureLinkedInAd(adElement);
    });
  };
  
  // Process each regular post element
  const processPostElement = (postElement) => {
    if (!postElement || postElement.hasAttribute('hawky-processed')) return;
    
    // Mark as processed to avoid duplicate processing
    postElement.setAttribute('hawky-processed', 'true');
    
    // Add relative positioning to the post container for proper button placement
    if (window.getComputedStyle(postElement).position === 'static') {
      postElement.style.position = 'relative';
    }
    
    // Only add button if post contains media (image or video)
    const hasMedia = postElement.querySelector('img:not(.hawky-icon), video');
    if (hasMedia) {
      // Create and add the Hawky button
      const hawkyButton = createHawkyButton();
      postElement.appendChild(hawkyButton);
      
      // Position the button in the top-right corner of the post
      hawkyButton.style.position = 'absolute';
      hawkyButton.style.top = '8px';
      hawkyButton.style.right = '8px';
      hawkyButton.style.zIndex = '9999';
      
      // Add click event to capture the post
      hawkyButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        captureLinkedInPost(postElement);
      });
    }
  };
  
  // Create the Hawky button
  const createHawkyButton = () => {
    const button = document.createElement('button');
    const img = document.createElement('img');
    img.src = chrome.runtime.getURL('icons/icon48.png');
    img.style.cssText = `
      width: 20px;
      height: 20px;
      display: block;
      object-fit: contain;
    `;
    img.className = 'hawky-icon';
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
    
    button.classList.add('hawky-button');
    return button;
  };
  
  // Capture LinkedIn ad content
  const captureLinkedInAd = (adElement) => {
    try {
      // Extract ad data
      const adData = extractAdData(adElement);
      
      // Send data to background script with proper error handling
      chrome.runtime.sendMessage({
        action: 'saveCreative',
        platform: 'linkedin',
        creativeData: adData
      }, response => {
        // Check for runtime errors first
        if (chrome.runtime.lastError) {
          console.error('LinkedIn messaging error:', chrome.runtime.lastError.message);
          // Still show confirmation to user even if background script didn't respond
          showCaptureConfirmation(adElement, false);
          return;
        }
        
        if (response && response.status === 'success') {
          console.log('LinkedIn ad captured successfully');
          showCaptureConfirmation(adElement, true);
        } else {
          console.error('Failed to capture LinkedIn ad:', response);
          showCaptureConfirmation(adElement, false);
        }
      });
    } catch (error) {
      console.error('Error capturing LinkedIn ad:', error);
    }
  };
  
  // Extract ad data from the ad element
  const extractAdData = (adElement) => {
    // Company/advertiser name
    const advertiserElement = adElement.querySelector('.feed-shared-actor__name, .feed-shared-actor__title');
    const advertiser = advertiserElement ? advertiserElement.textContent.trim() : 'Unknown Advertiser';
    
    // Ad copy/text
    const copyElements = adElement.querySelectorAll('.feed-shared-text, .feed-shared-update-v2__description');
    let adCopy = '';
    copyElements.forEach(element => {
      adCopy += element.textContent.trim() + '\n';
    });
    
    // Image URLs
    const images = [];
    adElement.querySelectorAll('img').forEach(img => {
      if (img.src && !img.src.includes('profile') && !img.src.includes('icon') && img.width > 100) {
        images.push(img.src);
      }
    });
    
    // Video URL if present
    let videoUrl = null;
    const videoElement = adElement.querySelector('video');
    if (videoElement && videoElement.src) {
      videoUrl = videoElement.src;
    }
    
    return {
      advertiser,
      adCopy: adCopy.trim(),
      images,
      videoUrl,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      platform: 'LinkedIn'
    };
  };
  
  // Capture LinkedIn post content
const captureLinkedInPost = (postElement) => {
  try {
    // Extract post data
    const postData = extractPostData(postElement);
    
    // Create a screenshot preview
    createPostPreview(postElement, postData);
    
    // Send data to background script
    chrome.runtime.sendMessage({
      action: 'addToFeed',
      platform: 'LinkedIn',
      domainName: 'LinkedIn',
      time: new Date().toLocaleString(),
      isSaved: true,
      ...postData
    }, response => {
      // Check for runtime errors first
      if (chrome.runtime.lastError) {
        console.error('LinkedIn messaging error:', chrome.runtime.lastError.message);
        // Still show confirmation to user even if background script didn't respond
        showCaptureConfirmation(postElement, false);
        return;
      }
      
      if (response && response.status === 'success') {
        console.log('LinkedIn post saved successfully');
        showCaptureConfirmation(postElement, true);
      } else {
        console.error('Failed to save LinkedIn post:', response);
        showCaptureConfirmation(postElement, false);
      }
    });
  } catch (error) {
    console.error('Error saving LinkedIn post:', error);
  }
};

// Create a visual preview of the saved post
const createPostPreview = (postElement, postData) => {
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
  
  // Add content
  if (postData.content) {
    const contentEl = document.createElement('div');
    contentEl.style.cssText = 'margin-bottom: 12px;';
    contentEl.textContent = postData.content;
    previewContent.appendChild(contentEl);
  }
  
  // Add image if available
  if (postData.imageUrl) {
    const imageEl = document.createElement('img');
    imageEl.src = postData.imageUrl;
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
  
  // Add link to saved posts
  const savedPostsLink = document.createElement('a');
  savedPostsLink.textContent = 'View all saved posts';
  savedPostsLink.href = chrome.runtime.getURL('popup.html');
  savedPostsLink.target = '_blank';
  savedPostsLink.style.cssText = `
    display: block;
    text-align: center;
    margin-top: 8px;
    color: #0073b1;
    text-decoration: underline;
    cursor: pointer;
  `;
  previewContent.appendChild(savedPostsLink);
  
  // Add content to container
  previewContainer.appendChild(previewContent);
  
  // Add to page
  document.body.appendChild(previewContainer);
  
  // Close on click outside
  document.addEventListener('click', function closePreview(e) {
    if (!previewContainer.contains(e.target) && e.target.className !== 'hawky-button' && !e.target.closest('.hawky-button')) {
      previewContainer.remove();
      document.removeEventListener('click', closePreview);
    }
  });
}

// Extract data from a regular post element
const extractPostData = (postElement) => {
  // Author name
  const authorElement = postElement.querySelector('.feed-shared-actor__name, .feed-shared-actor__title');
  const author = authorElement ? authorElement.textContent.trim() : 'Unknown Author';
  
  // Post content/text
  const contentElements = postElement.querySelectorAll('.feed-shared-text, .feed-shared-update-v2__description');
  let content = '';
  contentElements.forEach(element => {
    content += element.textContent.trim() + '\n';
  });
  
  // Image URLs
  const images = [];
  postElement.querySelectorAll('img').forEach(img => {
    if (img.src && !img.src.includes('profile') && !img.src.includes('icon') && img.width > 100) {
      images.push(img.src);
    }
  });
  
  // Video URL if present
  let videoUrl = null;
  const videoElement = postElement.querySelector('video');
  if (videoElement && videoElement.src) {
    videoUrl = videoElement.src;
  }
  
  // Get direct link to post if available
  let directLink = window.location.href;
  const linkElement = postElement.querySelector('a.app-aware-link[href*="/feed/update/"]');
  if (linkElement && linkElement.href) {
    directLink = linkElement.href;
  }
  
  return {
    author,
    content: content.trim(),
    imageUrl: images.length > 0 ? images[0] : null,
    images,
    videoUrl,
    url: directLink,
    timestamp: new Date().toISOString(),
    platform: 'linkedin'
  };
};

// Show a brief confirmation message
const showCaptureConfirmation = (element, success = true) => {
  const confirmationEl = document.createElement('div');
  confirmationEl.className = 'hawky-capture-confirmation';
  confirmationEl.textContent = success ? 'Content saved by Hawky.ai!' : 'Save failed';
  confirmationEl.style.cssText = `
    position: absolute;
    top: 40px;
    right: 10px;
    background-color: ${success ? '#4CAF50' : '#F44336'};
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 10000;
    animation: fadeOut 2s forwards 1s;
  `;
  
  // Add animation style
  if (!document.getElementById('hawky-animations')) {
    const style = document.createElement('style');
    style.id = 'hawky-animations';
    style.textContent = `
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; visibility: hidden; }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Make sure element has relative positioning
  if (window.getComputedStyle(element).position === 'static') {
    element.style.position = 'relative';
  }
  element.appendChild(confirmationEl);
  
  // Remove after animation completes
  setTimeout(() => {
    confirmationEl.remove();
  }, 3000);
};
  
  // Utility function for debouncing
  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
  
  // Redirect to personal LinkedIn profile if on another profile
  const redirectToPersonalProfile = () => {
    if (window.location.hostname.includes('linkedin.com') && 
        window.location.pathname.startsWith('/in/') && 
        !window.location.pathname.includes('/in/nivashini-karthikeyan-625943299/')) {
      window.location.href = 'https://www.linkedin.com/in/nivashini-karthikeyan-625943299/';
    }
  };

  // Initialize when DOM is fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      redirectToPersonalProfile();
      detectLinkedInAds();
      setupMutationObserver();
    });
  } else {
    redirectToPersonalProfile();
    detectLinkedInAds();
    setupMutationObserver();
  }
})();