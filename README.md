# MCP Integration Suite Server

A ModelContextProtocol (MCP) Server for SAP Integration Suite.

## Requirements
NodeJs and NPM (Node Version > 20)

## Installation
```sh
git clone https://github.com/1nbuc/mcp-integration-suite.git
cd mcp-integration-suite
npm install
npm run build
```
Add this to your AI Clients MCP Config. 
For Claude Desktop: `~/Library/Application\ Support/Claude/claude_desktop_config.json`
```json
{
  "mcpServers": {
    "mcp-integration-suite": {
      "command": "node",
      "args": [
        "<project path>/dist/index.js"
      ],
      "autoApprove": []
    }
  }
}
```

# TODOs
- CRUD Standalone Message Mappings
- Message Mapping Examples
- Check Deployment/Error status
- Provide default prompt
- Handle auth problems/test login
- CSRF implementation