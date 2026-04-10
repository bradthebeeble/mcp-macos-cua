This plugin provides macOS GUI automation tools via the `/cua` skill.

Use `/cua <instruction>` to control desktop apps — e.g. `/cua open Safari and search for weather`.

The screenshot tool returns the display scale factor. Always use it to convert pixel coordinates to tool coordinates.

On first use, the `/cua` skill checks `.claude/settings.local.json` for CUA tool permissions. If not found, it asks the user to allow all CUA tools at once (writes `mcp__cua__*` and `mcp__plugin_mcp-macos-cua_cua__*` wildcards). This is a one-time setup per project.
