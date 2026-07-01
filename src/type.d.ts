/** biome-ignore-all lint/correctness/noUnusedVariables: 接口被隐式使用 */
interface SyncStorage {
	custom?: {
		[name: string]: {
			key: string
			origin: string
		}
	}
	vpn?: string
}
