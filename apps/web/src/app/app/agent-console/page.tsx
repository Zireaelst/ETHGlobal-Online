import type { Metadata } from "next";
import { ConnectionGuide } from "@/features/connect/connection-guide";

export const metadata: Metadata = { title: "Connect Agents" };
export default function AgentConsolePage() { return <div className="app-page app-page--wide"><header className="app-page-header"><div><span className="app-kicker">Agent-native access</span><h1>Connect BlockTerms to anything.</h1><p>Use the marketplace from Claude Code, Codex, OpenCode, an npm CLI, TypeScript, REST, or any MCP-compatible agent without depending on the frontend.</p></div></header><ConnectionGuide /></div>; }
