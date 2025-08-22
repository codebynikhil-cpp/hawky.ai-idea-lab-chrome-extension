// LoginComponent.js

class LoginComponent {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  render() {
    this.container.innerHTML = `
        <div class="flex p-4 flex-col items-center justify-center h-full">
              <div class="flex justify-center items-center mb-4">
        <img src="assets/hawkyai.png" class="w-4/5" alt="HAWKY.ai" />
      </div>
          <button id="login-button" class="bg-black text-white py-2 px-4 rounded-md mb-2 w-full">
            Login
          </button>
          <div class="text-center text-sm text-gray-500 mb-2">or</div>
          <button id="google-login-button" class="bg-red-500 text-white py-2 px-4 rounded-md w-full">
            Login with Google
          </button>
        </div>
      `;

    this.addEventListeners();
  }

  addEventListeners() {
    const loginButton = document.getElementById('login-button');
    const googleLoginButton = document.getElementById('google-login-button');

    loginButton.addEventListener('click', () => this.handleLogin());
    googleLoginButton.addEventListener('click', () => this.handleGoogleLogin());
  }

  handleLogin() {
    console.log('Regular login clicked');
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      var activeTab = tabs[0];
      chrome.tabs.update(activeTab.id, { url: 'https://www.hawky.xyz/' });
    });
  }
  

  handleGoogleLogin() {
    console.log('Google login clicked');
    // Implement your Google login logic here
    // After successful login, you should update the login status and show the feed
  }

}

export default LoginComponent;