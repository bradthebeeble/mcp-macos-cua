#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { execSync } from "child_process";
import { readFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const server = new McpServer({
  name: "mcp-macos-cua",
  version: "1.0.0",
});

function run(cmd, timeout = 10000) {
  return execSync(cmd, { encoding: "utf-8", timeout }).trim();
}

function getDisplayScaleFactor() {
  try {
    const pyScript = `
import Quartz
display = Quartz.CGMainDisplayID()
mode = Quartz.CGDisplayCopyDisplayMode(display)
pw = Quartz.CGDisplayModeGetPixelWidth(mode)
lw = Quartz.CGDisplayModeGetWidth(mode)
print(int(pw / lw))
`.trim();
    const scale = parseInt(run(`python3 -c "${pyScript.replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`), 10);
    return scale || 2;
  } catch {
    return 2;
  }
}

// --- Screenshot ---

server.tool(
  "screenshot",
  "Take a screenshot of the entire screen or a specific app window. Returns the image and the display scale factor (divide screenshot pixel coordinates by this factor to get tool coordinates).",
  { app: z.string().optional().describe("App name to screenshot. If omitted, captures full screen.") },
  async ({ app }) => {
    const tmp = join(tmpdir(), `cua-screenshot-${Date.now()}.png`);
    try {
      if (app) {
        const script = `
          tell application "${app}" to activate
          delay 0.5
          tell application "System Events" to tell process "${app}"
            set wid to id of window 1
          end tell
          return wid
        `;
        try {
          run(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
        } catch {}
        run(`screencapture -o "${tmp}"`, 15000);
      } else {
        run(`screencapture -x "${tmp}"`, 15000);
      }
      const data = readFileSync(tmp);
      unlinkSync(tmp);
      const scaleFactor = getDisplayScaleFactor();
      return {
        content: [
          { type: "image", data: data.toString("base64"), mimeType: "image/png" },
          { type: "text", text: `Display scale factor: ${scaleFactor}x. Divide screenshot pixel coordinates by ${scaleFactor} to get tool coordinates.` },
        ],
      };
    } catch (e) {
      try { unlinkSync(tmp); } catch {}
      return { content: [{ type: "text", text: `Screenshot failed: ${e.message}` }] };
    }
  }
);

// --- Open App ---

server.tool(
  "open_app",
  "Open and activate a macOS application",
  { app: z.string().describe("Application name (e.g. 'Slack', 'WhatsApp', 'Safari')") },
  async ({ app }) => {
    try {
      run(`osascript -e 'tell application "${app}" to activate'`);
      run(`sleep 1`);
      run(`osascript -e 'tell application "System Events" to tell process "${app}" to set frontmost to true'`);
      return { content: [{ type: "text", text: `Opened and activated ${app}` }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Failed to open ${app}: ${e.message}` }] };
    }
  }
);

// --- Click ---

server.tool(
  "click",
  "Click at screen coordinates (in points). Use screenshot to determine positions — on Retina displays, divide screenshot pixel coordinates by 2.",
  {
    x: z.number().describe("X coordinate in screen points"),
    y: z.number().describe("Y coordinate in screen points"),
    clicks: z.number().optional().default(1).describe("Number of clicks (1=single, 2=double)"),
    button: z.enum(["left", "right"]).optional().default("left").describe("Mouse button"),
  },
  async ({ x, y, clicks, button }) => {
    try {
      const btn = button === "right" ? "rc" : "c";
      const cmd = clicks === 2 ? `dc:${x},${y}` : `${btn}:${x},${y}`;
      run(`cliclick ${cmd}`);
      return { content: [{ type: "text", text: `Clicked at (${x}, ${y})` }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Click failed: ${e.message}` }] };
    }
  }
);

// --- Type Text ---

server.tool(
  "type_text",
  "Type text using the keyboard. The frontmost app receives the input.",
  { text: z.string().describe("Text to type") },
  async ({ text }) => {
    try {
      run(`osascript -e 'tell application "System Events" to keystroke "${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"'`);
      return { content: [{ type: "text", text: `Typed: ${text}` }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Type failed: ${e.message}` }] };
    }
  }
);

// --- Key Press ---

server.tool(
  "key_press",
  "Press a key or key combination (e.g. 'return', 'escape', 'cmd+c', 'cmd+shift+l')",
  { keys: z.string().describe("Key combo like 'return', 'escape', 'tab', 'cmd+c', 'cmd+shift+a', 'up', 'down', 'pagedown', 'pageup'") },
  async ({ keys }) => {
    try {
      const parts = keys.toLowerCase().split("+").map((s) => s.trim());
      const key = parts.pop();

      const modifiers = parts.map((m) => {
        switch (m) {
          case "cmd": case "command": return "command down";
          case "shift": return "shift down";
          case "alt": case "option": return "option down";
          case "ctrl": case "control": return "control down";
          default: return null;
        }
      }).filter(Boolean);

      const keyCodeMap = {
        return: 36, enter: 36, escape: 53, esc: 53, tab: 48, space: 49,
        delete: 51, backspace: 51, up: 126, down: 125, left: 123, right: 124,
        pageup: 116, pagedown: 121, home: 115, end: 119,
        f1: 122, f2: 120, f3: 99, f4: 118, f5: 96, f6: 97,
      };

      const modStr = modifiers.length > 0 ? ` using {${modifiers.join(", ")}}` : "";

      let script;
      if (keyCodeMap[key] !== undefined) {
        script = `tell application "System Events" to key code ${keyCodeMap[key]}${modStr}`;
      } else if (key.length === 1) {
        script = `tell application "System Events" to keystroke "${key}"${modStr}`;
      } else {
        return { content: [{ type: "text", text: `Unknown key: ${key}` }] };
      }

      run(`osascript -e '${script}'`);
      return { content: [{ type: "text", text: `Pressed: ${keys}` }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Key press failed: ${e.message}` }] };
    }
  }
);

