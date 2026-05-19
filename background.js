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