#!/usr/bin/env node
import { build } from 'esbuild'
import options from './options.ts'

void build(options)