// --- Scroll ---

server.tool(
  "scroll",
  "Scroll at the current mouse position or at given coordinates",
  {
    direction: z.enum(["up", "down", "left", "right"]).describe("Scroll direction"),
    amount: z.number().optional().default(3).describe("Number of scroll steps"),
    x: z.number().optional().describe("X coordinate to scroll at (moves mouse first)"),
    y: z.number().optional().describe("Y coordinate to scroll at (moves mouse first)"),
  },
  async ({ direction, amount, x, y }) => {
    try {
      if (x !== undefined && y !== undefined) {
        run(`cliclick m:${x},${y}`);
      }
      const delta = direction === "down" ? -amount : direction === "up" ? amount : 0;
      const deltaH = direction === "left" ? amount : direction === "right" ? -amount : 0;

      const pyScript = `
import Quartz
e = Quartz.CGEventCreateScrollWheelEvent(None, Quartz.kCGScrollEventUnitLine, 2, ${delta}, ${deltaH})
Quartz.CGEventPost(Quartz.kCGHIDEventTap, e)
`.trim();
      run(`python3 -c "${pyScript.replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`);
      return { content: [{ type: "text", text: `Scrolled ${direction} ${amount} steps` }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Scroll failed: ${e.message}` }] };
    }
  }
);

// --- Get UI Elements ---

server.tool(
  "get_ui_elements",
  "Get accessibility UI elements of a window for a given app. Useful for finding buttons, text fields, etc.",
  {
    app: z.string().describe("Application process name"),
    depth: z.enum(["shallow", "deep"]).optional().default("shallow").describe("'shallow' for top-level elements, 'deep' for full tree (can be slow)"),
  },
  async ({ app, depth }) => {
    try {
      const script = depth === "deep"
        ? `tell application "System Events" to tell process "${app}" to get entire contents of window 1`
        : `tell application "System Events" to tell process "${app}" to get {role, name, description} of every UI element of window 1`;
      const result = run(`osascript -e '${script}'`, 15000);
      return { content: [{ type: "text", text: result }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Failed to get UI elements: ${e.message}` }] };
    }
  }
);

// --- Click UI Element ---

server.tool(
  "click_ui_element",
  "Click a named UI element (button, menu item, etc.) within an app window using accessibility",
  {
    app: z.string().describe("Application process name"),
    element_type: z.string().describe("UI element type: button, menu item, text field, checkbox, etc."),
    name: z.string().describe("Name/title of the element to click"),
    path: z.string().optional().describe("Optional parent path like 'group 1 of group 2 of window 1'. Defaults to 'window 1'."),
  },
  async ({ app, element_type, name, path }) => {
    const parent = path || "window 1";
    try {
      const script = `tell application "System Events" to tell process "${app}" to click ${element_type} "${name}" of ${parent}`;
      const result = run(`osascript -e '${script}'`, 10000);
      return { content: [{ type: "text", text: `Clicked ${element_type} "${name}": ${result}` }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Failed: ${e.message}` }] };
    }
  }
);

// --- Run AppleScript ---

server.tool(
  "run_applescript",
  "Run arbitrary AppleScript for complex automation that other tools don't cover",
  { script: z.string().describe("AppleScript code to execute") },
  async ({ script }) => {
    try {
      const result = run(`osascript -e '${script.replace(/'/g, "'\\''")}'`, 15000);
      return { content: [{ type: "text", text: result || "(no output)" }] };
    } catch (e) {
      return { content: [{ type: "text", text: `AppleScript failed: ${e.message}` }] };
    }
  }
);

// --- Get Mouse Position ---

server.tool(
  "get_mouse_position",
  "Get the current mouse cursor position in screen points",
  {},
  async () => {
    try {
      const result = run(`cliclick p`);
      return { content: [{ type: "text", text: result }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Failed: ${e.message}` }] };
    }
  }
);

// --- Move Mouse ---

server.tool(
  "move_mouse",
  "Move mouse cursor to given screen coordinates",
  {
    x: z.number().describe("X coordinate"),
    y: z.number().describe("Y coordinate"),
  },
  async ({ x, y }) => {
    try {
      run(`cliclick m:${x},${y}`);
      return { content: [{ type: "text", text: `Moved to (${x}, ${y})` }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Failed: ${e.message}` }] };
    }
  }
);

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
