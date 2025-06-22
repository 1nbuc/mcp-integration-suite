
import { registerPackageHandlers } from "./packages";
import { registerIflowHandlers } from "./iflow/tools";
import { registerPackageDiscoverHandler } from "./discover/packages";
import { registerIflowExampleHandler } from "./iflow/exmaples";
import { registerMessageHandlers } from "./messages";
import { McpServerWithMiddleware } from "../utils/middleware";
import { logError, logInfo } from "..";
import { registerMappingsHandler } from "./mappings";
import { registerMappingsExampleHandler } from "./mappings/examples";
import { registerDocsHandlers } from "./docs";

const registerDefaultMiddleware = (server: McpServerWithMiddleware) => {
	server.use(async(next, name, params) => {
		logInfo(`executing ${name} with ${JSON.stringify(params)}`);
		const startTime = performance.now();

		await next();

		logInfo(`${name} executed in ${performance.now() - startTime}ms`);
	});
};


export const registerAllHandlers = (server: McpServerWithMiddleware) => {
	registerDefaultMiddleware(server);
	registerPackageHandlers(server);
	registerIflowHandlers(server);
	registerPackageDiscoverHandler(server);
	registerIflowExampleHandler(server);
	registerMessageHandlers(server);
	registerMappingsHandler(server);
	registerMappingsExampleHandler(server);
	registerDocsHandlers(server);
};

