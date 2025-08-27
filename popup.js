import LoginComponent from './component/LoginComponent.js';
import FeedComponent from './component/FeedComponent.js';

class Popup {
  constructor() {
    this.loginComponent = new LoginComponent('login-container');
    this.feedComponent = new FeedComponent('logged-in-container');
    this.isCurrentlyLoggedIn = null;
    this.checkLoginStatus();
    this.setupMessageListener();
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "loginStatusChanged") {
        this.updateUI(request.isLoggedIn, request.userDetails);
      }
    });
  }

  checkLoginStatus() {
    chrome.runtime.sendMessage({ action: "getLoginStatus" }, (response) => {
      this.updateUI(response.isLoggedIn, response.userDetails);
    });
  }

  updateUI(isLoggedIn, userDetails) {
    if (isLoggedIn !== this.isCurrentlyLoggedIn) {
      this.isCurrentlyLoggedIn = isLoggedIn;
      if (isLoggedIn) {
        this.showLoggedInContent(userDetails);
      } else {
        this.showLoginContent();
      }
    }
  }

  showLoginContent() {
    document.getElementById('logged-in-container').style.display = 'none';
    document.getElementById('login-container').style.display = 'block';
    this.loginComponent.render();
  }

  showLoggedInContent(userDetails) {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('logged-in-container').style.display = 'block';
    this.feedComponent.render();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new Popup();
});