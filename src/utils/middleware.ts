import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

type MiddlewareFunction = (
	next: () => Promise<void>,
	name: string,
	params: z.ZodRawShape
) => Promise<void>;

export type contentReturnElement =
	| {
		[x: string]: unknown;
		type: "text";
		text: string;
	}
	| {
		[x: string]: unknown;
		type: "image";
		data: string;
		mimeType: string;
	}
	| {
		[x: string]: unknown;
		type: "resource";
		resource:
		| {
			[x: string]: unknown;
			text: string;
			uri: string;
			mimeType?: string;
		}
		| {
			[x: string]: unknown;
			uri: string;
			blob: string;
			mimeType?: string;
		};
	};

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

	constructor(options: ConstructorParameters<typeof McpServer>[0]) {
		super(options);
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
			extra: { [x: string]: unknown }
		) => Promise<{
			[x: string]: unknown;
			content: Array<contentReturnElement>;
			_meta?: { [x: string]: unknown };
			isError?: boolean;
		}>
	) {
		const wrappedHandler = async (
			args: { [x: string]: any },
			extra: { [x: string]: unknown }
		) => {
			await this.middlewareManager.execute(name, params);
			return handler(args, extra);
		};

		return this.tool(name, description, params, wrappedHandler);
	}
}
