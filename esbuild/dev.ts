#!/usr/bin/env node
import { context } from 'esbuild'
import options from './options.ts'

await (await context(options)).watch()
