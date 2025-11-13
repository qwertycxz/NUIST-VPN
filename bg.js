// Base64 解码函数
function base64ToUtf8(base64Str) {
    return decodeURIComponent(atob(base64Str).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
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

// 监听 action 点击事件
chrome.action.onClicked.addListener(async function (tab) {
    // 解析当前 URL
    let url = new URL(tab.url);

    // 从存储中获取设置
    const settings = await chrome.storage.local.get(['vpnServer', 'customServers', 'encryptionKey']);
    let selectedServer = settings.vpnServer || 'nuist';
    const customServers = settings.customServers || {};
    const encryptionKey = settings.encryptionKey || getDefaultEncryptionKey();

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
            return; // 服务器配置错误
        }
    } else if (selectedServer === 'nuist') {
        VpnPrefix = `https://client.vpn.nuist.edu.cn/${url.protocol.replace(':', '')}/webvpn`;
    } else {
        // 默认 njupt
        VpnPrefix = `https://vpn.njupt.edu.cn:8443/${url.protocol.replace(':', '')}/webvpn`;
    }

    let domainWithPort = url.host; // 包括域名和端口（如果有）
    let encryptedDomain = await encrypt(domainWithPort, serverKey);

    // 构造新的 URL
    let newUrl = VpnPrefix + encryptedDomain + url.pathname + url.search + url.hash;
    // 跳转到新的 URL
    chrome.tabs.create({ url: newUrl });
});