#!/usr/bin/env node
import { exec } from 'child_process'
import type { BuildOptions } from 'esbuild'
import { replace } from 'esbuild-plugin-replace'
import { promisify } from 'util'

export default {
	charset: 'utf8',
	entryPoints: ['src/background.ts', 'src/manifest.json', 'src/options.html', 'src/options.mts'],
	loader: {
		'.html': 'copy',
		'.json': 'copy',
	},
	minify: true,
	outdir: 'dist',
	plugins: [
		replace({
			'0.0.0': (await promisify(exec)('git describe --abbrev=0 --match v* --tags')).stdout.match(/\d+\.\d+\.\d+/v)?.[0],
			'include': /\.json$/v,
		}),
	],
} satisfies BuildOptions
