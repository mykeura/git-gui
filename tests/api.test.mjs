// SPDX-License-Identifier: MIT
// normalizeError: gate-style 404 (plain-string detail) → backend_disabled;
// backend-coded 404s map to their own kinds; everything else → error.

import assert from 'node:assert/strict'
import { test } from 'node:test'

import { normalizeError } from '../desktop-src/api.js'

const httpErr = (status, body) =>
  Object.assign(new Error(`${status}: ${JSON.stringify(body)}`), { statusCode: status })

test('gate 404 string detail → backend_disabled', () => {
  assert.equal(normalizeError(httpErr(404, { detail: 'Plugin not found' })).kind, 'backend_disabled')
  assert.equal(normalizeError(httpErr(404, { detail: 'Not Found' })).kind, 'backend_disabled')
})

test('coded 404s map to their kinds', () => {
  assert.equal(normalizeError(httpErr(404, { detail: { code: 'not_found', message: 'unknown commit' } })).kind, 'not_found')
  assert.equal(normalizeError(httpErr(404, { detail: { code: 'not_a_repo', message: 'not a repo' } })).kind, 'not_a_repo')
})

test('git_missing and generic errors', () => {
  assert.equal(normalizeError(httpErr(500, { detail: { code: 'git_missing', message: 'no git' } })).kind, 'git_missing')
  assert.equal(normalizeError(httpErr(500, { detail: { code: 'git_failed', message: 'boom' } })).kind, 'error')
  assert.equal(normalizeError(new Error('network down')).kind, 'error')
})
