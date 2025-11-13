// Base64 解码函数
function base64ToUtf8(base64Str) {
    return decodeURIComponent(atob(base64Str).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
}

// 获取默认加密密钥（Base64 编码）
function getDefaultEncryptionKey() {
    // 默认密钥的Base64 编码
    const encodedKey = 'Q0FTQjIwMjFFbkxpbmshIQ==';
    return base64ToUtf8(encodedKey);
}

// 加载保存的设置
document.addEventListener('DOMContentLoaded', async function () {
    const settings = await chrome.storage.local.get(['vpnServer', 'customServers', 'encryptionKey']);
    const selectedServer = settings.vpnServer || 'nuist';
    const customServers = settings.customServers || {};
    const encryptionKey = settings.encryptionKey || getDefaultEncryptionKey();

    // 设置单选框
    const radioBtn = document.querySelector(`input[value="${selectedServer}"]`);
    if (radioBtn) {
        radioBtn.checked = true;
    }

    // 设置加密密钥
    document.getElementById('globalEncryptionKey').value = encryptionKey;

    // 显示自定义服务器列表
    renderCustomServers(customServers, selectedServer);

    showStatus('设置已加载', 'info');
});

// 渲染自定义服务器列表
function renderCustomServers(customServers, selectedServer) {
    const list = document.getElementById('customServersList');
    list.innerHTML = '';

    Object.entries(customServers).forEach(([serverId, server]) => {
        const item = document.createElement('div');
        item.className = 'custom-server-item';

        const isSelected = selectedServer === serverId;
        const selector = `<input type="radio" name="vpnServer" value="${serverId}" ${isSelected ? 'checked' : ''}>`;

        item.innerHTML = `
            ${selector}
            <div class="custom-server-item-info">
                <div class="custom-server-item-name">${server.name}</div>
                <div class="custom-server-item-url">${server.baseUrl}</div>
            </div>
            <button class="btn-delete" onclick="deleteServer('${serverId}')">删除</button>
        `;

        list.appendChild(item);

        // 为新添加的单选框添加事件监听
        const radio = item.querySelector('input[type="radio"]');
        radio.addEventListener('change', function () {
            showStatus('已选择: ' + server.name, 'info');
        });
    });
}

// 删除自定义服务器
async function deleteServer(serverId) {
    if (!confirm('确定要删除此服务器吗？')) {
        return;
    }

    const settings = await chrome.storage.local.get(['customServers', 'vpnServer']);
    const customServers = settings.customServers || {};
    const currentServer = settings.vpnServer;

    delete customServers[serverId];

    // 如果删除的是当前选中的服务器，切换回 njupt
    let newSelected = currentServer;
    if (currentServer === serverId) {
        newSelected = 'njupt';
        document.querySelector('input[value="njupt"]').checked = true;
    }

    await chrome.storage.local.set({
        customServers: customServers,
        vpnServer: newSelected
    });

    renderCustomServers(customServers, newSelected);
    showStatus('✓ 服务器已删除', 'success');
}

// 添加自定义服务器
document.getElementById('addServerBtn').addEventListener('click', async function () {
    const name = document.getElementById('customServerName').value.trim();
    const url = document.getElementById('customServerUrl').value.trim();
    const key = document.getElementById('customServerKey').value.trim();

    if (!name || !url) {
        showStatus('❌ 服务器名称和地址不能为空', 'error');
        return;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        showStatus('❌ 地址必须以 http:// 或 https:// 开头', 'error');
        return;
    }

    const settings = await chrome.storage.local.get('customServers');
    const customServers = settings.customServers || {};

    // 生成唯一的服务器ID
    const serverId = 'custom_' + Date.now();

    customServers[serverId] = {
        name: name,
        baseUrl: url,
        encryptionKey: key || undefined
    };

    await chrome.storage.local.set({ customServers: customServers });

    // 清空表单
    document.getElementById('customServerName').value = '';
    document.getElementById('customServerUrl').value = '';
    document.getElementById('customServerKey').value = '';

    renderCustomServers(customServers, settings.vpnServer || 'njupt');
    showStatus('✓ 服务器已添加', 'success');
});

// 保存按钮事件
document.getElementById('saveBtn').addEventListener('click', async function () {
    const selectedServer = document.querySelector('input[name="vpnServer"]:checked').value;
    const encryptionKey = document.getElementById('globalEncryptionKey').value.trim();

    // 验证加密密钥长度（AES-128需要16字节）
    if (encryptionKey.length !== 16) {
        showStatus('❌ 加密密钥必须恰好16个字符', 'error');
        return;
    }

    // 保存到 Chrome 存储
    await chrome.storage.local.set({
        vpnServer: selectedServer,
        encryptionKey: encryptionKey
    });

    // 显示成功消息
    showStatus('✓ 设置已保存！', 'success');
});

// 恢复默认按钮事件
document.getElementById('resetBtn').addEventListener('click', async function () {
    if (!confirm('确定要恢复所有设置到默认值吗？')) {
        return;
    }

    const defaultKey = getDefaultEncryptionKey();

    // 恢复为默认值
    await chrome.storage.local.set({
        vpnServer: 'nuist',
        customServers: {},
        encryptionKey: defaultKey
    });

    document.querySelector('input[value="nuist"]').checked = true;
    document.getElementById('globalEncryptionKey').value = defaultKey;
    renderCustomServers({}, 'nuist');

    showStatus('✓ 已恢复默认设置', 'success');
});

// 折叠/展开加密密钥部分
document.getElementById('encryptionToggle').addEventListener('click', function () {
    const content = document.getElementById('encryptionContent');
    content.classList.toggle('show');
});

// 单选框变化事件
document.addEventListener('change', function (e) {
    if (e.target.name === 'vpnServer') {
        const value = e.target.value;
        if (value === 'njupt') {
            showStatus('已选择: NJUPT', 'info');
        } else if (value === 'nuist') {
            showStatus('已选择: NUIST', 'info');
        }
    }
});

// 显示状态信息的辅助函数
function showStatus(message, type) {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = 'status ' + type;
}
