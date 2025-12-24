import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult, ServerRequest, ServerNotification, ContentBlock } from "@modelcontextprotocol/sdk/types.js";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { z } from "zod";

type MiddlewareFunction = (
	next: () => Promise<void>,
	name: string,
	params: z.ZodRawShape
) => Promise<void>;

export type contentReturnElement = ContentBlock;

export class MiddlewareManager {
	private middlewares: MiddlewareFunction[] = [];

	use(middleware: MiddlewareFunction) {
		this.middlewares.push(middleware);
	}

	async execute(name: string, params: z.ZodRawShape) {
		const executeMiddleware = async (index: number): Promise<void> => {
			if (index >= this.middlewares.length) {
				return;
			}

			const middleware = this.middlewares[index];
			await middleware(() => executeMiddleware(index + 1), name, params);
		};

		await executeMiddleware(0);
	}
}

/**
 * Custom Middleware Server which extends McpServer by a middleware functionality
 * This is useful for logging atm
 */
export class McpServerWithMiddleware extends McpServer {
	private middlewareManager: MiddlewareManager;

	constructor(serverInfo: ConstructorParameters<typeof McpServer>[0], options?: ConstructorParameters<typeof McpServer>[1]) {
		super(serverInfo, options);
		this.middlewareManager = new MiddlewareManager();
	}

	use(middleware: MiddlewareFunction) {
		this.middlewareManager.use(middleware);
	}

	/**
	 * wrapper function for server.tool() to have middleware functionalities
	 */
	registerToolIntegrationSuite(
		name: string,
		description: string,
		params: z.ZodRawShape,
		handler: (
			args: { [x: string]: any },
			extra: RequestHandlerExtra<ServerRequest, ServerNotification>
		) => Promise<CallToolResult>
	) {
		const wrappedHandler = async (
			args: { [x: string]: any },
			extra: RequestHandlerExtra<ServerRequest, ServerNotification>
		): Promise<CallToolResult> => {
			await this.middlewareManager.execute(name, params);
			return handler(args, extra);
		};

		return this.registerTool<any, any>(name, { description, inputSchema: params }, wrappedHandler);
	}
}
