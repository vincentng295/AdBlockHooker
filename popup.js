const defaultUrl = "https://raw.githubusercontent.com/bigdargon/hostsVN/master/hosts";
const statusDiv = document.getElementById('status');
const urlContainer = document.getElementById('urlContainer');
const btnAddUrl = document.getElementById('btnAddUrl');
const fileInput = document.getElementById('fileInput');
const fileNameLabel = document.getElementById('fileNameLabel');
const toggleFakeSuccess = document.getElementById('toggleFakeSuccess');
const toggleWhitelist = document.getElementById('toggleWhitelist');

let currentTabHostname = "";
let localUploadedDomains = {};

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0] && tabs[0].url) {
    try {
      const urlObj = new URL(tabs[0].url);
      if (urlObj.protocol.startsWith('http')) {
        currentTabHostname = urlObj.hostname.toLowerCase();
        chrome.storage.local.get(['whitelistDomains'], (res) => {
          const whitelist = res.whitelistDomains || {};
          toggleWhitelist.checked = !!whitelist[currentTabHostname];
        });
        return;
      }
    } catch (e) {}
  }
  toggleWhitelist.disabled = true;
});

function createUrlRow(value = "") {
  const row = document.createElement('div');
  row.className = 'url-row';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'host-url-input';
  input.placeholder = 'https://example.com/hosts';
  input.value = value;

  row.appendChild(input);

  if (urlContainer.children.length > 0) {
    const btnRemove = document.createElement('button');
    btnRemove.className = 'btn-icon btn-remove';
    btnRemove.innerText = '×';
    btnRemove.addEventListener('click', () => {
      row.remove();
    });
    row.appendChild(btnRemove);
  }

  urlContainer.appendChild(row);
}

function updateUI(res) {
  const urls = res.hostsUrls || [defaultUrl];
  
  if (urlContainer.children.length === 0) {
    urls.forEach(url => createUrlRow(url));
  }

  toggleFakeSuccess.checked = res.fakeSuccess !== false;

  if (res.downloadStatus || res.blockedCount) {
    statusDiv.style.display = "block";
  } else {
    statusDiv.style.display = "none";
  }

  if (res.downloadStatus) {
    statusDiv.innerText = res.downloadStatus.message;
    if (res.downloadStatus.state === "loading") {
      statusDiv.style.background = "var(--status-info-bg)";
      statusDiv.style.color = "var(--status-info-text)";
    } else if (res.downloadStatus.state === "success") {
      statusDiv.style.background = "var(--status-success-bg)";
      statusDiv.style.color = "var(--status-success-text)";
    } else if (res.downloadStatus.state === "error") {
      statusDiv.style.background = "var(--status-error-bg)";
      statusDiv.style.color = "var(--status-error-text)";
    }
  } else if (res.blockedCount) {
    statusDiv.style.background = "var(--status-info-bg)";
    statusDiv.style.color = "var(--status-info-text)";
    statusDiv.innerText = `Total Blocking: ${res.blockedCount} domains.`;
  }
}

btnAddUrl.addEventListener('click', () => createUrlRow(""));

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  fileNameLabel.innerText = `📄 ${file.name}`;
  const reader = new FileReader();
  reader.onload = function(evt) {
    const text = evt.target.result;
    const lines = text.split('\n');
    localUploadedDomains = {};

    lines.forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('#')) return;
      const parts = line.split(/\s+/);
      if (parts.length >= 2) {
        const domain = parts[1].trim().toLowerCase();
        localUploadedDomains[domain] = true;
      } else if (parts.length === 1 && parts[0]) {
        const domain = parts[0].trim().toLowerCase();
        localUploadedDomains[domain] = true;
      }
    });
    
    statusDiv.style.display = "block";
    statusDiv.style.background = "var(--status-info-bg)";
    statusDiv.style.color = "var(--status-info-text)";
    statusDiv.innerText = `Loaded ${Object.keys(localUploadedDomains).length} domains from file local. Please click Sync to combine.`;
  };
  reader.readAsText(file);
});

toggleWhitelist.addEventListener('change', () => {
  if (!currentTabHostname) return;
  chrome.storage.local.get(['whitelistDomains'], (res) => {
    const whitelist = res.whitelistDomains || {};
    if (toggleWhitelist.checked) {
      whitelist[currentTabHostname] = true;
    } else {
      delete whitelist[currentTabHostname];
    }
    chrome.storage.local.set({ whitelistDomains: whitelist });
  });
});

toggleFakeSuccess.addEventListener('change', () => {
  chrome.storage.local.set({ fakeSuccess: toggleFakeSuccess.checked });
});

document.getElementById('btnDownload').addEventListener('click', () => {
  const inputs = document.querySelectorAll('.host-url-input');
  const urls = [];
  inputs.forEach(input => {
    const val = input.value.trim();
    if (val) urls.push(val);
  });

  chrome.runtime.sendMessage({ 
    action: "downloadHosts", 
    urls: urls,
    localDomains: localUploadedDomains
  });
});

chrome.storage.local.get(['hostsUrls', 'blockedCount', 'downloadStatus', 'fakeSuccess'], (res) => {
  updateUI(res);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    chrome.storage.local.get(['hostsUrls', 'blockedCount', 'downloadStatus', 'fakeSuccess'], (res) => {
      updateUI(res);
    });
  }
});