
const createHforPostButton = (forButton) => {
    const button = document.createElement('button');
    const img = document.createElement('img');
    img.src = chrome.runtime.getURL('icons/icon48.png');
    img.style.width = '20px';  // Adjust size as needed
    img.style.height = '20px';
    img.className = 'h-icon';
    button.appendChild(img);
    button.style.cssText = `
        position: absolute;
        z-index: 9999;
        right: ${forButton === 'single' ? '16' : '0'}px;
        top: ${forButton === 'single' ? '2' : '-10'}px;
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
    return button;
};

const sendToInstagramFeed = (details) => {
    console.log('Post details:', details);
    const domain = new URL(window.location.href).hostname;
    chrome.runtime.sendMessage({
        ...details,
        action: 'addToFeed',
        time: new Date().toISOString(),
        domainName: domain
    }, response => {
        if (response.status === "success") {
            console.log("Item added to feed successfully");
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
    const postLinkElement = postContainer.querySelector('a[href*="/p/"]');
    return postLinkElement ? postLinkElement.href : 'No link';
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
    return window.location.href;
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

    sendToInstagramFeed(postDetails);
};

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
        if (!postContainer.querySelector('.h-button')) {
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

// Call this function after the page loads
window.addEventListener('load', () => {
    observePostChanges();
    if (window.location.href.includes('www.instagram.com/')) {
        addCloneUserButton();
    }
});