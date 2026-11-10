// SPDX-License-Identifier: MIT
// Every en key must exist in every locale with the same type and no empties.

import assert from 'node:assert/strict'
import { test } from 'node:test'

import { LOCALES } from '../desktop-src/i18n.js'

const EXPECTED = ['en', 'es', 'fr', 'de', 'ru', 'ja', 'zh', 'zh-hant', 'ar']

test('all 9 locales present', () => {
  for (const loc of EXPECTED) assert.ok(LOCALES[loc], `missing locale ${loc}`)
})

test('every locale covers every en key with matching type', () => {
  const en = LOCALES.en
  for (const loc of EXPECTED) {
    const bundle = LOCALES[loc]
    for (const [key, value] of Object.entries(en)) {
      assert.ok(key in bundle, `${loc} missing key ${key}`)
      assert.equal(typeof bundle[key], typeof value, `${loc}.${key} type mismatch`)
      if (typeof bundle[key] === 'string') {
        assert.ok(bundle[key].trim().length > 0, `${loc}.${key} is empty`)
      } else {
        assert.ok(String(bundle[key](3)).length > 0, `${loc}.${key}(3) empty`)
      }
    }
  }
})
