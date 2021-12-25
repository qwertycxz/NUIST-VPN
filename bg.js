chrome.browserAction.onClicked.addListener(function (tab) {
    let url = tab.url.split("/");
    let hexCharCode = [];
    for (let i = 0; i < url[2].length; i++) {
        hexCharCode.push((url[2].charCodeAt(i)).toString(16));
    }
    console.log(url.slice(3));
    if (url[0] == "https:") {
        chrome.tabs.create({ url: "https://client.vpn.nuist.edu.cn/https/webvpn" + hexCharCode.join("") + "/" + url.slice(3).join("/") });
    }
    else{
        chrome.tabs.create({ url: "https://client.vpn.nuist.edu.cn/http/webvpn" + hexCharCode.join("") + "/" + url.slice(3).join("/") });
    }
});