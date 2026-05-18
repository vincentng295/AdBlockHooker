const defaultUrl = "https://raw.githubusercontent.com/bigdargon/hostsVN/master/hosts";
const statusDiv = document.getElementById('status');
const hostUrlInput = document.getElementById('hostUrl');
const toggleFakeSuccess = document.getElementById('toggleFakeSuccess');

function updateUI(res) {
  hostUrlInput.value = res.hostsUrl || defaultUrl;
  
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
    statusDiv.innerText = `Blocking: ${res.blockedCount} domains.`;
  }
}

chrome.storage.local.get(['hostsUrl', 'blockedCount', 'downloadStatus', 'fakeSuccess'], (res) => {
  updateUI(res);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    chrome.storage.local.get(['hostsUrl', 'blockedCount', 'downloadStatus', 'fakeSuccess'], (res) => {
      updateUI(res);
    });
  }
});

toggleFakeSuccess.addEventListener('change', () => {
  chrome.storage.local.set({ fakeSuccess: toggleFakeSuccess.checked });
});

document.getElementById('btnDownload').addEventListener('click', () => {
  const url = hostUrlInput.value.trim();
  
  if (!url) {
    statusDiv.style.color = "red";
    statusDiv.innerText = "Please enter a valid URL!";
    return;
  }

  chrome.runtime.sendMessage({ action: "downloadHosts", url: url }, (response) => {
    if (chrome.runtime.lastError) {
      statusDiv.style.color = "red";
      statusDiv.innerText = "Background script connection error. Please try again.";
    }
  });
});