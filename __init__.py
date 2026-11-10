# SPDX-FileCopyrightText: 2026 Miguel Euraque
# SPDX-License-Identifier: MIT

"""Hermes Agent entrypoint for the Git Gui plugin.

Git Gui is a read-only graphical git client for Hermes Desktop. The UI is
registered by ``desktop/plugin.js`` and the read-only git backend lives in
``dashboard/plugin_api.py`` (mounted at ``/api/plugins/git-gui/``). Hermes
Agent still imports every installed plugin through this module; keeping it
intentionally inert satisfies that contract without exposing Agent tools,
hooks or settings.
"""


def register(ctx):
    """Satisfy Hermes Agent's plugin contract without registering capabilities."""
    del ctx
