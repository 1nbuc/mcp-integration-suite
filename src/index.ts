// First call so the imports can use the variable
import path from 'path';
export const projPath = path.resolve(__dirname, '..');

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllHandlers } from "./handlers";
import { config } from 'dotenv';

import { exit } from "process";
import './utils/logging.js';
import { writeToLog } from "./utils/logging.js";
import { McpServerWithMiddleware } from './utils/middleware';

process.on('uncaughtException', err => {
	logError(err);
	exit(2);
});

config({ path: path.join(projPath, '.env') });

const server = new McpServerWithMiddleware({
	name: "integration-suite",
	version: "1.0.0",
	capabilities: {
		resources: {},
		tools: {},
	},
});

registerAllHandlers(server);

async function main() {
	const transport = new StdioServerTransport();
	
	await server.connect(transport);
}

export const logError = (msg: any): void => {
	writeToLog(msg);
	// try {
	// 	server.server.sendLoggingMessage({level: "error", data: msg});
	// } catch {
		
	// }
	
}

export const logInfo = (msg: any): void => {
	writeToLog(msg);
	// try {
	// 	server.server.sendLoggingMessage({level: "info", data: msg});
	// } catch {
		
	// }
	
}

main().catch(err => {
	logError(err);
	console.error(err);
	exit(1);
}).then(() => writeToLog("server started"));