// Base64 解码函数
function base64ToUtf8(base64Str) {
    return decodeURIComponent(atob(base64Str).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
}

// 将字符串编码为Base64
function encodeBase64(str) {
    return btoa(str);
}

// 从Base64解码字符串
function decodeBase64(base64Str) {
    try {
        return atob(base64Str);
    } catch (error) {
        console.error('Base64解码失败:', error);
        throw new Error('密钥格式错误');
    }
}

// 将字符串转换为 ArrayBuffer
function str2ab(str) {
    var buf = new ArrayBuffer(str.length);
    var bufView = new Uint8Array(buf);
    for (var i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}

// 将 ArrayBuffer 转换为十六进制字符串
function ab2hex(buffer) {
    return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
}

// AES-CBC 加密函数
async function encrypt(domainWithPort, encryptionKey) {
    try {
        const key = await crypto.subtle.importKey(
            "raw",
            str2ab(encryptionKey),
            { name: "AES-CBC" },
            false,
            ["encrypt"]
        );

        const iv = str2ab(encryptionKey);

        const encrypted = await crypto.subtle.encrypt(
            {
                name: "AES-CBC",
                iv: iv
            },
            key,
            str2ab(domainWithPort)
        );

        return ab2hex(encrypted);
    } catch (error) {
        console.error('加密失败:', error);
        throw new Error('加密过程失败: ' + error.message);
    }
}

// 获取默认加密密钥（Base64 编码）
function getDefaultEncryptionKey() {

    const encodedKey = 'Q0FTQjIwMjFFbkxpbmshIQ==';
    return base64ToUtf8(encodedKey);
}

// 监听扩展首次安装或更新事件
chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason === 'install') {
        // 打开选项页面
        chrome.runtime.openOptionsPage();
    }
});

// 检查 URL 是否为扩展页面或浏览器内置页面
function isRestrictedUrl(url) {
    try {
        const urlObj = new URL(url);

        // 检查是否为扩展页面
        if (urlObj.protocol === 'chrome-extension:' ||
            urlObj.protocol === 'moz-extension:' ||
            urlObj.protocol === 'ms-browser-extension:') {
            return true;
        }

        // 检查是否为浏览器内置页面
        if (urlObj.protocol === 'chrome:' ||
            urlObj.protocol === 'edge:' ||
            urlObj.protocol === 'about:' ||
            urlObj.protocol === 'file:' ||
            urlObj.protocol === 'data:' ||
            urlObj.protocol === 'javascript:') {
            return true;
        }

        // 检查特殊页面
        const restrictedPatterns = [
            'newtab',
            'chrome.google.com',
            'microsoftedge.com',
            'chrome.com',
            'edge.com'
        ];

        const hostname = urlObj.hostname.toLowerCase();
        return restrictedPatterns.some(pattern => hostname.includes(pattern));
    } catch (error) {
        console.error('URL 检查失败:', error);
        return true; // 无法解析的URL视为受限
    }
}

// 监听 action 点击事件
chrome.action.onClicked.addListener(async function (tab) {
    try {
        // 检查当前页面是否为扩展页面或浏览器内置页面
        if (isRestrictedUrl(tab.url)) {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icon.png',
                title: '无法访问',
                message: '无法在扩展页面或浏览器内置页面上使用此功能。请在普通网页上点击扩展图标。'
            });
            return;
        }

        // 解析当前 URL
        let url = new URL(tab.url);

        // 从存储中获取设置
        const settings = await chrome.storage.local.get(['vpnServer', 'customServers', 'encryptionKeyEncoded', 'encryptionKey']);
        let selectedServer = settings.vpnServer || 'nuist';
        const customServers = settings.customServers || {};

        // 解码密钥（向后兼容：如果没有编码版本则使用明文）
        let encryptionKey;
        if (settings.encryptionKeyEncoded) {
            try {
                encryptionKey = decodeBase64(settings.encryptionKeyEncoded);
            } catch (error) {
                console.warn('密钥解码失败，使用默认密钥:', error);
                encryptionKey = getDefaultEncryptionKey();
            }
        } else if (settings.encryptionKey) {
            // 旧版本明文存储
            encryptionKey = settings.encryptionKey;
        } else {
            encryptionKey = getDefaultEncryptionKey();
        }

        // 获取 VPN 前缀和加密密钥
        let VpnPrefix;
        let serverKey = encryptionKey;

        if (selectedServer.startsWith('custom_')) {
            // 自定义服务器
            const customId = selectedServer;
            const customServer = customServers[customId];
            if (customServer) {
                VpnPrefix = `${customServer.baseUrl}/${url.protocol.replace(':', '')}/webvpn`;
                serverKey = customServer.encryptionKey || encryptionKey;
            } else {
                // 服务器配置错误，显示通知并打开选项页面
                chrome.action.openOptionsPage();
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icon.png',
                    title: '自定义服务器错误',
                    message: '找不到选定的自定义服务器配置，请重新设置。'
                });
                return;
            }
        } else if (selectedServer === 'nuist') {
            VpnPrefix = `https://client.vpn.nuist.edu.cn/${url.protocol.replace(':', '')}/webvpn`;
        } else {
            // 默认 njupt
            VpnPrefix = `https://vpn.njupt.edu.cn:8443/${url.protocol.replace(':', '')}/webvpn`;
        }

        let domainWithPort = url.host; // 包括域名和端口（如果有）

        // 加密域名，增加异常处理
        let encryptedDomain;
        try {
            encryptedDomain = await encrypt(domainWithPort, serverKey);
        } catch (error) {
            console.error('域名加密失败:', error);
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icon.png',
                title: '加密失败',
                message: '无法加密域名，请检查密钥是否正确。'
            });
            return;
        }

        // 构造新的 URL
        let newUrl = VpnPrefix + encryptedDomain + url.pathname + url.search + url.hash;
        // 跳转到新的 URL
        chrome.tabs.create({ url: newUrl });
    } catch (error) {
        console.error('处理点击事件失败:', error);
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon.png',
            title: '操作失败',
            message: '发生未知错误: ' + error.message
        });
    }
});