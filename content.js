
console.log("Hawky Extension content script injected ✅");

// Hawky.ai Content Script - Universal Platform Support
console.log('Hawky.ai content script loaded on:', window.location.hostname);

// Global variables
let hawkyButtons = [];
let isProcessing = false;

// Utility function for debouncing
const debounce = (func, wait) => {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};

// Create Hawky button
// const createHawkyButton = () => {
//   const button = document.createElement('button');
//   const img = document.createElement('img');
  
//   img.src = chrome.runtime.getURL('icons/icon48.png');
//   img.style.cssText = 'width: 20px; height: 20px;';
//   img.className = 'hawky-icon';
  
//   button.appendChild(img);
//   button.style.cssText = `
//     position: absolute;
//     top: 8px;
//     right: 8px;
//     z-index: 9999;
//     background-color: rgba(255, 255, 255, 0.9);
//     border: 1px solid #ddd;
//     border-radius: 50%;
//     width: 32px;
//     height: 32px;
//     cursor: pointer;
//     display: flex;
//     align-items: center;
//     justify-content: center;
//     padding: 0;
//     box-shadow: 0 2px 4px rgba(0,0,0,0.1);
//     transition: all 0.2s ease;
//   `;
  
//   button.className = 'hawky-button';
  
//   // Hover effects
//   button.addEventListener('mouseenter', () => {
//     button.style.backgroundColor = 'rgba(66, 133, 244, 0.1)';
//     button.style.transform = 'scale(1.1)';
//   });
  
//   button.addEventListener('mouseleave', () => {
//     button.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
//     button.style.transform = 'scale(1)';
//   });
  
//   return button;
// };

// Find post containers based on platform
const findPostContainers = () => {
  const hostname = window.location.hostname;
  const currentUrl = window.location.href;
  let selectors = [];
  
  // Skip processing on specific profile pages to avoid conflicts
  const skipUrls = [
    'nivashini-karthikeyan-625943299',
    'Nivii.karthik7'
  ];
  
  if (skipUrls.some(profileId => currentUrl.includes(profileId))) {
    console.log('Skipping Hawky button injection on profile page');
    return [];
  }
  
  if (hostname.includes('instagram.com')) {
    selectors = [
      'article[role="presentation"]',
      'div[role="button"] article',
      'article'
    ];
  } else if (hostname.includes('facebook.com')) {
    // Enhanced Facebook selectors - more comprehensive and current
    selectors = [
      '[data-pagelet*="FeedUnit"]',
      '[role="article"]',
      '.userContentWrapper',
      '[data-testid="fbfeed_story"]',
      'div[data-testid="story-subtitle"]',
      '.story_body_container',
      '.userContent',
      'div[data-ft*="top_level_post_id"]',
      '.timeline .fbUserPost',
      '.feed_story',
      // Additional modern Facebook selectors
      'div[data-testid="story-subtitle"]',
      'div[data-ad-preview="message"]',
      '.x1yztbdb.x1n2onr6.xh8yej3.x1ja2u2z',
      'div[role="article"] > div > div',
      '.x1lliihq.x1plvlek.xryxfnj.x1n2onr6.x193iq5w.xeuugli.x1fj9vlw.x13faqbe.x1vvkbs.x1s928wv.xhkezso.x1gmr53x.x1cpjm7i.x1fgarty.x1943h6x.x1i0vuye.xvs91rp.xo1l8bm.x5n08af.x10wh9bi.x1wdrske.x8viiok.x18hxmgj'
    ];
  } else if (hostname.includes('linkedin.com')) {
    // Enhanced LinkedIn selectors - most current and comprehensive
    selectors = [
      // Main feed post containers
      '.feed-shared-update-v2',
      '.feed-shared-article',
      'div[data-urn*="activity"]',
      '.feed-shared-update-v2__content',
      '.occludable-update',
      '.feed-shared-update-v2--minimal-padding',
      'article.feed-shared-update-v2',
      '.feed-shared-update-v2 .feed-shared-update-v2__content',
      // Additional modern LinkedIn selectors
      '.feed-shared-update-v2__content-wrapper',
      'div[data-id*="urn:li:activity"]',
      '.scaffold-finite-scroll__content > div > div',
      '.feed-shared-update-v2 > div',
      'div.feed-shared-update-v2.feed-shared-update-v2--minimal-padding',
      // More specific LinkedIn 2024 selectors
      'div[data-urn]',
      '.feed-shared-update-v2__content-wrapper',
      '.update-components-actor',
      '.feed-shared-update-v2__description-wrapper',
      'div.feed-shared-update-v2',
      '.artdeco-card',
      '.feed-shared-update-v2 > .feed-shared-update-v2__content',
      // Catch-all for LinkedIn feed items
      '.scaffold-finite-scroll__content > div',
      'main .scaffold-finite-scroll__content > div > div',
      '[data-test-id="main-feed-activity-card"]'
    ];
  } else {
    // Generic selectors for other platforms
    selectors = [
      'article',
      '.post',
      '[data-testid*="post"]',
      '.feed-item'
    ];
  }
  
  const containers = [];
  selectors.forEach(selector => {
    try {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        // More lenient size requirements and additional checks
        if (el.offsetHeight > 50 && el.offsetWidth > 100 && !el.hasAttribute('hawky-processed')) {
          // Additional validation for meaningful content
          const hasText = el.textContent && el.textContent.trim().length > 10;
          const hasImages = el.querySelector('img');
          const hasVideo = el.querySelector('video');
          
          if (hasText || hasImages || hasVideo) {
            containers.push(el);
          }
        }
      });
    } catch (error) {
      console.warn('Error with selector:', selector, error);
    }
  });
  
  return [...new Set(containers)]; // Remove duplicates
};

