(function () {
    const console_log = console.log;
    let BLOCKED_DOMAINS = {};
    let __adblockTrustedPolicy = null;

    // =====================================================
    // STATIC TAGS INTERCEPTOR (MUTATION OBSERVER)
    // =====================================================
    const observeStaticTags = () => {
        const checkAndSanitizeNode = (node) => {
            if (node.nodeType !== Node.ELEMENT_NODE) return;

            const tagName = node.tagName;
            
            if (["SCRIPT", "IMG", "IFRAME", "VIDEO", "AUDIO", "SOURCE"].includes(tagName)) {
                const src = node.getAttribute("src");
                if (src && isBlockList(src)) {
                    console_log("[Static Tag Blocked - SRC]", tagName, src);
                    node.removeAttribute("src");
                    if (tagName === "SCRIPT") {
                        const src = node.getAttribute("src");
                        if (src && isBlockList(src)) {
                            console_log("[Static Tag Blocked - SRC]", tagName, src);
                            node.removeAttribute("src");
                            let safeContent = ""; 
                            if (window.trustedTypes) {
                                if (!__adblockTrustedPolicy) {
                                    const defaultPolicy = window.trustedTypes.defaultPolicy;
                                    if (defaultPolicy) {
                                        __adblockTrustedPolicy = defaultPolicy
                                    } else {
                                        __adblockTrustedPolicy = window.trustedTypes.createPolicy("default");
                                    }
                                }
                                try {
                                    safeContent = __adblockTrustedPolicy.createScript("");
                                } catch {
                                    console_log("[TrustedTypes] Failed to create safe script content, fallback to empty string");
                                }
                            }

                            try {
                                node.textContent = safeContent;
                            } catch (err) {
                                node.remove();
                            }
                        }
                    }
                    node.remove(); 
                }
            }
            
            else if (["LINK", "A"].includes(tagName)) {
                const href = node.getAttribute("href");
                if (href && isBlockList(href)) {
                    console_log("[Static Tag Blocked - HREF]", tagName, href);
                    node.removeAttribute("href");
                    node.remove();
                }
            }
            
            else if (tagName === "FORM") {
                const action = node.getAttribute("action");
                if (action && isBlockList(action)) {
                    console_log("[Static Tag Blocked - ACTION]", tagName, action);
                    node.setAttribute("action", "javascript:void(0);");
                }
            }
        };

        const domObserver = new MutationObserver((mutations) => {
            for (let i = 0; i < mutations.length; i++) {
                const addedNodes = mutations[i].addedNodes;
                for (let j = 0; j < addedNodes.length; j++) {
                    const node = addedNodes[j];
                    
                    checkAndSanitizeNode(node);
                    
                    if (node.getElementsByTagName) {
                        const subElements = node.querySelectorAll("script, img, iframe, video, audio, source, link, a, form");
                        for (let k = 0; k < subElements.length; k++) {
                            checkAndSanitizeNode(subElements[k]);
                        }
                    }
                }
            }
        });

        domObserver.observe(document.documentElement || document, {
            childList: true,
            subtree: true,
        });
        
        const existingElements = document.querySelectorAll("script, img, iframe, video, audio, source, link, a, form");
        existingElements.forEach(checkAndSanitizeNode);
    };

    if (document.documentElement) {
        observeStaticTags();
    } else {
        const checkDoc = setInterval(() => {
            if (document.documentElement) {
                clearInterval(checkDoc);
                observeStaticTags();
            }
        }, 0);
    }

    window.addEventListener("SendAdblockHostsList", (event) => {
        if (event.detail) {
            BLOCKED_DOMAINS = event.detail.hosts || {};
            FAKE_SUCCESS_ENABLED = event.detail.fakeSuccess !== false;
            console_log("[AdBlock Hook] Load successfully with", Object.keys(BLOCKED_DOMAINS).length, "domains. FakeSuccess:", FAKE_SUCCESS_ENABLED);
        }
    }, { once: true });

    window.dispatchEvent(new CustomEvent("GetAdblockHostsList"));

    // ===== URL PROCESSOR =====
    function isBlockList(urlStr) {
        if (!urlStr || typeof urlStr !== "string") return false;
        
        try {
            let hostname = urlStr.replace(/^(.*?:\/\/)?(www\.)?/, '').split('/')[0].split('?')[0];
            hostname = hostname.split(':')[0].toLowerCase(); 

            let currentDomain = hostname;
            while (currentDomain) {
                if (BLOCKED_DOMAINS[currentDomain]) {
                    return true;
                }
                const dotIndex = currentDomain.indexOf('.');
                if (dotIndex === -1) break;
                currentDomain = currentDomain.substring(dotIndex + 1);
            }
        } catch (e) {}
        return false;
    }

    function processUrl(url) {
        if (typeof url !== "string") return url;

        try {
            if (isBlockList(url)) {
                console_log("[AdBlock Hook Blocked]", url);
                if (url.startsWith('http')) {
                    return "data:text/plain,";
                }
                return url;
            }
        } catch {
            return url;
        }
        return url;
    }

    // ===== STORE ORIGINAL =====
    const _fetch = window.fetch;
    const _open = XMLHttpRequest.prototype.open;
    const _send = XMLHttpRequest.prototype.send;
    const _WebSocket = window.WebSocket;
    const _toString = Function.prototype.toString;
    const _bind = Function.prototype.bind;
    const _sendBeacon = navigator.sendBeacon;
    const _getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

    // ===== NATIVE MASK SYSTEM =====
    const FAKE_MAP = new WeakMap();
    const ORIGINAL_DESCRIPTORS = new WeakMap();

    function mark(fn, str) {
        FAKE_MAP.set(fn, str);
        return fn;
    }

    // ===== PATCH toString =====
    const customToString = new Proxy(_toString, {
        apply(target, thisArg, args) {
            if (FAKE_MAP.has(thisArg)) {
                return FAKE_MAP.get(thisArg);
            }
            return Reflect.apply(target, thisArg, args);
        },
    });
    Function.prototype.toString = customToString;

    // ===== PATCH bind =====
    Function.prototype.bind = new Proxy(_bind, {
        apply(target, thisArg, args) {
            const bound = Reflect.apply(target, thisArg, args);
            if (FAKE_MAP.has(thisArg)) {
                FAKE_MAP.set(bound, "function () { [native code] }");
            }
            return bound;
        },
    });

    // ===== HARDENING: PATCH Object.getOwnPropertyDescriptor =====
    Object.getOwnPropertyDescriptor = new Proxy(_getOwnPropertyDescriptor, {
        apply(target, thisArg, args) {
            const desc = Reflect.apply(target, thisArg, args);
            if (desc && ORIGINAL_DESCRIPTORS.has(desc.set)) {
                desc.set = ORIGINAL_DESCRIPTORS.get(desc.set);
            }
            return desc;
        }
    });
    mark(Object.getOwnPropertyDescriptor, "function getOwnPropertyDescriptor() { [native code] }");


    // =====================================================
    // ANTI-DETECTION: IFRAME REALM JAILBREAK PROTECTION
    // =====================================================
    const descContentWindow = _getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
    const descContentDocument = _getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentDocument');

    if (descContentWindow && descContentWindow.get) {
        const customContentWindowGetter = function() {
            const win = descContentWindow.get.call(this);
            if (win && win.Function && win.Function.prototype) {
                try {
                    if (win.Function.prototype.toString !== customToString) {
                        win.Function.prototype.toString = customToString;
                    }
                } catch(e) {}
            }
            return win;
        };
        mark(customContentWindowGetter, "function get contentWindow() { [native code] }");
        Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
            get: customContentWindowGetter,
            configurable: true,
            enumerable: true
        });
    }

    if (descContentDocument && descContentDocument.get) {
        const customContentDocumentGetter = function() {
            const doc = descContentDocument.get.call(this);
            if (doc && doc.defaultView && doc.defaultView.Function && doc.defaultView.Function.prototype) {
                try {
                    if (doc.defaultView.Function.prototype.toString !== customToString) {
                        doc.defaultView.Function.prototype.toString = customToString;
                    }
                } catch(e) {}
            }
            return doc;
        };
        mark(customContentDocumentGetter, "function get contentDocument() { [native code] }");
        Object.defineProperty(HTMLIFrameElement.prototype, 'contentDocument', {
            get: customContentDocumentGetter,
            configurable: true,
            enumerable: true
        });
    }


    // =====================================================
    // HTML ATTRIBUTES HOOK (DOM HOOK) & ANONYMITY
    // =====================================================
    const patchAttribute = (tags, attr) => {
        tags.forEach((tag) => {
            const proto = window[tag]?.prototype;
            if (!proto) return;
            
            const desc = _getOwnPropertyDescriptor(proto, attr);
            if (!desc || !desc.set) return;

            const customSetter = function(value) {
                return desc.set.call(this, processUrl(value));
            };

            const nativeString = `function ${attr}() { [native code] }`;
            mark(customSetter, nativeString);
            
            Object.defineProperties(customSetter, {
                name: { value: attr, configurable: true },
                length: { value: 1, configurable: true }
            });

            ORIGINAL_DESCRIPTORS.set(customSetter, desc.set);

            Object.defineProperty(proto, attr, {
                set: customSetter,
                get: desc.get,
                configurable: true,
            });
        });
    };

    patchAttribute(["HTMLScriptElement", "HTMLImageElement", "HTMLIFrameElement", "HTMLVideoElement", "HTMLAudioElement", "HTMLSourceElement"], "src");
    patchAttribute(["HTMLLinkElement", "HTMLAnchorElement"], "href");
    patchAttribute(["HTMLFormElement"], "action");


    // =====================================================
    // FETCH HOOK
    // =====================================================
    const fetchContainer = {
        fetch(resource, config) {
            try {
                let __url = resource;
                if (resource instanceof Request) {
                    __url = resource.url;
                }
                if (isBlockList(__url)) {
                    console_log("[Blocked Fetch]", __url);
                    if (FAKE_SUCCESS_ENABLED) {
                        const fakeResponse = new Response(JSON.stringify({ blocked: true }), {
                            status: 200,
                            statusText: "OK",
                            headers: new Headers({ "Content-Type": "application/json" })
                        });
                        Object.defineProperty(fakeResponse, 'url', {
                            value: __url,
                            writable: false,
                            configurable: true,
                            enumerable: true
                        });
                        return Promise.resolve(fakeResponse);
                    } else {
                        return Promise.reject(new TypeError("Failed to fetch"));
                    }
                }
            } catch {}
            return _fetch.call(window, resource, config);
        }
    };

    const fetch = fetchContainer.fetch;
    mark(fetch, "function fetch() { [native code] }");
    Object.defineProperties(fetch, {
        name: { value: "fetch", configurable: true },
        length: { value: 1, configurable: true },
    });
    window.fetch = fetch;


    // =====================================================
    // XHR OPEN HOOK
    // =====================================================
    function open(method, url, async, user, password) {
        try {
            this._url = url; 
            this._isBlocked = isBlockList(url);

            if (this._isBlocked) {
                arguments[1] = "data:text/plain,"; 
            } else {
                arguments[1] = typeof processUrl === "function" ? processUrl(url) : url;
            }
        } catch (e) {}
        return _open.apply(this, arguments);
    }

    mark(open, "function open() { [native code] }");
    Object.defineProperties(open, {
        name: { value: "open", configurable: true },
    });
    XMLHttpRequest.prototype.open = open;


    // =====================================================
    // XHR SEND HOOK
    // =====================================================
    function send(body) {
        try {
            if (this._isBlocked) {
                console_log("[Blocked XHR Send]", this._url);
                if (FAKE_SUCCESS_ENABLED) {
                    Object.defineProperties(this, {
                        'readyState': { value: 4, configurable: true, writable: false },
                        'status': { value: 200, configurable: true, writable: false },
                        'statusText': { value: 'OK', configurable: true, writable: false },
                        'response': { value: '{}', configurable: true, writable: false },
                        'responseText': { value: '{}', configurable: true, writable: false },
                        'responseURL': { value: this._url, configurable: true, writable: false } 
                    });

                    setTimeout(() => {
                        if (typeof this.onreadystatechange === 'function') this.onreadystatechange();
                        if (typeof this.onload === 'function') this.onload();
                        
                        this.dispatchEvent(new Event('readystatechange'));
                        this.dispatchEvent(new Event('load'));
                    }, 1);}
                else {
                    Object.defineProperties(this, {
                        'readyState': { value: 4, configurable: true, writable: false },
                        'status': { value: 0, configurable: true, writable: false },
                        'statusText': { value: '', configurable: true, writable: false },
                        'response': { value: '', configurable: true, writable: false },
                        'responseText': { value: '', configurable: true, writable: false }
                    });

                    setTimeout(() => {
                        if (typeof this.onreadystatechange === 'function') this.onreadystatechange();
                        if (typeof this.onerror === 'function') this.onerror();
                        
                        this.dispatchEvent(new Event('readystatechange'));
                        this.dispatchEvent(new Event('error'));
                    }, 1);
                }
                return;
            }
        } catch (e) {}
        return _send.apply(this, arguments);
    }

    mark(send, "function send() { [native code] }");
    Object.defineProperties(send, {
        name: { value: "send", configurable: true },
    });
    XMLHttpRequest.prototype.send = send;


    // =====================================================
    // WEBSOCKET HOOK
    // =====================================================
    function FakeWebSocket(url, protocols) {
        if (!new.target) {
            throw new TypeError("Failed to construct 'WebSocket': Please use the 'new' operator, this DOM object cannot be converted to a function.");
        }

        const originalUrl = url; 
        let processedUrl = url;

        try {
            if (isBlockList(url)) {
                console_log("[Blocked WebSocket]", url);
                if (!FAKE_SUCCESS_ENABLED) {
                    throw new DOMException("Failed to construct 'WebSocket': The URL '" + url + "' is blocked by network.", "NetworkError");
                }
                if (typeof processUrl === "function") {
                    processedUrl = processUrl(url);
                }
            }
        } catch (e) {
            if (e instanceof DOMException) throw e;
        }

        const wsInstance = protocols !== undefined 
            ? new _WebSocket(processedUrl, protocols) 
            : new _WebSocket(processedUrl);

        const instanceProxy = new Proxy(wsInstance, {
            get(target, prop) {
                if (prop === 'url') {
                    return originalUrl;
                }
                
                const value = target[prop];
                if (typeof value === 'function') {
                    return value.bind(target);
                }
                return value;
            },
            set(target, prop, value) {
                target[prop] = value;
                return true;
            }
        });

        return instanceProxy;
    }

    FakeWebSocket.prototype = _WebSocket.prototype;
    Object.setPrototypeOf(FakeWebSocket, _WebSocket);

    ["CONNECTING", "OPEN", "CLOSING", "CLOSED"].forEach((k) => {
        try { FakeWebSocket[k] = _WebSocket[k]; } catch {}
    });

    mark(FakeWebSocket, "function WebSocket() { [native code] }");
    Object.defineProperties(FakeWebSocket, {
        name: { value: "WebSocket", configurable: true },
        length: { value: 1, configurable: true },
    });
    
    Object.defineProperty(window, "WebSocket", { 
        value: FakeWebSocket, 
        writable: true, 
        configurable: true, 
        enumerable: false 
    });


    // =====================================================
    // SENDBEACON HOOK
    // =====================================================
    const beaconContainer = {
        sendBeacon(url, data) {
            try {
                const targetUrl = typeof url === "string" ? processUrl(url) : url;
                if (isBlockList(url)) {
                    console_log("[Blocked SendBeacon]", url);
                    return true; 
                }
                arguments[0] = targetUrl;
            } catch {}
            return _sendBeacon.apply(navigator, arguments);
        }
    };

    const sendBeacon = beaconContainer.sendBeacon;
    mark(sendBeacon, "function sendBeacon() { [native code] }");
    Object.defineProperties(sendBeacon, {
        name: { value: "sendBeacon", configurable: true },
        length: { value: 2, configurable: true },
    });
    navigator.sendBeacon = sendBeacon;
})();