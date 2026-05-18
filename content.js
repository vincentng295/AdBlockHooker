chrome.storage.local.get(['hostsData'], (result) => {
    const blockedDomains = result.hostsData || {};

    window.addEventListener("GetAdblockHostsList", (event) => {
        window.dispatchEvent(new CustomEvent("SendAdblockHostsList", {
            detail: blockedDomains
        }));
    }, { once: true });

    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('inject.js');
    script.onload = function() {
        this.remove();
    };
    (document.head || document.documentElement).appendChild(script);
});