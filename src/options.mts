var browser: typeof chrome = globalThis.browser || globalThis.chrome

function getElement<T>(clazz: new () => T, id: string) {
	const element = document.getElementById(id)
	if (!(element instanceof clazz)) {
		throw new DOMException(`${id}类型错误`)
	}
	return element
}

let { custom, vpn } = await browser.storage.sync.get<SyncStorage>(['custom', 'vpn'])
function initialRadio(radio: HTMLInputElement) {
	radio.checked = radio.value == vpn
	radio.addEventListener('change', () => {
		vpn = radio.value
		browser.storage.sync.set({ vpn })
	})
}

for (const radio of document.getElementsByName('vpn')) {
	if (!(radio instanceof HTMLInputElement)) throw new DOMException('vpn类型错误')
	initialRadio(radio)
}

const name = getElement(HTMLInputElement, 'custom-name')
function validateDuplicate() {
	if (custom && name.value in custom) {
		name.setCustomValidity('已存在同名服务器')
	} else {
		name.setCustomValidity('')
	}
}
name.addEventListener('change', validateDuplicate)

const key = getElement(HTMLInputElement, 'custom-key')
key.addEventListener('change', () => {
	try {
		if (key.value && Uint8Array.fromBase64(key.value).length != 16) throw new SyntaxError('密钥长度错误')
		key.setCustomValidity('')
	} catch {
		key.setCustomValidity('密钥应为Base64编码的16字节数据')
	}
})

const list = getElement(HTMLElement, 'vpn-list')
const nuist = getElement(HTMLInputElement, 'builtin-nuist')
const template = getElement(HTMLTemplateElement, 'custom-template').content.firstElementChild
function addCustom(vpns: {
	[name: string]: {
		origin: string
	}
}) {
	list.append(
		...Object.entries(vpns).map(([index, { origin }]) => {
			const clone = template?.cloneNode(true)
			if (!(clone instanceof HTMLLabelElement && clone.firstElementChild instanceof HTMLInputElement)) throw new DOMException('clone类型错误')
			clone.firstElementChild.value = `custom-${index}`
			initialRadio(clone.firstElementChild)
			const heading = clone.firstElementChild.nextElementSibling?.firstElementChild
			if (!(heading instanceof HTMLHeadingElement)) throw new DOMException('heading类型错误')
			heading.innerText = index
			if (!(heading.nextElementSibling instanceof HTMLDivElement)) throw new DOMException('div类型错误')
			heading.nextElementSibling.innerText = origin
			clone.firstElementChild.nextElementSibling?.nextElementSibling?.addEventListener('click', () => {
				if (!(custom && confirm(`确定要删除自定义服务器“${index}”吗？`))) return
				clone.remove()
				delete custom[index]
				if (!vpn || vpn == `custom-${index}`) {
					nuist.checked = true
					vpn = 'builtin-nuist'
				}
				browser.storage.sync.set({
					custom,
					vpn,
				})
				validateDuplicate()
			})
			return clone
		}),
	)
}
if (custom) {
	addCustom(custom)
}

const origin = getElement(HTMLInputElement, 'custom-origin')
getElement(HTMLFormElement, 'custom-form').addEventListener('submit', event => {
	addCustom({
		[name.value]: {
			origin: origin.value,
		},
	})
	custom = {
		[name.value]: {
			key: key.value,
			origin: origin.value,
		},
		...custom,
	}
	browser.storage.sync.set({
		custom,
	})
	event.preventDefault()
	validateDuplicate()
})
