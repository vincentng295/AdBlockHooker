const defaultUrl = "https://raw.githubusercontent.com/bigdargon/hostsVN/master/hosts";

// Hiển thị URL cũ khi mở popup
chrome.storage.local.get(['hostsUrl', 'blockedCount'], (res) => {
  document.getElementById('hostUrl').value = res.hostsUrl || defaultUrl;
  if(res.blockedCount) {
    document.getElementById('status').innerText = `Blocking: ${res.blockedCount} domains.`;
  }
});

document.getElementById('btnDownload').addEventListener('click', async () => {
  const url = document.getElementById('hostUrl').value.trim();
  const statusDiv = document.getElementById('status');
  
  if (!url) {
    statusDiv.style.color = "red";
    statusDiv.innerText = "Please enter a valid URL!";
    return;
  }

  statusDiv.style.color = "black";
  statusDiv.innerText = "Downloading hosts list...";

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Cannot download file from this URL.");
    
    const text = await response.text();
    
    // Parse file hosts
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
      blockedCount: domainCount
    });

    statusDiv.style.color = "green";
    statusDiv.innerText = `Success! Downloaded and saved ${domainCount} domains. Please refresh the web pages.`;

  } catch (error) {
    statusDiv.style.color = "red";
    statusDiv.innerText = "Error: " + error.message;
  }
});