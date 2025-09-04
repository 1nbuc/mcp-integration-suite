import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createPackage, getPackage, getPackages } from "../../api/packages";
import { McpServerWithMiddleware } from "../../utils/middleware";
import { formatError } from "../../utils/customErrHandler";

export const registerPackageHandlers = (server: McpServerWithMiddleware) => {
	server.registerToolIntegrationSuite(
		"packages",
		"Get all integration packages",
		{},
		async () => {
			try {
				const allPackages = await getPackages();
				return {
					content: [
						{ type: "text", text: JSON.stringify(allPackages) },
					],
				};
			} catch (error) {
				return {
					isError: true,
					content: [formatError(error)],
				};
			}
		}
	);

	server.registerToolIntegrationSuite(
		"package",
		"Get Content of a integration package by name",
		{
			name: z.string().describe("Name/ID of the package"),
		},
		async ({ name }) => {
			try {
				const packageContent = await getPackage(name);
				return {
					content: [
						{ type: "text", text: JSON.stringify(packageContent) },
					],
				};
			} catch (error) {
				return {
					isError: true,
					content: [formatError(error)],
				};
			}
		}
	);

	server.registerToolIntegrationSuite(
		"create-package",
		"Create a new integration package",
		{
			id: z.string().describe("ID of the package"),
			name: z
				.string()
				.optional()
				.describe("Package Name (uses ID by default)"),
			shortText: z
				.string()
				.optional()
				.describe("Short text of the package"),
		},
		async ({ id, name, shortText }) => {
			try {
				const packageContent = await createPackage(id, name, shortText);
				return {
					content: [
						{ type: "text", text: JSON.stringify(packageContent) },
					],
				};
			} catch (error) {
				return {
					isError: true,
					content: [formatError(error)],
				};
			}
		}
	);
};
