#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 Miguel Euraque
# SPDX-License-Identifier: MIT
"""Build a reproducible demo repo (name: acme-web) for Git Gui screenshots.

Fictional authors, conventional commits, --no-ff merges, open branches at the
top, tags, and an origin remote — all with fixed dates spread over ~3 weeks.
Usage: make-demo-repo.py <target-dir>
"""
import os
import subprocess
import sys
import time
from pathlib import Path

NOW = int(time.time())
DAY = 86400

AUTHORS = [
    ("Alex Rivera", "alex@acme.dev"),
    ("Sam Chen", "sam@acme.dev"),
    ("Priya Patel", "priya@acme.dev"),
    ("Jordan Lee", "jordan@acme.dev"),
]

counter = [0]


def git(repo, *args, author=0, days_ago=0):
    env = dict(os.environ)
    name, email = AUTHORS[author]
    env.update(GIT_AUTHOR_NAME=name, GIT_AUTHOR_EMAIL=email,
               GIT_COMMITTER_NAME=name, GIT_COMMITTER_EMAIL=email)
    ts = NOW - int(days_ago * DAY) - counter[0]
    counter[0] += 60
    env["GIT_AUTHOR_DATE"] = env["GIT_COMMITTER_DATE"] = f"{ts} +0000"
    subprocess.run(["git", *args], cwd=repo, env=env, check=True,
                   stdout=subprocess.DEVNULL)


def write(repo, path, content):
    p = Path(repo) / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content)


def commit(repo, msg, author=0, days_ago=0):
    git(repo, "add", "-A")
    git(repo, "commit", "-m", msg, author=author, days_ago=days_ago)


