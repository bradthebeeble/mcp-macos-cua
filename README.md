# mcp-macos-cua

A macOS **Computer Use Agent** (CUA) — an MCP server that gives AI agents full GUI automation capabilities on macOS.

Control any desktop app through screenshots, mouse clicks, keyboard input, accessibility queries, and AppleScript.

> **Optimized for Claude Code** — includes a ready-to-use `/cua` skill with automatic permission bootstrap. Also works as a standalone MCP server with any MCP-compatible agent.

## Features

| Tool | Description |
|------|-------------|
| `screenshot` | Capture full screen or specific app window (auto-detects display scale factor) |
| `open_app` | Open and activate any macOS application |
| `click` | Click at screen coordinates (single, double, left, right) |
| `type_text` | Type text into the frontmost app |
| `key_press` | Press keys/combos (`cmd+c`, `cmd+shift+a`, `return`, etc.) |
| `scroll` | Scroll in any direction at current or given position |
| `get_ui_elements` | Inspect accessibility tree of an app window |
| `click_ui_element` | Click buttons/elements by name via accessibility |
| `run_applescript` | Execute arbitrary AppleScript |
| `get_mouse_position` | Get current cursor position |
| `move_mouse` | Move cursor to coordinates |

## Prerequisites

- **macOS** (required — uses macOS-specific APIs)
- **Node.js 18+**
- **cliclick** — `brew install cliclick`
- **Accessibility permissions** — System Settings > Privacy & Security > Accessibility (grant to your terminal app)
- **Screen Recording permissions** — System Settings > Privacy & Security > Screen Recording (grant to your terminal app)
- **Python 3** with pyobjc-framework-Quartz — usually pre-installed on macOS; if not: `pip3 install pyobjc-framework-Quartz`

You may need to restart your terminal after granting macOS permissions.

---

## Installation

### Option A: Claude Code Plugin (Recommended)

The plugin gives you the full experience: an MCP server, a `/cua` skill with guided CUA loop, and automatic permission bootstrap.

**From the marketplace** — run these commands inside Claude Code:

```
/plugin marketplace add bradthebeeble/claude-plugins
/plugin install mcp-macos-cua@bradthebeeble-plugins
```

**From local source** — for development/testing (from the shell):

```bash
claude --plugin-dir /path/to/mcp-macos-cua
```

After installing, start using it immediately:

```
/mcp-macos-cua:cua open Safari and search for today's weather
```

**Auto-permissions:** On first use, the `/cua` skill detects whether CUA tool permissions are configured. If not, it asks once to allow all CUA tools — no more per-tool prompts for the rest of the project.

### Option B: Any MCP-Compatible Agent (npx)

