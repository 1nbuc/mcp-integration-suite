// First call so the imports can use the variable
import path from "path";
export const projPath = path.resolve(__dirname, "..");

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllHandlers } from "./handlers";
import { config } from "dotenv";

import { exit } from "process";
import "./utils/logging"; // Removed .js again
import { writeToErrLog, writeToLog } from "./utils/logging"; // Removed .js again
import { McpServerWithMiddleware } from "./utils/middleware";
import './utils/exitHandler';
import { registerDeleteTempOnExit } from "./utils/exitHandler";

process.on("uncaughtException", (err) => {
	logError(err);
	exit(2);
});

config({ path: path.join(projPath, ".env") });

const server = new McpServerWithMiddleware({
	name: "integration-suite",
	version: "1.0.0",
}, {
	capabilities: {
		resources: {},
		tools: {},
	},
});

registerAllHandlers(server);

async function main() {
	registerDeleteTempOnExit();
	const transport = new StdioServerTransport();

	await server.connect(transport);
}

export const logError = (msg: any): void => {
	writeToErrLog(msg);
	try {
		// just causes lots of error messages on most client because it is not implemented
		//server.server.sendLoggingMessage({level: "error", data: JSON.stringify(msg)});
	} catch { }
};

export const logInfo = (msg: any): void => {
	writeToLog(msg);
	try {
		//server.server.sendLoggingMessage({level: "info", data: JSON.stringify(msg)});
	} catch { }
};

if (!process.env.JEST_WORKER_ID) {
	main()
		.catch((err) => {
			logError(err);
			console.error(err);
			exit(1);
		})
		.then(() => writeToLog("server started"));

}
