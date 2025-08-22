
let selectedText = '';
let actionButton;

const debounce = (func, wait) => {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};

const createHButton = () => {
  const button = document.createElement('button');
  const img = document.createElement('img');
  img.className = 'h-icon';
  img.src = chrome.runtime.getURL('/icons/icon48.png');
  img.style.width = '20px';  // Adjust size as needed
  img.style.height = '20px';
  button.appendChild(img);
  button.style.cssText = `
  position: absolute;
  z-index: 9999;
  background-color: transparent;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;`;
  button.classList.add('h-button');
  
  // Add click event to capture the nearest post/article container
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Find the closest post container
    const postElement = findPostContainer(event.target);
    if (postElement) {
      capturePostArea(postElement);
    }
  });
  
  return button;
};

// Function to find the closest post container based on common social media post selectors
const findPostContainer = (element) => {
  // Common selectors for posts on various platforms
  const postSelectors = [
    'article', 
    '.post', 
    '[data-testid="tweet"]', 
    '.feed-item',
    '.post-container',
    '.instagram-post',
    '.facebook-post',
    '.tweet',
    '.feed-shared-update'
  ];
  
  // Start from the clicked element and traverse up to find a matching container
  let currentElement = element;
  while (currentElement && currentElement !== document.body) {
    // Check if the current element matches any of our post selectors
    for (const selector of postSelectors) {
      if (currentElement.matches && currentElement.matches(selector)) {
        return currentElement;
      }
    }
    
    // If no match found, try the parent element
    currentElement = currentElement.parentElement;
  }
  
  // If no post container found, return the closest div that's at least 200px in height
  // as a fallback for capturing something meaningful
  currentElement = element;
  while (currentElement && currentElement !== document.body) {
    if (currentElement.tagName === 'DIV' && 
        currentElement.offsetHeight > 200 && 
        currentElement.offsetWidth > 200) {
      return currentElement;
    }
    currentElement = currentElement.parentElement;
  }
  
  return null;
};

// Function to capture the post area using html2canvas or similar approach
const capturePostArea = (element) => {
  // First, highlight the area being captured with a brief animation
  const originalStyle = element.style.cssText;
  element.style.boxShadow = '0 0 0 2px #4285f4';
  element.style.transition = 'box-shadow 0.3s ease-in-out';
  
  setTimeout(() => {
    // Remove highlight after a short delay
    element.style.cssText = originalStyle;
    
    // Use the browser's screenshot API via background script
    chrome.runtime.sendMessage({
      action: 'captureFullPage'
    }, response => {
      if (response && response.status === 'success') {
        // Get element position for cropping
        const rect = element.getBoundingClientRect();
        
        // Send the full screenshot and area coordinates to be cropped
        chrome.runtime.sendMessage({
          action: 'captureArea',
          image: response.image,
          area: {
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height
          },
          domainName: window.location.hostname,
          time: new Date().toISOString()
        });
      }
    });
  }, 300);
};

const sendToFeed = (caption, imageDataUrl) => {
  const domain = new URL(window.location.href).hostname;
  
  chrome.runtime.sendMessage({
    action: 'addToFeed',
    caption,
    imageDataUrl,
    time: new Date().toISOString(),
    domainName: domain
  }, response => {
    if (response.status === "success") {
      console.log("Item added to feed successfully");
    }
  });
};

// Convert image to data URL
const convertImageToDataURL = (image, callback) => {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, image.width, image.height);
  callback(canvas.toDataURL('image/png'));
};

const addHButtonToParagraphs = () => {
  document.querySelectorAll('p').forEach(paragraph => {
    const button = createHButton();
    Object.assign(button.style, {
      position: 'relative',
      display: 'inline-block',
      marginLeft: '5px',
      verticalAlign: 'middle'
    });
    button.onclick = () => sendToFeed(paragraph.textContent.trim(), null);
    paragraph.appendChild(button);
  });
};

const addHButtonToImages = () => {
  document.querySelectorAll('img').forEach(image => {
    if (image.classList.contains('h-icon')) return;
    const button = createHButton();
    Object.assign(button.style, {
      position: 'absolute',
      top: '5px',
      right: '5px',
      display: 'none'
    });
    
    let isDownloading = false;
    button.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!isDownloading) {
        isDownloading = true;
        sendToFeed(null,image.src);
        setTimeout(() => { isDownloading = false; }, 1000);
      }
    };
    
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';
    image.parentNode.insertBefore(wrapper, image);
    wrapper.appendChild(image);
    wrapper.appendChild(button);
    
    wrapper.addEventListener('mouseenter', () => button.style.display = 'block');
    wrapper.addEventListener('mouseleave', () => button.style.display = 'none');
  });
};

const createActionButton = () => {
  actionButton = createHButton();
  actionButton.addEventListener('click', () => {
    if (selectedText) {
      sendToFeed(selectedText, null);
      actionButton.style.display = 'none';
    }
  });
  document.body.appendChild(actionButton);
};

const showActionButton = (x, y) => {
  Object.assign(actionButton.style, {
    left: `${x}px`,
    top: `${y}px`,
    display: 'block'
  });
};

document.addEventListener('mouseup', (event) => {
  const selection = window.getSelection().toString().trim();
  if (selection) {
    selectedText = selection;
    const rect = window.getSelection().getRangeAt(0).getBoundingClientRect();
    showActionButton(rect.right, rect.bottom + window.scrollY);
  } else {
    actionButton.style.display = 'none';
  }
});

createActionButton();
addHButtonToParagraphs();
addHButtonToImages();
