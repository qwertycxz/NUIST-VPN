#!/usr/bin/env node
import { rm } from 'fs/promises'
import { out } from './constants.ts'

rm(out, {
	recursive: true,
})