The MCP server is published on npm and works with **any** agent that supports the [Model Context Protocol](https://modelcontextprotocol.io) — no plugin system required.

Add this to your MCP client config:

```json
{
  "mcpServers": {
    "cua": {
      "command": "npx",
      "args": ["-y", "mcp-macos-cua"]
    }
  }
}
```

`npx` downloads the package and all dependencies automatically on first run, and caches them for subsequent calls.

**Where to put this config:**

| Agent | Config location |
|-------|----------------|
| **Claude Code** | `.mcp.json` in your project root |
| **Cursor** | Settings > MCP > Add server |
| **Windsurf** | MCP settings |
| **Claude Desktop** | `claude_desktop_config.json` |
| **Custom** | Your MCP client config file |

> **Note for Claude Code users:** Using the MCP server directly (without the plugin) gives you the raw tools but **not** the `/cua` skill, the guided CUA loop, or the auto-permission bootstrap. To avoid per-tool permission prompts, add `"mcp__cua__*"` to `permissions.allow` in `.claude/settings.local.json`.

### Option C: Clone and Run

For development or when you want to run the server directly:

```bash
git clone https://github.com/bradthebeeble/mcp-macos-cua.git
cd mcp-macos-cua
npm install
node server/index.js
```

The server communicates via stdio — connect your MCP client to the process.

---

## System Prompt for Non-Plugin Usage

When using the MCP server without the Claude Code plugin (Options B or C), your agent needs instructions on how to use the tools effectively. Add this to your agent's system prompt:

<details>
<summary>CUA System Prompt (click to expand)</summary>

```
You are a Computer Use Agent (CUA) on macOS. Interact with the GUI using the cua MCP tools.

## CUA Loop
1. Screenshot - Take a screenshot to see current state
2. Analyze - Determine what action to take next
3. Act - Use the appropriate tool (click, type_text, key_press, etc.)
4. Verify - Screenshot again to confirm it worked
5. Repeat or Report - Continue or summarize results

## Coordinate System
The screenshot tool returns a display scale factor (e.g. 2x for Retina, 1x for standard).
Divide screenshot pixel positions by this scale factor to get correct tool coordinates.
Example: if scale factor is 2x and you see a button at pixel (800, 400) in the screenshot,
click at coordinates (400, 200).

## Available Tools
- screenshot - Capture screen (optionally a specific app)
- open_app - Open and activate an application
- click - Click at coordinates (x, y in screen points)
- type_text - Type text into frontmost app
- key_press - Press keys/combos (e.g. "cmd+c", "return", "cmd+shift+a")
- scroll - Scroll in a direction at a position
- get_ui_elements - Inspect accessibility tree of an app
- click_ui_element - Click an element by name via accessibility
- run_applescript - Execute arbitrary AppleScript
- get_mouse_position - Get current cursor position
- move_mouse - Move cursor to coordinates

## Tips
- Always start with a screenshot before acting
- Prefer click_ui_element (accessibility) over coordinate click when possible
- Use get_ui_elements to discover clickable elements by name
- Use key_press for keyboard shortcuts (faster than navigating menus)
- Use scroll with x,y to scroll within a specific area
- Use run_applescript as escape hatch for complex multi-step automation
```

</details>

---

## Usage

### The CUA Loop

Whether via the `/cua` skill or a custom system prompt, the agent follows a **Screenshot > Analyze > Act > Verify > Repeat** loop:

1. Takes a screenshot to see the current screen state
2. Analyzes what action to take next
3. Executes the action (click, type, etc.)
4. Takes another screenshot to verify the result
5. Repeats until the task is complete

### Coordinate System

The `screenshot` tool automatically detects the display scale factor (2x for Retina, 1x for standard displays) and returns it with every screenshot. **Divide screenshot pixel positions by this factor** to get correct tool coordinates.

### Examples (Claude Code plugin)

```
/mcp-macos-cua:cua open Slack and send "hello" to the #general channel
/mcp-macos-cua:cua take a screenshot of Safari
/mcp-macos-cua:cua open Notes and create a grocery list
/mcp-macos-cua:cua open System Settings and enable Dark Mode
```

---

## Tools Reference

### screenshot
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `app` | string | No | App name to screenshot. Omit for full screen. |

Returns the screenshot image and the display scale factor.

### click
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `x` | number | Yes | X coordinate in screen points |
| `y` | number | Yes | Y coordinate in screen points |
| `clicks` | number | No | 1 (single) or 2 (double). Default: 1 |
| `button` | string | No | `"left"` or `"right"`. Default: `"left"` |

### type_text
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | string | Yes | Text to type into frontmost app |

### key_press
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `keys` | string | Yes | Key combo like `"cmd+c"`, `"return"`, `"cmd+shift+a"` |

### scroll
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `direction` | string | Yes | `"up"`, `"down"`, `"left"`, `"right"` |
| `amount` | number | No | Scroll steps. Default: 3 |
| `x`, `y` | number | No | Coordinates to scroll at (moves mouse first) |

### open_app
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `app` | string | Yes | Application name (e.g. `"Safari"`, `"Slack"`) |

### get_ui_elements
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `app` | string | Yes | Application process name |
| `depth` | string | No | `"shallow"` (default) or `"deep"` (full tree, slow) |

### click_ui_element
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `app` | string | Yes | Application process name |
| `element_type` | string | Yes | e.g. `"button"`, `"menu item"`, `"text field"` |
| `name` | string | Yes | Name/title of the element |
| `path` | string | No | Parent path. Default: `"window 1"` |

### run_applescript
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `script` | string | Yes | AppleScript code to execute |

### get_mouse_position
No parameters. Returns current cursor position.

### move_mouse
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `x` | number | Yes | X coordinate in screen points |
| `y` | number | Yes | Y coordinate in screen points |

---

## Adding to a Team Marketplace

To distribute the Claude Code plugin within your team, add it to a [Claude Code plugin marketplace](https://code.claude.com/docs/en/plugin-marketplaces):

1. Create or locate your team's `marketplace.json`
2. Add the plugin entry:

```json
{
  "plugins": [
    {
      "name": "mcp-macos-cua",
      "description": "macOS Computer Use Agent - GUI automation via screenshots, clicks, typing, accessibility, and AppleScript",
      "source": "github:bradthebeeble/mcp-macos-cua"
    }
  ]
}
```

3. Team members can then install from inside Claude Code:

```
/plugin marketplace add your-org/your-marketplace-repo
/plugin install mcp-macos-cua@your-marketplace
```

---

## Troubleshooting

**"cliclick not found"** — Install with `brew install cliclick`

**Clicks land in wrong position** — Check the scale factor returned by `screenshot`. Divide pixel coordinates by that factor.

**"not allowed assistive access"** — Grant Accessibility permissions in System Settings > Privacy & Security > Accessibility to your terminal app. Restart the terminal after granting.

**Scroll not working** — Install pyobjc: `pip3 install pyobjc-framework-Quartz`

**Permission prompts on every CUA tool call (Claude Code)** — The auto-permission bootstrap only runs via the `/cua` skill (plugin install). If using manual MCP config, add `"mcp__cua__*"` to `permissions.allow` in `.claude/settings.local.json`.

**MCP server not starting** — Verify `npx -y mcp-macos-cua` runs from your terminal. Check that Node.js 18+ is installed.

---

## Security

This tool has full GUI control over your Mac. It can click, type, and run AppleScript as your user. Only use it in trusted environments and review what the agent is doing via the screenshot-verify loop.

## License

MIT
