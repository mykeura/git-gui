// SPDX-FileCopyrightText: 2026 Miguel Euraque
// SPDX-License-Identifier: MIT
// Dev-only build: bundles dev/main.jsx with the SDK stub aliased in, real
// react/react-query (the host provides them at runtime; devDeps stand in here)
// and our stylesheet as text (same as the shipped build). Codicon css/font and
// the harness theme css are copied verbatim and linked from index.html.
import { build } from 'esbuild'
import { copyFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const dev = path.dirname(fileURLToPath(import.meta.url))
const dist = path.join(dev, 'dist')
await mkdir(dist, { recursive: true })

await build({
  entryPoints: [path.join(dev, 'main.jsx')],
  bundle: true,
  format: 'esm',
  jsx: 'automatic',
  target: 'es2022',
  outdir: dist,
  alias: { '@hermes/plugin-sdk': path.join(dev, 'sdk-stub.js') },
  loader: { '.css': 'text', '.js': 'jsx' },
  logLevel: 'info',
})

const codicons = path.join(dev, '..', 'node_modules', '@vscode', 'codicons', 'dist')
await copyFile(path.join(codicons, 'codicon.css'), path.join(dist, 'codicon.css'))
await copyFile(path.join(codicons, 'codicon.ttf'), path.join(dist, 'codicon.ttf'))
await copyFile(path.join(dev, 'harness.css'), path.join(dist, 'harness.css'))
await copyFile(path.join(dev, 'index.html'), path.join(dist, 'index.html'))
console.log('dev bundle → dev/dist')