// Add Hawky buttons to posts
const addHawkyButtons = () => {
  const containers = findPostContainers();
  console.log(`Found ${containers.length} post containers on ${window.location.hostname}`);
  
  containers.forEach((container, index) => {
    // Skip if already processed
    if (container.hasAttribute('hawky-processed')) return;
    
    // Mark as processed
    container.setAttribute('hawky-processed', 'true');
    
    // Ensure container has relative positioning
    const computedStyle = getComputedStyle(container);
    if (computedStyle.position === 'static') {
      container.style.position = 'relative';
    }
    
    // Create and add button
    const button = createHawkyButton();
    
    // Try different positioning strategies based on platform
    const hostname = window.location.hostname;
    if (hostname.includes('facebook.com')) {
      // Facebook-specific positioning - more visible
      button.style.top = '10px';
      button.style.right = '10px';
      button.style.zIndex = '999999';
      button.style.position = 'absolute';
      // Ensure the container can contain the absolute positioned button
      if (container.style.position === 'static' || !container.style.position) {
        container.style.position = 'relative';
      }
    } else if (hostname.includes('linkedin.com')) {
      // LinkedIn-specific positioning - more aggressive visibility
      button.style.top = '12px';
      button.style.right = '12px';
      button.style.zIndex = '999999';
      button.style.position = 'absolute';
      button.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
      button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
      // Force container positioning
      container.style.position = 'relative';
      // Add a slight border to make it more visible on LinkedIn's blue theme
      button.style.border = '2px solid #0077b5';
    } else {
      // Instagram and other platforms
      button.style.zIndex = '999999';
      button.style.position = 'absolute';
    }
    
    container.appendChild(button);
    hawkyButtons.push(button);
    
    console.log(`Added Hawky button ${index + 1} to ${hostname} post`);
    
    // Add click handler
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      capturePost(container, button);
    });
  });
};

