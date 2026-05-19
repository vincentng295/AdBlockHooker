const script = document.createElement('script');
script.src = chrome.runtime.getURL('inject.js');
script.onload = function() {
    this.remove();
};
(document.head || document.documentElement).appendChild(script);

chrome.storage.local.get(['hostsData', 'fakeSuccess', 'whitelistDomains'], (result) => {
    const blockedDomains = result.hostsData || {};
    const fakeSuccess = result.fakeSuccess !== false; 
    const whitelist = result.whitelistDomains || {};
    const currentHost = window.location.hostname.toLowerCase();
    const isWhitelisted = !!whitelist[currentHost];

    const sendDataToInject = () => {
        window.dispatchEvent(new CustomEvent("SendAdblockHostsList", {
            detail: {
                hosts: blockedDomains,
                fakeSuccess: fakeSuccess,
                isWhitelisted: isWhitelisted
            }
        }));
    };

    window.addEventListener("GetAdblockHostsList", (event) => {
        sendDataToInject();
    }, { once: true });

    sendDataToInject();
});