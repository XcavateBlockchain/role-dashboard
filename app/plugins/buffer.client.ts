import { Buffer } from 'buffer'
import nodeProcess from 'process'

/** Node globals that @solana/web3.js and anchor expect to exist in the browser. */
export default defineNuxtPlugin(() => {
  const g = globalThis as { Buffer?: typeof Buffer; process?: unknown }
  if (typeof g.Buffer === 'undefined') {
    g.Buffer = Buffer
  }
  if (typeof g.process === 'undefined') {
    nodeProcess.env = {}
    g.process = nodeProcess
  }
})