// Capture post functionality
const capturePost = async (container, button) => {
  if (isProcessing) return;
  isProcessing = true;
  
  // Visual feedback
  const originalButtonContent = button.innerHTML;
  button.innerHTML = '<div style="width: 20px; height: 20px; border: 2px solid #4285f4; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>';
  
  // Add spin animation if not exists
  if (!document.getElementById('hawky-spin-style')) {
    const style = document.createElement('style');
    style.id = 'hawky-spin-style';
    style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
    document.head.appendChild(style);
  }
  
  try {
    // Capture screenshot
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'captureBackground'
      }, resolve);
    });
    
    if (response && response.status === 'success') {
      // Extract post data
      const postData = extractPostData(container);
      
      // Create smaller version of screenshot for preview
      const smallerImage = await createSmallerImage(response.image);
      
      // Send to background for processing
      chrome.runtime.sendMessage({
        action: 'addToFeed',
        imageDataUrl: response.image,
        domainName: window.location.hostname,
        time: new Date().toISOString(),
        platform: getPlatformName(),
        isSaved: true,
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        savedAt: new Date().toISOString(),
        ...postData
      }, (feedResponse) => {
        console.log('Post saved to feed:', feedResponse);
        if (feedResponse && feedResponse.status === 'success') {
          showSuccessPreview(container, smallerImage, postData);
        } else {
          console.error('Failed to save post:', feedResponse);
          showErrorMessage(container);
        }
      });
    } else {
      showErrorMessage(container);
    }
  } catch (error) {
    console.error('Capture error:', error);
    showErrorMessage(container);
  } finally {
    // Restore button
    button.innerHTML = originalButtonContent;
    isProcessing = false;
  }
};

// Create smaller version of image for preview
const createSmallerImage = (imageDataUrl) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set smaller dimensions (max 300px width)
      const maxWidth = 300;
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = imageDataUrl;
  });
};

// Extract post data
const extractPostData = (container) => {
  const hostname = window.location.hostname;
  let data = {
    author: 'Unknown',
    content: '',
    url: window.location.href
  };
  
  try {
    if (hostname.includes('instagram.com')) {
      const authorEl = container.querySelector('a[role="link"] span, h2 span');
      if (authorEl) data.author = authorEl.textContent.trim();
      
      const contentEl = container.querySelector('[data-testid="post-text"], span[dir="auto"]');
      if (contentEl) data.content = contentEl.textContent.trim();
    } else if (hostname.includes('facebook.com')) {
      // Enhanced Facebook data extraction
      const authorSelectors = [
        '[data-testid="post_author_name"]',
        'strong a',
        'h3 a',
        '[role="link"] strong',
        '.actor-link',
        'a[data-hovercard]'
      ];
      
      for (const selector of authorSelectors) {
        const authorEl = container.querySelector(selector);
        if (authorEl && authorEl.textContent.trim()) {
          data.author = authorEl.textContent.trim();
          break;
        }
      }
      
      const contentSelectors = [
        '[data-testid="post_message"]',
        '.userContent',
        '[data-ad-preview="message"]',
        '.text_exposed_root',
        '.userContent p',
        'div[data-testid="post_message"] span'
      ];
      
      for (const selector of contentSelectors) {
        const contentEl = container.querySelector(selector);
        if (contentEl && contentEl.textContent.trim()) {
          data.content = contentEl.textContent.trim();
          break;
        }
      }
    } else if (hostname.includes('linkedin.com')) {
      // Enhanced LinkedIn data extraction
      const authorSelectors = [
        '.feed-shared-actor__name',
        '.update-components-actor__name',
        '.feed-shared-actor__name a',
        '.update-components-actor__name a',
        '.feed-shared-actor__title',
        'span[aria-hidden="true"] span[aria-hidden="true"]'
      ];
      
      for (const selector of authorSelectors) {
        const authorEl = container.querySelector(selector);
        if (authorEl && authorEl.textContent.trim()) {
          data.author = authorEl.textContent.trim();
          break;
        }
      }
      
      const contentSelectors = [
        '.feed-shared-text',
        '.feed-shared-update-v2__description',
        '.update-components-text',
        '.feed-shared-text .break-words',
        '.feed-shared-update-v2__description .break-words',
        '.update-components-text .break-words'
      ];
      
      for (const selector of contentSelectors) {
        const contentEl = container.querySelector(selector);
        if (contentEl && contentEl.textContent.trim()) {
          data.content = contentEl.textContent.trim();
          break;
        }
      }
    }
    
    console.log(`Extracted data for ${hostname}:`, data);
  } catch (error) {
    console.warn('Error extracting post data:', error);
  }
  
  return data;
};

// Get platform name
const getPlatformName = () => {
  const hostname = window.location.hostname;
  if (hostname.includes('instagram.com')) return 'Instagram';
  if (hostname.includes('facebook.com')) return 'Facebook';
  if (hostname.includes('linkedin.com')) return 'LinkedIn';
  return hostname;
};

