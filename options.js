// Base64 解码函数
function base64ToUtf8(base64Str) {
    return decodeURIComponent(atob(base64Str).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
}

// 常量定义
const AES_128_KEY_LENGTH = 16; // AES-128 密钥长度（字节）

// 生成唯一ID
function generateId() {
    return 'custom_' + crypto.randomUUID();
}

// 检查密钥编码后是否为 16 字节
function isValidKeyLength(key) {
    const encoder = new TextEncoder();
    const encodedBytes = encoder.encode(key);
    return encodedBytes.length === AES_128_KEY_LENGTH;
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

// 获取默认加密密钥（Base64 编码）
function getDefaultEncryptionKey() {
    // 默认密钥的Base64 编码
    const encodedKey = 'Q0FTQjIwMjFFbkxpbmshIQ==';
    return base64ToUtf8(encodedKey);
}

// 加载保存的设置
document.addEventListener('DOMContentLoaded', async function () {
    try {
        const settings = await chrome.storage.local.get(['vpnServer', 'customServers', 'encryptionKeyEncoded']);
        const selectedServer = settings.vpnServer || 'nuist';
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
            // 旧版本明文存储，升级到编码存储
            encryptionKey = settings.encryptionKey;
        } else {
            encryptionKey = getDefaultEncryptionKey();
        }

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
    } catch (error) {
        console.error('加载设置失败:', error);
        showStatus('❌ 加载设置失败: ' + error.message, 'error');
    }
});

// 渲染自定义服务器列表
function renderCustomServers(customServers, selectedServer) {
    const list = document.getElementById('customServersList');
    list.innerHTML = '';

    // 检查选中的服务器是否存在于自定义服务器列表中
    const serverIds = Object.keys(customServers);
    const validSelected = serverIds.includes(selectedServer);

    Object.entries(customServers).forEach(([serverId, server]) => {
        // 使用模板克隆节点，避免XSS
        const template = document.getElementById('custom-server-template');
        const item = template.content.firstElementChild.cloneNode(true);

        // 设置radio按钮
        const radio = item.querySelector('input[type="radio"]');
        radio.value = serverId;
        // 只有当选中服务器有效且匹配时，才设置为选中状态
        if (validSelected && selectedServer === serverId) {
            radio.checked = true;
        }

        // 设置服务器信息
        item.querySelector('.custom-server-item-name').textContent = server.name;
        item.querySelector('.custom-server-item-url').textContent = server.baseUrl;

        // 添加删除事件
        const btnDelete = item.querySelector('.btn-delete');
        btnDelete.addEventListener('click', () => deleteServer(serverId));

        // 添加radio变化事件
        radio.addEventListener('change', function () {
            showStatus('已选择: ' + server.name, 'info');
        });

        list.appendChild(item);
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

    // 如果删除的是当前选中的服务器，切换回 nuist
    let newSelected = currentServer;
    if (currentServer === serverId) {
        newSelected = 'nuist';
        // 确保 nuist 选项被选中
        const nuistRadio = document.querySelector('input[value="nuist"]');
        if (nuistRadio) {
            nuistRadio.checked = true;
        }
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

    // 验证加密密钥编码后是否为 16 字节
    if (key && !isValidKeyLength(key)) {
        showStatus('❌ 加密密钥编码后必须恰好为 16 字节', 'error');
        return;
    }

    const settings = await chrome.storage.local.get('customServers');
    const customServers = settings.customServers || {};

    // 生成唯一的服务器ID
    const serverId = generateId();

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

    renderCustomServers(customServers, settings.vpnServer || 'nuist');
    showStatus('✓ 服务器已添加', 'success');
});

// 保存按钮事件
document.getElementById('saveBtn').addEventListener('click', async function () {
    try {
        const checkedRadio = document.querySelector('input[name="vpnServer"]:checked');
        const selectedServer = checkedRadio ? checkedRadio.value : 'nuist';
        const encryptionKey = document.getElementById('globalEncryptionKey').value.trim();

        // 验证加密密钥编码后是否为 16 字节
        if (!isValidKeyLength(encryptionKey)) {
            showStatus('❌ 加密密钥编码后必须恰好为 16 字节', 'error');
            return;
        }

        // 保存到 Chrome 存储
        await chrome.storage.local.set({
            vpnServer: selectedServer,
            encryptionKey: encryptionKey
        });

        // 显示成功消息
        showStatus('✓ 设置已保存！', 'success');
    } catch (error) {
        console.error('保存设置失败:', error);
        showStatus('❌ 保存失败: ' + error.message, 'error');
    }
});

// 恢复默认按钮事件
document.getElementById('resetBtn').addEventListener('click', async function () {
    if (!confirm('确定要恢复所有设置到默认值吗？\n\n这将删除所有自定义服务器配置！')) {
        return;
    }

    try {
        const defaultKey = getDefaultEncryptionKey();

        // 恢复为默认值
        await chrome.storage.local.set({
            vpnServer: 'nuist',
            customServers: {},
            encryptionKey: defaultKey
        });

        // 确保 nuist 选项被选中
        const nuistRadio = document.querySelector('input[value="nuist"]');
        if (nuistRadio) {
            nuistRadio.checked = true;
        }
        document.getElementById('globalEncryptionKey').value = defaultKey;
        renderCustomServers({}, 'nuist');

        showStatus('✓ 已恢复默认设置', 'success');
    } catch (error) {
        console.error('恢复设置失败:', error);
        showStatus('❌ 恢复失败: ' + error.message, 'error');
    }
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
