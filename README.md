# mcp-macos-cua

A macOS **Computer Use Agent** (CUA) — an MCP server + Claude Code skill that gives AI agents full GUI automation capabilities on macOS.

Control any desktop app through screenshots, mouse clicks, keyboard input, accessibility queries, and AppleScript.

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
- **Python 3** with pyobjc-framework-Quartz (for scroll, usually pre-installed on macOS)

Run the setup checker:
```bash
bash setup.sh
```

## Installation

### Claude Code (plugin — recommended)

```bash
claude plugin add github:bradthebeeble/mcp-macos-cua
```

This registers the MCP server and the `/cua` skill in one step. You can immediately use:
```
/cua open Safari and search for today's weather
```

### Claude Code (manual MCP config)

Add to your `.mcp.json` or `~/.claude/settings.json`:

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

### Cursor

In Cursor Settings > MCP, add:

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

Cursor doesn't support skills/slash commands, but the MCP tools are available directly in agent chat. Use a prompt like:

> Take a screenshot, then open Mail and compose a new email to hello@example.com

### Other MCP clients

Clone and run directly:
```bash
git clone https://github.com/bradthebeeble/mcp-macos-cua.git
cd mcp-macos-cua
npm install
node server/index.js
```

## Usage

### The CUA Loop

The `/cua` skill follows a **Screenshot → Analyze → Act → Verify → Repeat** loop:

1. Takes a screenshot to see the current screen state
2. Analyzes what action to take next
3. Executes the action (click, type, etc.)
4. Takes another screenshot to verify the result
5. Repeats until the task is complete

### Coordinate System

The `screenshot` tool automatically detects the display scale factor (2x for Retina, 1x for standard displays) and returns it with every screenshot. Divide screenshot pixel positions by this factor to get correct tool coordinates.

### Examples

```
/cua open Slack and send "hello" to the #general channel
/cua take a screenshot of Safari
/cua open Notes and create a grocery list
/cua open System Settings and enable Dark Mode
```

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

## Troubleshooting

**"cliclick not found"** — Install with `brew install cliclick`

**Clicks land in wrong position** — Check the scale factor returned by screenshot. Divide pixel coordinates by that factor.

**"not allowed assistive access"** — Grant Accessibility permissions in System Settings > Privacy & Security > Accessibility

**Scroll not working** — Install pyobjc: `pip3 install pyobjc-framework-Quartz`

## Security

This tool has full GUI control over your Mac. It can click, type, and run AppleScript as your user. Use with `--dangerously-skip-permissions` only when you understand the implications.

## License

MIT