// Show success preview with image and redirect option
const showSuccessPreview = (container, smallerImage, postData) => {
  // Create preview overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 10001;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  // Create preview container
  const previewContainer = document.createElement('div');
  previewContainer.style.cssText = `
    background-color: white;
    border-radius: 12px;
    padding: 20px;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    text-align: center;
    position: relative;
  `;
  
  // Success message
  const successMessage = document.createElement('div');
  successMessage.textContent = 'Your post is saved successfully!';
  successMessage.style.cssText = `
    color: #4CAF50;
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 16px;
  `;
  
  // Image preview
  const imagePreview = document.createElement('img');
  imagePreview.src = smallerImage;
  imagePreview.style.cssText = `
    max-width: 100%;
    border-radius: 8px;
    margin-bottom: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  `;
  
  // Post info
  const postInfo = document.createElement('div');
  postInfo.style.cssText = `
    text-align: left;
    margin-bottom: 20px;
    padding: 12px;
    background-color: #f5f5f5;
    border-radius: 8px;
  `;
  
  const authorInfo = document.createElement('div');
  authorInfo.textContent = `Author: ${postData.author}`;
  authorInfo.style.cssText = 'font-weight: bold; margin-bottom: 8px;';
  
  const platformInfo = document.createElement('div');
  platformInfo.textContent = `Platform: ${getPlatformName()}`;
  platformInfo.style.cssText = 'color: #666; font-size: 14px;';
  
  postInfo.appendChild(authorInfo);
  postInfo.appendChild(platformInfo);
  
  // Buttons container
  const buttonsContainer = document.createElement('div');
  buttonsContainer.style.cssText = `
    display: flex;
    gap: 12px;
    justify-content: center;
  `;
  
  // View saved posts button
  const viewSavedButton = document.createElement('button');
  viewSavedButton.textContent = 'View Saved Posts';
  viewSavedButton.style.cssText = `
    background-color: #4285f4;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 10px 20px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
  `;
  
  viewSavedButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'openSavedPosts' });
    overlay.remove();
  });
  
  // Close button
  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.style.cssText = `
    background-color: #666;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 10px 20px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
  `;
  
  closeButton.addEventListener('click', () => {
    overlay.remove();
  });
  
  // Assemble preview
  buttonsContainer.appendChild(viewSavedButton);
  buttonsContainer.appendChild(closeButton);
  
  previewContainer.appendChild(successMessage);
  previewContainer.appendChild(imagePreview);
  previewContainer.appendChild(postInfo);
  previewContainer.appendChild(buttonsContainer);
  
  overlay.appendChild(previewContainer);
  document.body.appendChild(overlay);
  
  // Auto-close after 10 seconds
  setTimeout(() => {
    if (overlay.parentNode) {
      overlay.remove();
    }
  }, 10000);
  
  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });
};

// Show error message
const showErrorMessage = (container) => {
  const message = document.createElement('div');
  message.textContent = 'Save failed';
  message.style.cssText = `
    position: absolute;
    top: 40px;
    right: 8px;
    background-color: #F44336;
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 10000;
    animation: fadeOut 3s forwards;
  `;
  
  container.appendChild(message);
  setTimeout(() => message.remove(), 3000);
};

// Add fade animation
if (!document.getElementById('hawky-fade-style')) {
  const style = document.createElement('style');
  style.id = 'hawky-fade-style';
  style.textContent = `
    @keyframes fadeOut {
      0% { opacity: 1; }
      70% { opacity: 1; }
      100% { opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

// Initialize
const init = () => {
  console.log('Initializing Hawky extension on:', window.location.hostname);
  
  // Initial button addition
  setTimeout(() => {
    addHawkyButtons();
  }, 2000); // Delay for page load
  
  // Set up mutation observer for dynamic content
  const observer = new MutationObserver(debounce(() => {
    addHawkyButtons();
  }, 500)); // Reduced debounce time for faster response
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
    attributeOldValue: false,
    characterData: false,
    characterDataOldValue: false
  });
  
  // Additional periodic check for stubborn content
  setInterval(() => {
    addHawkyButtons();
  }, 5000);
};

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
