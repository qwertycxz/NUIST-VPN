chrome.browserAction.onClicked.addListener(function (tab) {
    chrome.tabs.create({ url: "https://client.vpn.nuist.edu.cn/https/webvpn7334b0d0eb18724ea659fe8fef89870c/sinaurl?u=" + tab.url });
    //鉴于你校的神奇vpn对url进行了加密,那我索性就借用夹总的服务器来重定向好了,反正微博不敢在跳转到edu.cn的时候作妖
    /*let url = tab.url.split("/");
    let hexCharCode = [];
    for (let i = 0; i < url[2].length; i++) {
        hexCharCode.push((url[2].charCodeAt(i)).toString(16));
    }
    console.log(url.slice(3));
    if (url[0] == "https:") {
        chrome.tabs.create({ url: "https://client.vpn.nuist.edu.cn/https/webvpn" + hexCharCode.join("") + "/" + url.slice(3).join("/") });
    }
    else {
        chrome.tabs.create({ url: "https://client.vpn.nuist.edu.cn/http/webvpn" + hexCharCode.join("") + "/" + url.slice(3).join("/") });
    }*/
});
