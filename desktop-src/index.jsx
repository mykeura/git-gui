// SPDX-FileCopyrightText: 2026 Miguel Euraque
// SPDX-License-Identifier: MIT
/**
 * Git Gui — read-only graphical git client for Hermes Desktop.
 * Contributes: a `/git-gui` page, a right-sidebar pane, a sidebar nav row and
 * two palette commands. The git data comes from `dashboard/plugin_api.py`
 * through `ctx.rest` (`desktop-src/api.js`); ships OFF by default
 * (`defaultEnabled: false`) — it inventories in Capabilities ▸ Plugins until
 * the user enables it.
 *
 * Authored in JSX + plain JS under `desktop-src/` and bundled by esbuild into
 * the single ESM `desktop/plugin.js` the runtime loads (only `@hermes/plugin-sdk`,
 * `react`, `react/jsx-runtime` stay external).
 */

import {
  host,
  PALETTE_AREA,
  PANES_AREA,
  ROUTES_AREA,
  SIDEBAR_NAV_AREA,
  usePluginI18n,
} from '@hermes/plugin-sdk'

import { bindApi } from './api'
import { LOCALES } from './i18n'
import { GitGuiPage } from './page'
import { GitGuiPane, refreshAll } from './pane'
import { bindStorage } from './store'
import cssText from './styles.css'

function GitGuiTabTitle() {
  const t = usePluginI18n('git-gui')
  return t('paneTitle')
}

const plugin = {
  id: 'git-gui',
  name: 'Git Gui',
  description: 'Read-only graphical git client — lane-based commit graph in the sidebar and on a full page.',
  defaultEnabled: false,
  register(ctx) {
    ctx.i18n.register(LOCALES)
    bindApi(ctx)
    bindStorage(ctx)

    // Plugin-owned stylesheet: one <style> tag, removed on unload.
    const style = document.createElement('style')
    style.dataset.plugin = 'git-gui'
    style.textContent = cssText
    document.head.appendChild(style)
    ctx.onDispose(() => style.remove())

    ctx.registerMany([
      {
        id: 'page',
        area: ROUTES_AREA,
        data: { path: '/git-gui' },
        render: () => <GitGuiPage />,
      },
    ])

    const registerLabels = () =>
      ctx.registerMany([
        {
          id: 'nav',
          area: SIDEBAR_NAV_AREA,
          order: 60,
          data: { codicon: 'git-branch', label: ctx.i18n.t('nav'), path: '/git-gui' },
        },
        {
          id: 'pane',
          area: PANES_AREA,
          title: ctx.i18n.t('paneTitle'),
          data: {
            placement: 'right',
            collapsible: true,
            width: '300px',
            minWidth: '240px',
            maxWidth: '520px',
            tabTitle: () => <GitGuiTabTitle />,
          },
          render: () => <GitGuiPane />,
        },
        {
          id: 'open',
          area: PALETTE_AREA,
          data: {
            id: 'git-gui.open',
            label: ctx.i18n.t('command.open'),
            keywords: ['git', 'graph', 'commits', 'gui'],
            run: () => host.navigate('/git-gui'),
          },
        },
        {
          id: 'refresh',
          area: PALETTE_AREA,
          data: {
            id: 'git-gui.refresh',
            label: ctx.i18n.t('command.refresh'),
            keywords: ['git', 'refresh', 'graph'],
            run: refreshAll,
          },
        },
      ])

    let disposeLabels = registerLabels()
    ctx.i18n.onLocaleChange(() => {
      disposeLabels()
      disposeLabels = registerLabels()
    })
  },
}

export default plugin
