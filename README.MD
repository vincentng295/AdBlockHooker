# 🛡️ AdBlock Based-Hook Extension (Manifest V3)

A lightweight ad blocking Chrome Extension based on the **Hook API (Monkey Patching)** method at the site context layer (`MAIN world`). This utility allows users to manually load any list of `hosts` files (AdGuard, StevenBlack, hostsVN...) to block advertising connections, tracking (tracking) from `fetch`, `XMLHttpRequest`, `WebSocket`, `navigator.sendBeacon` and DOM attributes (`src`, `href`, `action`).

---

## ✨ Outstanding features

* **Comprehensive Hooks:** Block and redirect malicious requests from `fetch`, `XHR`, `WebSocket`, `sendBeacon`.
* **DOM Attributes Interceptor:** Hooks directly into the `src`, `href`, `action` attributes of HTML tags (`<script>`, `<img>`, `<iframe>`, `<form>`,...) to prevent loading ads at the root.
* **Anti-Adblock:** Built-in Proxy wrap around `Function.prototype.toString`, `Function.prototype.bind` and `Object.getOwnPropertyDescriptor` helps disguise hook functions as the browser's Native `[native code]` function, bypassing advanced Adblock detectors.
* **No CORS Error (YouTube Fixed):** Optimized the `Request` instance handling mechanism, ensuring YouTube video streaming streams do not get CORS Preflight (`OPTIONS`) errors.
* **Flexible Management:** Simple Popup UI, storing the list of domains to block directly into `chrome.storage.local` with $O(1)$ optimal search algorithm.

---

## 🚀 Installation instructions (Developer Mode)

1. **Download source code:** Download the entire folder containing the above files to your computer.
2. **Open the Extension Management page:** Access the path `chrome://extensions/` on Chrome browser (or Edge, Opera, Brave).
3. **Enable Developer Mode:** Flip the **Developer mode** switch in the top right corner to **On** state.
4. **Load Extension:** Click the **Load unpacked** button in the upper left corner, then point to the folder containing the source code of this Extension.
5. **Pin Extension:** Find the extension named *AdBlock Based-Hook Extension* and pin it to the toolbar for easy use.

---

## 📖 Instructions for use

1. Click on the Extension icon on the toolbar to open the configuration interface.
2. Enter the URL containing the `hosts` file you want to use. *By default the extension has pre-filled a minimal set of hosts from `hostsVN*`.
3. Click the **Download and Update** button. The extension will automatically download the file, filter out comment lines, extract a list of domains and save it to local memory.
4. F5 (Reload) open web pages to activate the new filter. You can open `F12 / Console` to check the logs like `[AdBlock Hook Blocked]` when ads are blocked.

---

## 🛠️ Technical operating mechanism

### 1. Overcoming the boundary of isolation (Extension Isolation)

By default, Chrome Extension's `content_script` runs in an isolated environment (`ISOLATED world`), unable to interfere with the website's `window` object. This extension solves the problem by using `content.js` to create a dynamic `<script>` tag to inject the `inject.js` file straight into the `MAIN world` environment before the website can load any source code (`run_at: document_start`). Configuration data is securely transferred between the two environments via `CustomEvent`.

### 2. Optimal testing algorithm

Instead of saving the hosts list as an Array and using `includes()` which costs $O(N)$ resources, the extension converts the data into an Object Key-Value stored in memory:

```javascript
{ "ads.google.com": true, "tracker.com": true }

```

Checking for blocked domains now reaches a maximum speed of $O(1)$. The system also automatically dissects and checks from Subdomain to Root domain (for example, checks `sub.ads.example.com` $\rightarrow$ `ads.example.com` $\rightarrow$ `example.com`) to avoid missing ads.

### 3. Jaw camouflage (Hardening & Anonymity)

The system uses advanced Proxy techniques to interfere with JavaScript reflectors:

* Override `Function.prototype.toString` so that when calling `.toString()` on `fetch` or `open`, the browser always returns `function fetch() { [native code] }`.
* Override `Object.getOwnPropertyDescriptor` so that when anti-adblock scripts intentionally strip the `set` attribute of `HTMLScriptElement.prototype.src`, the system will return the browser's original Setter function, completely hiding the existence of the Proxy.
* Check the detection at [https://vincentng295.github.io/hook-js-detection](https://vincentng295.github.io/hook-js-detection/)

---

## ⚠️ Important note

* This extension is built based on the **Hook JavaScript** method, it only works with requests triggered by script code or DOM tags that are created/changed properties after the script inject runs. It is not a complete replacement for `chrome.declarativeNetRequest` (which is blocked at the browser's network layer).
* Make sure the hosts file URL you enter returns the standard plain-text format of the hosts file (`IP_Address Domain_Name`).

---

## 📝 License

This project is provided completely free of charge under the purpose of learning and technological research (`MIT License`). You are free to edit and develop further.
