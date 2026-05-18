chrome.storage.local.get(['hostsData', 'fakeSuccess'], (result) => {
    const blockedDomains = result.hostsData || {};
    const fakeSuccess = result.fakeSuccess !== false; 

    window.addEventListener("GetAdblockHostsList", (event) => {
        window.dispatchEvent(new CustomEvent("SendAdblockHostsList", {
            detail: {
                hosts: blockedDomains,
                fakeSuccess: fakeSuccess
            }
        }));
    }, { once: true });

    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('inject.js');
    script.onload = function() {
        this.remove();
    };
    (document.head || document.documentElement).appendChild(script);
});