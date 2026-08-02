"""Theme Forge backend — applies forge themes as live Hermes skins.

Rides the canonical skin path: writes ``$HERMES_HOME/skins/<name>.yaml`` and
sets ``display.skin`` so the gateway's skin watcher broadcasts ``skin.changed``
— the same live path the ``/skin`` command uses. Every Hermes surface (CLI,
TUI, desktop) repaints within ~1s, no restart needed.

Mounted at ``POST /api/plugins/theme-forge/activate`` by the desktop SDK's
plugin backend (``ctx.rest``). Only accepts a whitelisted subset of the
canonical skin tokens, validated as hex colors — never free-form YAML.
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

import yaml
from fastapi import APIRouter

from hermes_constants import get_hermes_home

router = APIRouter()

_NAME_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")
_HEX_RE = re.compile(r"^#[0-9a-fA-F]{6}$")

# Whitelisted canonical skin color tokens (see apps/shared/src/skin.ts).
_ALLOWED_TOKENS = {
    "background",
    "ui_text",
    "ui_accent",
    "ui_primary",
    "ui_border",
    "ui_error",
    "banner_dim",
    "banner_title",
    "banner_text",
    "status_bar_bg",
    "completion_menu_bg",
    "ui_ok",
    "ui_warn",
}


def _skins_dir() -> Path:
    return get_hermes_home() / "skins"


@router.post("/activate")
async def activate(body: dict):
    name = str((body or {}).get("name") or "").strip()
    if not _NAME_RE.match(name):
        return {"ok": False, "error": "invalid skin name"}

    raw_colors = (body or {}).get("colors") or {}
    if not isinstance(raw_colors, dict):
        return {"ok": False, "error": "colors must be an object"}

    colors = {
        key: value
        for key, value in raw_colors.items()
        if key in _ALLOWED_TOKENS and _HEX_RE.match(str(value))
    }
    if not colors:
        return {"ok": False, "error": "no valid colors provided"}

    label = str((body or {}).get("label") or name)
    description = str((body or {}).get("description") or f"Forge theme {name}")

    data = {
        "name": name,
        "description": description,
        "colors": colors,
    }

    path = _skins_dir() / f"{name}.yaml"
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(yaml.safe_dump(data, sort_keys=False, allow_unicode=True), encoding="utf-8")
    except OSError as exc:  # pragma: no cover - filesystem edge
        return {"ok": False, "error": f"write failed: {exc}"}

    try:
        from hermes_cli.config import config_command

        config_command(
            argparse.Namespace(config_command="set", key="display.skin", value=name, force=True)
        )
    except Exception as exc:  # pragma: no cover - surface backend failure to the UI
        return {"ok": False, "error": f"config set failed: {exc}"}

    return {"ok": True, "name": name, "label": label, "skin_path": str(path)}
