// Stub module aliased to "ai" in wrangler.toml.
// The agents package has a dynamic import("ai") in its MCP-client code path
// (used only when McpAgent acts as an MCP *client* calling generateText).
// This worker is a pure MCP *server* and never reaches that code path,
// so it is safe to stub the "ai" module out entirely at bundle time.
export {};
