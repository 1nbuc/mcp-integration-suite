import { promises as fs } from "fs";
import path from "path";
import { projPath } from "../..";
import { McpServerWithMiddleware } from "../../utils/middleware";
import { formatError } from "../../utils/customErrHandler";

const resourceDiscoverPath = path.resolve(projPath, "./resources/Discover");

export const registerPackageDiscoverHandler = (server: McpServerWithMiddleware) => {
	server.registerToolIntegrationSuite(
		"discover-packages",
		"Get information about Packages from discover center",
		{},
		async () => {
			try {
				return {
					content: [
						{
							type: "text",
							text: await fs.readFile(
								path.join(
									resourceDiscoverPath,
									"IntegrationPackages.json"
								),
								"utf-8"
							),
						},
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
