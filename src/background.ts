const encoder = new TextEncoder()
var browser: typeof chrome = globalThis.browser || globalThis.chrome

browser.action.onClicked.addListener(async tab => {
	if (!tab.url) throw new URIError('无法获取当前标签页的URL')
	const { custom, vpn } = await browser.storage.sync.get<SyncStorage>(['custom', 'vpn'])
	let key = ''
	let origin = ''
	switch (vpn) {
		case undefined:
		case 'builtin-nuist':
			origin = 'https://client.vpn.nuist.edu.cn'
			break
		case 'builtin-njupt':
			origin = 'https://vpn.njupt.edu.cn:8443'
			break
		default: {
			const server = custom?.[vpn.replace('custom-', '')]
			if (!server) {
				browser.runtime.openOptionsPage()
				throw new TypeError('未找到自定义服务器配置')
			}
			;({ key, origin } = server)
		}
	}
	if (!key) {
		key = 'Q0FTQjIwMjFFbkxpbmshIQ=='
	}
	const iv = Uint8Array.fromBase64(key)
	const url = new URL(tab.url)
	browser.tabs.create({
		url: `${origin}/${url.protocol.replace(':', '')}/webvpn${new Uint8Array(
			await crypto.subtle.encrypt(
				{
					iv,
					name: 'AES-CBC',
				},
				await crypto.subtle.importKey(
					'raw',
					iv,
					{
						name: 'AES-CBC',
					},
					false,
					['encrypt'],
				),
				encoder.encode(url.host),
			),
		).toHex()}${url.pathname}${url.search}${url.hash}`,
	})
})

browser.runtime.onInstalled.addListener(({ reason }) => {
	switch (reason) {
		case 'install':
			browser.runtime.openOptionsPage()
	}
})
