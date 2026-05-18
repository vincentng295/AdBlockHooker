const defaultUrl = "https://raw.githubusercontent.com/bigdargon/hostsVN/master/hosts";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "downloadHosts") {
    downloadAndParseHosts(message.url);
    sendResponse({ status: "started" }); 
  }
  return true;
});

async function downloadAndParseHosts(url) {
  try {
    await chrome.storage.local.set({ 
      downloadStatus: { state: "loading", message: "Downloading hosts list..." } 
    });

    const response = await fetch(url);
    if (!response.ok) throw new Error("Cannot download file from this URL.");
    
    const text = await response.text();
    
    const lines = text.split('\n');
    const blockedDomains = {};
    
    lines.forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('#')) return;
      
      const parts = line.split(/\s+/);
      if (parts.length >= 2) {
        const domain = parts[1].trim().toLowerCase();
        blockedDomains[domain] = true;
      }
    });

    const domainCount = Object.keys(blockedDomains).length;

    await chrome.storage.local.set({ 
      hostsUrl: url, 
      hostsData: blockedDomains,
      blockedCount: domainCount,
      downloadStatus: { 
        state: "success", 
        message: `Success! Downloaded and saved ${domainCount} domains. Please refresh the web pages.` 
      }
    });

  } catch (error) {
    await chrome.storage.local.set({ 
      downloadStatus: { state: "error", message: "Error: " + error.message } 
    });
  }
}