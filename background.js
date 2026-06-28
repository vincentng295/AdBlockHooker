chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "downloadHosts") {
    const targetUrls = message.urls || [];
    const localDomains = message.localDomains || {};
    
    downloadAndParseMultipleHosts(targetUrls, localDomains);
    sendResponse({ status: "started" }); 
  }
  return true;
});

async function downloadAndParseMultipleHosts(urls, localDomains) {
  try {
    await chrome.storage.local.set({ 
      downloadStatus: { state: "loading", message: "Aggregating and Compiling all hosts sources..." } 
    });

    const combinedBlockedDomains = { ...localDomains };

    for (const url of urls) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          console.error(`Skipped error link: ${url}`);
          continue;
        }
        
        const text = await response.text();
        const lines = text.split('\n');
        
        lines.forEach(line => {
          line = line.trim();
          if (!line || line.startsWith('#')) return;
          
          const parts = line.split(/\s+/);
          if (parts.length >= 2) {
            const domain = parts[1].trim().toLowerCase();
            combinedBlockedDomains[domain] = true;
          } else if (parts.length === 1 && parts[0]) {
            const domain = parts[0].trim().toLowerCase();
            combinedBlockedDomains[domain] = true;
          }
        });
      } catch (e) {
        console.error(`Error connecting to source: ${url}`, e);
      }
    }

    const totalCount = Object.keys(combinedBlockedDomains).length;

    await chrome.storage.local.set({ 
      hostsUrls: urls, 
      hostsData: combinedBlockedDomains,
      blockedCount: totalCount,
      downloadStatus: { 
        state: "success", 
        message: `Successfully combined ${totalCount} unique domains from all online & local sources!` 
      }
    });

  } catch (error) {
    await chrome.storage.local.set({ 
      downloadStatus: { state: "error", message: "Failed to compile database: " + error.message } 
    });
  }
}

// Helper function to check if a URL is in your adblock list
function isUrlBlocked(urlStr, blockedDomains) {
  if (!urlStr || typeof urlStr !== "string") return false;
  try {
    let hostname = urlStr.replace(/^(.*?:\/\/)?(www\.)?/, '').split('/')[0].split('?')[0];
    hostname = hostname.split(':')[0].toLowerCase(); 

    let currentDomain = hostname;
    while (currentDomain) {
      if (blockedDomains[currentDomain]) return true;
      const dotIndex = currentDomain.indexOf('.');
      if (dotIndex === -1) break;
      currentDomain = currentDomain.substring(dotIndex + 1);
    }
  } catch (e) {}
  return false;
}

// Listen for new window/tab creation targets
chrome.webNavigation.onCreatedNavigationTarget.addListener((details) => {
  const targetUrl = details.url;
  const targetTabId = details.tabId; // The ID of the newly created window/tab

  chrome.storage.local.get(['hostsData'], (result) => {
    const blockedDomains = result.hostsData || {};

    // If the target URL is in the adblock list, CLOSE the new window/tab immediately!
    if (isUrlBlocked(targetUrl, blockedDomains)) {
      console.log(`[AdBlock Window] URL inside adblock list detected: ${targetUrl}. Closing window...`);
      
      // Force close the newly created about:blank window/tab instantly
      chrome.tabs.remove(targetTabId).catch((err) => {
        console.log("[AdBlock Window] Tab already closed or could not be removed:", err);
      });
    }
  });
});