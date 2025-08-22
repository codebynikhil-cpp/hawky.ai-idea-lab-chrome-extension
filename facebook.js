
const createHforFacebookPostButton = (buttonFor) => {
    const button = document.createElement('button');
    const img = document.createElement('img');
    img.src = chrome.runtime.getURL('/icons/icon48.png');
    img.style.width = '20px';  // Adjust size as needed
    img.style.height = '20px';
    img.className = 'h-icon';
    button.appendChild(img);
    button.style.cssText = `
        position: absolute;
        z-index: 9999;
        top:${buttonFor === 'single' ? '80' : '18'}px;
        right: ${buttonFor === 'single' ? '60' : '90'}px;
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
    return button;
};
const sendToFacebookFeed = (details) => {
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

const extractFacebookAuthor = (postContainer) => {
    const authorElement = postContainer.querySelector('a[role="link"] strong span');
    return authorElement ? authorElement.textContent.trim() : 'Unknown';
};

const extractFacebookDate = (postContainer) => {
    const timestampElement = postContainer.querySelector('a[href*="permalink"][role="link"] span');
    if (timestampElement) {
        return timestampElement.textContent.trim();
    }
    const alternativeElement = postContainer.querySelector('span[id^=":r"] span.x4k7w5x');
    if (alternativeElement) {
        return alternativeElement.textContent.trim();
    }
    const possibleTimeElements = postContainer.querySelectorAll('span');
    for (const element of possibleTimeElements) {
        const text = element.textContent.trim();
        if (text.match(/(\d+\s*(min|hr|d|w|mo|yr))|((Just|\d+\s*hour[s]?) [Nn]ow)/)) {
            return text;
        }
    }
    return 'Unknown';
};

const extractFacebookContent = (postContainer) => {
    const captionElement = postContainer.querySelector('div[dir="auto"].xdj266r.x11i5rnm.xat24cr.x1mh8g0r.x1vvkbs.x126k92a');
    if (captionElement) {
        return captionElement.textContent.trim();
    } else {
        const generalCaptionElement = postContainer.querySelector('div[data-ad-preview="message"]');
        if (generalCaptionElement) {
            return generalCaptionElement.textContent.trim();
        }
        return 'No content';
    }
};

const extractFacebookImageUrl = (postContainer) => {
    const imageElement = postContainer.querySelector('img.x1ey2m1c.xds687c.x5yr21d.x10l6tqk.x17qophe.x13vifvy.xh8yej3.xl1xv1r');
    if (imageElement) {
        imageElement.crossOrigin = "Anonymous";
        return new Promise((resolve) => {
            imageElement.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = imageElement.width;
                canvas.height = imageElement.height;
                ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/png'));
            };
            imageElement.src = imageElement.src; // Reload the image
        });
    }
    return Promise.resolve('No image');
};

const extractFacebookLink = (postContainer) => {
    const linkElement = postContainer.querySelector('a[role="link"]');
    return linkElement ? linkElement.href : window.location.href;
};

const extractFacebookLikes = (postContainer) => {
    const likesElement = postContainer.querySelector('span.xt0b8zv.x1e558r4');
    return likesElement ? likesElement.textContent.trim() : 'Unknown';
};

const extractFacebookComments = (postContainer) => {
    const commentsElement = postContainer.querySelector('span[dir="auto"]:not([class*="x1lliihq"])');
    return commentsElement ? commentsElement.textContent.split(' ')[0] : 'Unknown';
};

const extractFacebookShares = (postContainer) => {
    const sharesElement = postContainer.querySelector('span[dir="auto"]:not([class*="x1lliihq"]):last-of-type');
    return sharesElement ? sharesElement.textContent.split(' ')[0] : 'Unknown';
};


const extractFacebookAuthorSinglePost = (postContainer) => {
    const authorElement = postContainer.querySelector('h2.html-h2 a');
    return authorElement ? authorElement.textContent.trim() : 'Unknown';
};

const extractFacebookDateSinglePost = (postContainer) => {
    const dateElement = postContainer.querySelector('span.x4k7w5x.x1h91t0o.x1h9r5lt.x1jfb8zj.xv2umb2.x1beo9mf.xaigb6o.x12ejxvf.x3igimt.xarpa2k.xedcshv.x1lytzrv.x1t2pt76.x7ja8zs.x1qrby5j a');
    return dateElement ? dateElement.textContent.trim() : 'Unknown';
};

const extractFacebookImageUrlSinglePost = (postContainer) => {
    const imageElement = postContainer.querySelector('img.x1bwycvy.x193iq5w.x4fas0m.x19kjcj4');
    if (imageElement) {
        imageElement.crossOrigin = "Anonymous";
        return new Promise((resolve) => {
            imageElement.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = imageElement.width;
                canvas.height = imageElement.height;
                ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/png'));
            };
            imageElement.src = imageElement.src; // Reload the image
        });
    }
    return Promise.resolve('No image');
};

function extractFacebookContentSinglePost(postContainer) {
    // First, try to find the content in the previously defined element
    const captionElements = postContainer.querySelectorAll(
        '.html-span.xdj266r.x11i5rnm.xat24cr.xmh8g0r'
    );

    if (captionElements.length) {
        const captions = Array.from(captionElements).map(el => el.textContent.trim());
        return captions.join('\n\n');
    }

    // If the above doesn't work, try the new element you've identified
    const newContentElement = postContainer.querySelector('.xyinxu5.x4uap5.x1g2khh7.xkhd6sd');
    if (newContentElement) {
        return newContentElement.textContent.trim();
    }

    // If still no content is found, try a more general approach
    const possibleContentElements = postContainer.querySelectorAll('div[dir="auto"]');
    if (possibleContentElements.length) {
        const contents = Array.from(possibleContentElements).map(el => el.textContent.trim());
        return contents.join('\n\n');
    }

    // If no content is found at all
    return 'No content found in this post.';
}





const extractFacebookLinkSinglePost = () => {
    return window.location.href;
};

const extractFacebookLikesSinglePost = (postContainer) => {
    const likesElement = postContainer.querySelector('div[aria-label*="reactions"]');
    return likesElement ? likesElement.textContent.trim() : 'Unknown';
};

const extractFacebookCommentsSinglePost = (postContainer) => {
    const commentsElement = postContainer.querySelector('div[aria-label*="comment"]');
    return commentsElement ? commentsElement.textContent.trim().split(' ')[0] : 'Unknown';
};

const extractFacebookSharesSinglePost = (postContainer) => {
    const sharesElement = postContainer.querySelector('div[aria-label*="share"]');
    return sharesElement ? sharesElement.textContent.trim().split(' ')[0] : 'Unknown';
};

const handleFacebookHButtonClick = async (event, postContainer, isSinglePost) => {
    event.preventDefault();
    event.stopPropagation();

    let postDetails;

    if (isSinglePost) {
        const imageUrl = await extractFacebookImageUrlSinglePost(postContainer);
        postDetails = {
            author: extractFacebookAuthorSinglePost(postContainer),
            date: extractFacebookDateSinglePost(postContainer),
            caption: extractFacebookContentSinglePost(postContainer),
            imageDataUrl: imageUrl,
            link: extractFacebookLinkSinglePost(),
            likes: extractFacebookLikesSinglePost(postContainer),
            comments: extractFacebookCommentsSinglePost(postContainer),
            shares: extractFacebookSharesSinglePost(postContainer)
        };
    } else {
        const imageUrl = await extractFacebookImageUrl(postContainer);
        postDetails = {
            author: extractFacebookAuthor(postContainer),
            date: extractFacebookDate(postContainer),
            caption: extractFacebookContent(postContainer),
            imageDataUrl: imageUrl,
            link: extractFacebookLink(postContainer),
            likes: extractFacebookLikes(postContainer),
            comments: extractFacebookComments(postContainer),
            shares: extractFacebookShares(postContainer)
        };
    }

    sendToFacebookFeed(postDetails);
};

const addHButtonToFacebookSinglePost = () => {
    const postContainer = document.querySelector('div[aria-label="Photo viewer"].x78zum5.xdt5ytf.xg6iff7.x1n2onr6.x1ja2u2z.x443n21'); if (postContainer && !postContainer.querySelector('.h-button')) {
        const hButton = createHforFacebookPostButton("single");
        hButton.classList.add('h-button');
        postContainer.style.position = 'relative';
        postContainer.appendChild(hButton);

        hButton.addEventListener('click', (event) => handleFacebookHButtonClick(event, postContainer, true));
    }
};

const addHButtonToFacebookPosts = () => {
    const currentUrl = window.location.href;
    if (currentUrl.includes('/photo/') || currentUrl.includes('/permalink/')) {
        // Individual post page
        addHButtonToFacebookSinglePost();
    } else {
        // Feed page
        const postContainers = document.querySelectorAll('div.x1lliihq');
        postContainers.forEach(postContainer => {
            if (!postContainer.querySelector('.h-button')) {
                const hButton = createHforFacebookPostButton("feed");
                hButton.classList.add('h-button');
                postContainer.style.position = 'relative';
                postContainer.appendChild(hButton);

                hButton.addEventListener('click', (event) => handleFacebookHButtonClick(event, postContainer, false));
            }
        });
    }
};

//clone button
const addCloneFacebookUserButton = () => {
    const searchButtonContainer = document.querySelector('div.x78zum5.x1a02dak.x139jcc6.xcud41i.x9otpla.x1ke80iy');
    console.log(searchButtonContainer, 'searchButtonContainer executed');

    if (searchButtonContainer && !document.querySelector('.clone-userfb-button')) {
        // Create the main container div
        const mainDiv = document.createElement('div');
        mainDiv.classList.add('xsgj6o6', 'xw3qccf', 'x1xmf6yo', 'x1w6jkce', 'xusnbm3', 'clone-userfb-button');

        const innerDiv1 = document.createElement('div');
        innerDiv1.classList.add('xh8yej3');


        const buttonDiv = document.createElement('div');
        buttonDiv.setAttribute('aria-label', 'Clone User');
        buttonDiv.classList.add('x1i10hfl', 'xjbqb8w', 'x1ejq31n', 'xd10rxx', 'x1sy0etr', 'x17r0tee', 'x972fbf', 'xcfux6l', 'x1qhh985', 'xm0m39n', 'x1ypdohk', 'xe8uvvx', 'xdj266r', 'x11i5rnm', 'xat24cr', 'x1mh8g0r', 'xexx8yu', 'x4uap5', 'x18d9i69', 'xkhd6sd', 'x16tdsg8', 'x1hl2dhg', 'xggy1nq', 'x1o1ewxj', 'x3x9cwd', 'x1e5q0jg', 'x13rtm0m', 'x87ps6o', 'x1lku1pv', 'x1a2a7pz', 'x9f619', 'x3nfvp2', 'xdt5ytf', 'xl56j7k', 'x1n2onr6', 'xh8yej3');
        buttonDiv.setAttribute('role', 'button');
        buttonDiv.setAttribute('tabindex', '0');

        const innerDiv2 = document.createElement('div');
        innerDiv2.classList.add('x1n2onr6', 'x1ja2u2z', 'x78zum5', 'x2lah0s', 'xl56j7k', 'x6s0dn4', 'xozqiw3', 'x1q0g3np', 'xi112ho', 'x17zwfj4', 'x585lrc', 'x1403ito', 'x972fbf', 'xcfux6l', 'x1qhh985', 'xm0m39n', 'x9f619', 'xn6708d', 'x1ye3gou', 'x1qhmfi1', 'x1r1pt67');

        const innerDiv3 = document.createElement('div');
        innerDiv3.classList.add('x6s0dn4', 'x78zum5', 'xl56j7k', 'x1608yet', 'xljgi0e', 'x1e0frkt');

        const innerDiv4 = document.createElement('div');
        innerDiv4.classList.add('x9f619', 'x1n2onr6', 'x1ja2u2z', 'x193iq5w', 'xeuugli', 'x6s0dn4', 'x78zum5', 'x2lah0s', 'x1fbi1t2', 'xl8fo4v');

        const img = document.createElement('img');
        img.classList.add('x1b0d499', 'xep6ejk');
        img.setAttribute('alt', '');
        img.setAttribute('aria-hidden', 'true');
        img.setAttribute('height', '16');
        img.setAttribute('width', '16');
        img.src = chrome.runtime.getURL('icons/icon48.png');

        const spanDiv = document.createElement('div');
        spanDiv.classList.add('x9f619', 'x1n2onr6', 'x1ja2u2z', 'x193iq5w', 'xeuugli', 'x6s0dn4', 'x78zum5', 'x2lah0s', 'x1fbi1t2', 'xl8fo4v');

        const span = document.createElement('span');
        span.classList.add('x193iq5w', 'xeuugli', 'x13faqbe', 'x1vvkbs', 'x1xmvt09', 'x1lliihq', 'x1s928wv', 'xhkezso', 'x1gmr53x', 'x1cpjm7i', 'x1fgarty', 'x1943h6x', 'xudqn12', 'x3x7a5m', 'x6prxxf', 'xvq8zen', 'x1s688f', 'x1dem4cn');
        span.setAttribute('dir', 'auto');

        const innerSpan = document.createElement('span');
        innerSpan.classList.add('x1lliihq', 'x6ikm8r', 'x10wlt62', 'x1n2onr6', 'xlyipyv', 'xuxw1ft');
        innerSpan.textContent = 'Clone User';

        span.appendChild(innerSpan);
        spanDiv.appendChild(span);
        innerDiv4.appendChild(img);
        innerDiv4.appendChild(spanDiv);
        innerDiv3.appendChild(innerDiv4);
        innerDiv2.appendChild(innerDiv3);
        buttonDiv.appendChild(innerDiv2);
        innerDiv1.appendChild(buttonDiv);
        mainDiv.appendChild(innerDiv1);

        mainDiv.addEventListener('click', handleCloneFacebookUserClick);

        // Add the new button after the search button
        searchButtonContainer.appendChild(mainDiv);
    }
};

const handleCloneFacebookUserClick = (event) => {
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


const observeFacebookChanges = () => {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                const addedNodes = mutation.addedNodes;
                addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE && window.location.href.includes('www.facebook.com')) {
                        const currentUrl = window.location.href;
                        if (currentUrl.includes('/posts/') || currentUrl.includes('/permalink/')) {
                            addHButtonToFacebookSinglePost();
                        } else if (node.querySelector('div.x1lliihq')) {
                            addHButtonToFacebookPosts();
                        }

                        addCloneFacebookUserButton();
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

window.addEventListener('load', () => {
    observeFacebookChanges();
    if (location.href.includes('www.facebook.com/')) {
        addCloneFacebookUserButton();
    }
});
