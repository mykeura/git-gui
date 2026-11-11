// npm run screenshots — build harness, create demo repo, serve, capture the
// three README images with headless Chromium, stop the server.
import { execFileSync, execFile, spawnSync } from 'node:child_process'
import { mkdtempSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dev = path.dirname(fileURLToPath(import.meta.url))
const repo = path.join(dev, '..')
const CHROME = process.env.CHROME || 'chromium'
const PORT = 8819
const enc = encodeURIComponent

execFileSync('node', [path.join(dev, 'build.mjs')], { stdio: 'inherit' })

const tmp = mkdtempSync(path.join(tmpdir(), 'ggshots-'))
execFileSync('python3', [path.join(dev, 'make-demo-repo.py'), tmp], { stdio: 'inherit' })
const cwd = enc(path.join(tmp, 'acme-web'))

const server = execFile(path.join(repo, '.venv/bin/python'), [path.join(dev, 'server.py'), String(PORT)], { stdio: 'ignore' })
await new Promise(r => setTimeout(r, 2500))

const shot = (file, qs, win = '1440,900') => {
  execFileSync(CHROME, ['--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    `--window-size=${win}`, '--force-device-scale-factor=2', '--virtual-time-budget=20000',
    `--screenshot=${path.join(repo, 'images', file)}`,
    `http://127.0.0.1:${PORT}/?cwd=${cwd}&${qs}`], { stdio: 'inherit' })
}

try {
  shot('page.png', 'theme=dark&select=sub:merge%20checkout%20flow')
  shot('pane.png', 'theme=dark&view=pane&paneWidth=320', '980,780')
  shot('diff.png', 'theme=light&select=sub:correct%20login%20redirect&diff=src/auth.js')
} finally {
  server.kill()
}
console.log('images written')
