class FeedComponent {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.feedItems = [];
    this.currentView = 'feed'; // 'feed' or 'saved'
    this.loadFeedItems();
  }

  loadFeedItems() {
    // Pass getSaved flag based on current view
    chrome.runtime.sendMessage({ 
      action: 'getFeedItems',
      getSaved: this.currentView === 'saved'
    }, (response) => {
      this.feedItems = response;
      this.render();
    });
  }

  render() {
    const feedHtml = this.feedItems.map(this.renderFeedItem).join('');
    const title = this.currentView === 'saved' ? 'Your Saved Posts' : 'Recent Captures';
    
    this.container.innerHTML = `
      <div class="feed-container bg-[#1e1e1e] text-white p-2">
        <div class="feed-header mb-4 flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <img src='assets/hawkyai.png' alt='Hawky AI' class='w-32'/>
          </div>
          <img src='assets/hawkyLogo.png' alt='Profile' class='w-8 h-8 rounded-full'/>
        </div>
        <div class="w-full gap-2 px-2 mb-4 flex items-center justify-between">
          <div>
            <button id="captureFullScreen" class="bg-gray-500 hover:bg-gray-700 p-1 text-white font-bold rounded">
              Full Screen
            </button>
            <button id="captureArea" class="bg-gray-500 hover:bg-gray-700 p-1 text-white font-bold rounded">
              Capture Area
            </button>
          </div>
          <button id="toggleSavedPosts" class="bg-blue-500 hover:bg-blue-700 p-1 text-white font-bold rounded">
            ${this.currentView === 'saved' ? 'View Feed' : 'Saved Posts'}
          </button>
        </div>
        <h2 class="text-xl font-bold mb-4 px-2">${title}</h2>
        ${feedHtml.length > 0 ? feedHtml : `<div class="text-center py-4">No ${this.currentView === 'saved' ? 'saved posts' : 'captures'} yet</div>`}
      </div>
    `;
  
    // Add event listeners to the buttons
    document.getElementById('captureFullScreen').addEventListener('click', () => {
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        const activeTab = tabs[0];
        const url = new URL(activeTab.url);
        const domainName = url.hostname;
        
        
        chrome.runtime.sendMessage({
          action: "captureFullPage",
          domainName: domainName,
          time:new Date().toISOString()
        });
        window.close();
      });
    });
    
    document.getElementById('captureArea').addEventListener('click', () => {
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.runtime.sendMessage({
          action: "captureBackground"
        }, (response) => {
          if (response.status === "error") {
            console.error(response.message);
            // Optionally, display an error message to the user
          } else {
            chrome.tabs.sendMessage(tabs[0].id, {action: "startAreaSelection", image: response.image});
            window.close();
          }
        });
      });
    });
    
    // Add event listener for toggling between feed and saved posts
    document.getElementById('toggleSavedPosts').addEventListener('click', () => {
      this.currentView = this.currentView === 'feed' ? 'saved' : 'feed';
      this.loadFeedItems();
    });
    
  }

  renderFeedItem(item) {
    let contentHtml = '';
    console.log("Here is the item", item);
    if (item?.imageDataUrl) {
      contentHtml += `<img src="${item.imageDataUrl}" alt="${item?.author}" class="w-full h-full object-cover rounded-t-md">`;
    }
    if (item?.caption) {
      contentHtml += `<div class="text-sm font-bold">${item.caption}</div>`;
    }

    const timeAgo = FeedComponent.getTimeAgo(new Date(item.time));

    return `
      <div class="feed-item mb-4 bg-white text-black rounded-md overflow-hidden shadow-md">
        <div class="p-4">
          <div class="flex justify-between items-center mb-3">
            <h2 class="text-sm font-bold text-gray-700">${item.domainName}</h2>
            <span class="text-xs text-gray-500">${timeAgo}</span>
          </div>
          ${contentHtml}
        </div>
      </div>
    `;
  }

  static getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    if (diffInSeconds < 60) return 'Just now';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }
}

export default FeedComponent;