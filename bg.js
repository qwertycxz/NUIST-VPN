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
async function encrypt(domainWithPort) {
    const key = await crypto.subtle.importKey(
        "raw",
        str2ab("CASB2021EnLink!!"),
        { name: "AES-CBC" },
        false,
        ["encrypt"]
    );
    
    const iv = str2ab("CASB2021EnLink!!");

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

// 监听 action 点击事件
chrome.action.onClicked.addListener(async function (tab) {
    // 解析当前 URL
    let url = new URL(tab.url);

    let VpnPrefix = `https://client.vpn.nuist.edu.cn/${url.protocol.replace(':','')}/webvpn`;

    let domainWithPort = url.host; // 包括域名和端口（如果有）
    let encryptedDomain = await encrypt(domainWithPort);

    // 构造新的 URL
    let newUrl = VpnPrefix + encryptedDomain + url.pathname + url.search + url.hash;
    // 跳转到新的 URL
    chrome.tabs.create({ url: newUrl });
});



