#!/usr/bin/env node
/** biome-ignore-all lint/nursery/useUnicodeRegex: esbuild-plugin-replace 不支持 Unicode 正则 */
import { exec } from 'child_process'
import type { BuildOptions } from 'esbuild'
import { replace } from 'esbuild-plugin-replace'
import { promisify } from 'util'

export default {
	charset: 'utf8',
	entryNames: '[name]',
	entryPoints: ['icon.png', 'src/background.ts', 'src/manifest.json', 'src/options.css', 'src/options.html', 'src/options.mts'],
	loader: {
		'.html': 'copy',
		'.json': 'copy',
		'.png': 'copy',
	},
	minify: true,
	outdir: 'dist',
	plugins: [
		replace({
			'0.0.0': (await promisify(exec)('git describe --abbrev=0 --match v* --tags')).stdout.match(/\d+\.\d+\.\d+/)?.[0],
			'include': /\.json$/,
		}),
	],
} satisfies BuildOptions
