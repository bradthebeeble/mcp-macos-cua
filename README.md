# mcp-macos-cua

A macOS **Computer Use Agent** (CUA) — an MCP server that gives AI agents full GUI automation capabilities on macOS.

Control any desktop app through screenshots, mouse clicks, keyboard input, accessibility queries, and AppleScript.

> **Optimized for Claude Code** — includes a ready-to-use `/cua` skill with automatic permission bootstrap. Works as a standalone MCP server with any MCP-compatible agent.

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
- **Python 3** with pyobjc-framework-Quartz — usually pre-installed on macOS; if not: `pip3 install pyobjc-framework-Quartz`

Run the setup checker to verify everything:
```bash
bash setup.sh
```

---

## Installation

### Claude Code Plugin (Recommended)

Install from the `bradthebeeble-plugins` marketplace:

```bash
claude plugin install mcp-macos-cua@bradthebeeble-plugins
```

If you don't have the marketplace configured yet, add it first:

```bash
claude marketplace add https://github.com/bradthebeeble/claude-plugins
```

Or load locally during development:

```bash
claude --plugin-dir ./mcp-macos-cua
```

This registers both the MCP server **and** the `/cua` skill in one step. Start using it immediately:

```
/mcp-macos-cua:cua open Safari and search for today's weather
```

**Auto-permissions:** On first use, the `/cua` skill detects whether CUA tool permissions are configured. If not, it asks once to allow all CUA tools — no more per-tool prompts.

### Claude Code (Manual MCP Only)

If you only want the MCP server without the plugin skill, add to your project's `.mcp.json`:

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

> **Note:** This gives you the raw MCP tools but **not** the `/cua` skill, the CUA loop prompt, or the auto-permission bootstrap. You'll need to prompt the agent yourself (see [System Prompt for Other Agents](#system-prompt-for-other-agents) below).

To avoid per-tool permission prompts, add this to `.claude/settings.local.json`:

```json
{
  "permissions": {
    "allow": ["mcp__cua__*"]
  }
}
```

### Other AI Agents (DIY)

The MCP server works with any agent that supports the [Model Context Protocol](https://modelcontextprotocol.io). Here's how to set it up outside Claude Code.

#### Step 1: Install the MCP server

**Option A — npx (no install needed):**
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

**Option B — Clone and run:**
```bash
git clone https://github.com/bradthebeeble/mcp-macos-cua.git
cd mcp-macos-cua
npm install
node server/index.js
```

#### Step 2: Configure your agent's MCP client

Add the server to your agent's MCP configuration. The exact format depends on your agent:

| Agent | Config location |
|-------|----------------|
| **Cursor** | Settings > MCP > Add server |
| **Windsurf** | `.windsurfrules` or MCP settings |
| **Custom** | Your MCP client config file |

#### Step 3: Add a system prompt

The MCP server provides the tools, but the agent needs instructions on **how** to use them effectively. Add the following to your agent's system prompt or instructions:

<details>
<summary>CUA System Prompt (click to expand)</summary>

```
You are a Computer Use Agent (CUA) on macOS. Interact with the GUI using the cua MCP tools.

## CUA Loop
1. Screenshot - Take a screenshot to see current state
2. Analyze - Determine what action to take next
3. Act - Use the appropriate tool
4. Verify - Screenshot again to confirm it worked
5. Repeat or Report - Continue or summarize results

## Coordinate System
The screenshot tool returns a display scale factor (e.g. 2x for Retina, 1x for standard).
Divide screenshot pixel positions by this scale factor to get correct tool coordinates.

## Tips
- Always start with a screenshot
- Prefer click_ui_element (accessibility) over coordinate click when possible
- Use get_ui_elements to discover clickable elements by name
- Use key_press for keyboard shortcuts (faster than navigating menus)
- Use scroll with x,y to scroll within a specific area
- Use run_applescript as escape hatch for complex multi-step automation
```

</details>

#### Step 4: Handle permissions

Each agent handles tool permissions differently:
- **Cursor/Windsurf**: Tools are auto-approved once the MCP server is added
- **Custom agents**: Ensure your MCP client allows tool calls without blocking

---

## Usage

### The CUA Loop

The `/cua` skill (Claude Code) or the system prompt (other agents) follows a **Screenshot > Analyze > Act > Verify > Repeat** loop:

1. Takes a screenshot to see the current screen state
2. Analyzes what action to take next
3. Executes the action (click, type, etc.)
4. Takes another screenshot to verify the result
5. Repeats until the task is complete

### Coordinate System

The `screenshot` tool automatically detects the display scale factor (2x for Retina, 1x for standard displays) and returns it with every screenshot. **Divide screenshot pixel positions by this factor** to get correct tool coordinates.

### Examples

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

To distribute this plugin within your team or organization, add it to a [Claude Code plugin marketplace](https://code.claude.com/docs/en/plugin-marketplaces):

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

3. Team members can then install with:

```bash
claude plugin install mcp-macos-cua@your-marketplace
```

---

## Troubleshooting

**"cliclick not found"** — Install with `brew install cliclick`

**Clicks land in wrong position** — Check the scale factor returned by `screenshot`. Divide pixel coordinates by that factor.

**"not allowed assistive access"** — Grant Accessibility permissions in System Settings > Privacy & Security > Accessibility to your terminal app.

**Scroll not working** — Install pyobjc: `pip3 install pyobjc-framework-Quartz`

**Permission prompts on every CUA tool call (Claude Code)** — The auto-permission bootstrap only runs via the `/cua` skill. If using manual MCP config, add `"mcp__cua__*"` to `permissions.allow` in `.claude/settings.local.json`.

---

## Security

This tool has full GUI control over your Mac. It can click, type, and run AppleScript as your user. Only use it in trusted environments and review what the agent is doing via the screenshot-verify loop.

## License

MIT
