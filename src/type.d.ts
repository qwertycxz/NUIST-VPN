interface SyncStorage {
	custom?: {
		[name: string]: {
			key: string
			origin: string
		}
	}
	vpn?: string
}