def main():
    root = Path(sys.argv[1]).resolve()
    repo = root / "acme-web"
    origin = root / "origin.git"
    subprocess.run(["git", "init", "-qb", "main", str(repo)], check=True)
    subprocess.run(["git", "init", "-qb", "main", "--bare", str(origin)], check=True)

    # main history (oldest → newest)
    write(repo, "src/app.js", "export function boot() {\n  render('#app')\n}\n")
    write(repo, "styles/main.css", "body { margin: 0; font-family: sans-serif; }\n")
    write(repo, "README.md", "# acme-web\n\nStorefront frontend.\n")
    commit(repo, "chore: initial project scaffold", 0, 21)
    write(repo, "src/cart.js", "export const cart = []\nexport const add = i => cart.push(i)\n")
    write(repo, "src/auth.js", (
        "export function login(user) {\n"
        "  const session = startSession(user)\n"
        "  track('login', { user: user.id })\n"
        "  return redirect('/home')\n"
        "}\n"
        "\n"
        "export function logout(user) {\n"
        "  endSession(user)\n"
        "  track('logout', { user: user.id })\n"
        "  return redirect('/')\n"
        "}\n"))
    commit(repo, "feat(cart): add cart store and auth module", 1, 19)
    git(repo, "tag", "-a", "-m", "release 1.1", "v1.1.0")

    # feature/checkout-flow: branched, merged --no-ff
    git(repo, "checkout", "-qb", "feature/checkout-flow")
    write(repo, "src/checkout.js", "export function checkout(cart) {\n  return pay(cart)\n}\n")
    commit(repo, "feat(checkout): add checkout flow", 2, 16)
    write(repo, "src/checkout.js", "export function checkout(cart, opts = {}) {\n  validate(cart)\n  return pay(cart, opts)\n}\n")
    write(repo, "src/validate.js", "export function validate(cart) {\n  if (!cart.length) throw new Error('empty cart')\n}\n")
    write(repo, "docs/checkout.md", "# Checkout\n\nValidates the cart before payment.\n")
    write(repo, "styles/checkout.css", ".checkout { display: grid; gap: 1rem; }\n")
    commit(repo, "feat(checkout): validate cart before payment", 2, 15)
    git(repo, "checkout", "-q", "main")
    write(repo, "src/app.js", "export function boot() {\n  render('#app')\n  mountRoutes()\n}\n")
    commit(repo, "feat(app): mount router on boot", 0, 14)
    git(repo, "merge", "--no-ff", "-m", "feat(checkout): merge checkout flow", "feature/checkout-flow", author=0, days_ago=13)
    git(repo, "tag", "v1.2.0")

    # fix/login-redirect: merged
    git(repo, "checkout", "-qb", "fix/login-redirect")
    write(repo, "src/auth.js", (
        "export function login(user) {\n"
        "  const session = startSession(user)\n"
        "  track('login', { user: user.id })\n"
        "  return redirect('/dashboard')\n"
        "}\n"
        "\n"
        "export function logout(user) {\n"
        "  endSession(user)\n"
        "  track('logout', { user: user.id })\n"
        "  return redirect('/')\n"
        "}\n"))
    write(repo, "tests/auth.test.js", "test('login lands on dashboard', () => {\n  expect(login(u)).toBe('/dashboard')\n})\n")
    commit(repo, "fix(auth): correct login redirect target", 3, 12)
    git(repo, "checkout", "-q", "main")
    write(repo, "styles/main.css", "body { margin: 0; font-family: sans-serif; }\n.card { padding: 1rem; }\n")
    commit(repo, "style(cart): add card padding", 1, 11)
    git(repo, "merge", "--no-ff", "-m", "fix(auth): merge login redirect fix", "fix/login-redirect", author=0, days_ago=10)

    # release/1.2: merged
    git(repo, "checkout", "-qb", "release/1.2")
    write(repo, "CHANGELOG.md", "# 1.2.0\n\n- checkout flow\n- login redirect fix\n")
    commit(repo, "chore(release): prepare 1.2 changelog", 0, 9)
    write(repo, "src/theme.js", "export const theme = { mode: 'light' }\n")
    write(repo, "styles/theme.css", ":root { --surface: #fff; }\n")
    commit(repo, "feat(theme): add theme module", 1, 8)
    git(repo, "checkout", "-q", "main")
    write(repo, "src/cart.js", "export const cart = []\nexport const add = i => cart.push(i)\nexport const total = () => cart.reduce((s, i) => s + i.price, 0)\n")
    commit(repo, "feat(cart): compute cart total", 1, 8)
    git(repo, "merge", "--no-ff", "-m", "chore(release): merge release/1.2", "release/1.2", author=0, days_ago=7)

    # feature/search-filters: merged
    git(repo, "checkout", "-qb", "feature/search-filters")
    write(repo, "src/search.js", "export function search(q) {\n  return query('/api/products', q)\n}\n")
    commit(repo, "feat(search): add product search", 2, 6)
    write(repo, "src/filters.js", "export const byPrice = (a, b) => a.price - b.price\n")
    write(repo, "styles/search.css", ".filters { display: flex; gap: 0.5rem; }\n")
    commit(repo, "feat(search): add price filters", 2, 5)
    git(repo, "checkout", "-q", "main")
    write(repo, "docs/checkout.md", "# Checkout\n\nValidates the cart before payment.\n\nSee also: search filters.\n")
    commit(repo, "docs: link search filters from checkout", 0, 5)
    git(repo, "merge", "--no-ff", "-m", "feat(search): merge search filters", "feature/search-filters", author=0, days_ago=5)

    # refactor/api-client: merged
    git(repo, "checkout", "-qb", "refactor/api-client")
    write(repo, "src/api.js", "export async function query(path, q) {\n  const res = await fetch(path + '?' + new URLSearchParams(q))\n  return res.json()\n}\n")
    commit(repo, "refactor(api): extract shared query helper", 1, 5)
    write(repo, "src/search.js", "import { query } from './api.js'\nexport function search(q) {\n  return query('/api/products', q)\n}\n")
    commit(repo, "refactor(search): use shared query helper", 1, 4.5)
    git(repo, "checkout", "-q", "main")
    write(repo, "styles/main.css", "body { margin: 0; font-family: sans-serif; }\n.card { padding: 1rem; }\n.header { position: sticky; top: 0; z-index: 10; }\n")
    commit(repo, "style(header): raise sticky z-index", 0, 4)
    git(repo, "merge", "--no-ff", "-m", "refactor(api): merge shared query helper", "refactor/api-client", author=0, days_ago=4)

    # perf/image-lazy: merged
    git(repo, "checkout", "-qb", "perf/image-lazy")
    write(repo, "src/images.js", "export function lazy(img) {\n  img.loading = 'lazy'\n}\n")
    commit(repo, "perf(images): lazy-load product images", 2, 4)
    git(repo, "checkout", "-q", "main")
    write(repo, "tests/search.test.js", "test('search returns products', () => {\n  expect(search('x')).resolves.toBeTruthy()\n})\n")
    commit(repo, "test(search): cover product search", 3, 3.5)
    git(repo, "merge", "--no-ff", "-m", "perf(images): merge lazy loading", "perf/image-lazy", author=0, days_ago=3)

    # feature/dark-mode: open at top
    git(repo, "checkout", "-qb", "feature/dark-mode")
    write(repo, "src/theme.js", "export const theme = { mode: 'dark' }\n")
    write(repo, "styles/dark.css", "body.dark { background: #111; color: #eee; }\n")
    write(repo, "docs/dark-mode.md", "# Dark mode\n\nFollows the system preference.\n")
    commit(repo, "feat(theme): add dark mode palette", 2, 5)
    write(repo, "src/theme.js", "export const theme = { mode: 'dark', auto: true }\n")
    commit(repo, "feat(theme): follow system preference", 2, 4)

    # back to main + a couple of commits; another open branch fix/header-scroll
    git(repo, "checkout", "-q", "main")
    write(repo, "src/app.js", "export function boot() {\n  render('#app')\n  mountRoutes()\n  prefetch('/api/products')\n}\n")
    commit(repo, "perf(app): prefetch product list", 0, 3)
    git(repo, "checkout", "-qb", "fix/header-scroll")
    write(repo, "styles/main.css", "body { margin: 0; font-family: sans-serif; }\n.card { padding: 1rem; }\n.header { position: sticky; top: 0; }\n")
    commit(repo, "fix(header): keep header sticky on scroll", 3, 2)
    git(repo, "checkout", "-q", "main")
    write(repo, "README.md", "# acme-web\n\nStorefront frontend.\n\n## Scripts\n\n- `npm run dev` — start dev server\n")
    commit(repo, "docs: add dev script to readme", 1, 1)
    git(repo, "checkout", "-qb", "feature/wishlist")
    write(repo, "src/wishlist.js", "export const wishlist = new Set()\n")
    write(repo, "styles/wishlist.css", ".wishlist { position: relative; }\n")
    commit(repo, "feat(wishlist): scaffold wishlist store", 2, 0.6)
    git(repo, "checkout", "-q", "main")
    git(repo, "checkout", "-qb", "fix/cart-rounding")
    write(repo, "src/cart.js", "export const cart = []\nexport const add = i => cart.push(i)\nexport const total = () => Math.round(cart.reduce((s, i) => s + i.price, 0) * 100) / 100\n")
    commit(repo, "fix(cart): round totals to cents", 3, 0.5)
    git(repo, "checkout", "-q", "main")

    # origin with origin/main + one remote feature branch
    git(repo, "remote", "add", "origin", str(origin))
    git(repo, "push", "-q", "-u", "origin", "main")
    git(repo, "push", "-q", "origin", "feature/dark-mode")
    print(repo)


if __name__ == "__main__":
    main()
