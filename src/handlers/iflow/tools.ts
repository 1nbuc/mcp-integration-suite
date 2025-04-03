import { z } from "zod";
import {
	createIflow,
	deployIflow,
	getEndpoints,
	getIflowContentString,
	getIflowFolder,
	saveAsNewVersion,
	updateIflow,
} from "../../api/iflow";
import { logError, logInfo } from "../..";
import { getiFlowToImage } from "../../api/iflow/diagram";
import { McpServerWithMiddleware } from "../../utils/middleware";
import {
	getDeploymentErrorReason,
	waitAndGetDeployStatus,
} from "../../api/deployment";
import { text } from "node:stream/consumers";

export const updateFiles = z.array(
	z.object({
		filepath: z
			.string()
			.describe(
				'filepath within project. E.g. "resources/scenarioflows/integrationflow/myiflow.iflw    Does not have to be an existing file'
			),
		content: z.string().describe(`File content.`),
	})
);

export const registerIflowHandlers = (server: McpServerWithMiddleware) => {
	server.registerTool(
		"get-iflow",
		`Get the data of an iflow and the contained ressources. 
Some ressources might relay on other package artefacts which are not included but reffrenced
`,
		{
			id: z.string().describe("ID of the IFLOW"),
		},
		async ({ id }) => {
			logInfo(`trying to get iflow ${id}`);
			try {
				const fileContent = await getIflowContentString(id);
				//const escapedFileContent = escapeDoublequotes(fileContent);

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								type: "success",
								iflowContent: fileContent,
							}),
						},
					],
				};
			} catch (error) {
				logError(error);
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({ type: "error", error }),
						},
					],
					isError: true,
				};
			}
		}
	);

	server.registerTool(
		"create-empty-iflow",
		`Create an empty iflow without functionality. You probably want to add content to it afterwards with tool get-iflow and then update-iflow`,
		{
			packageId: z.string().describe("Package ID"),
			id: z.string().describe("ID/Name of the Iflow"),
		},
		async ({ packageId, id }) => {
			try {
				await createIflow(packageId, id);
				return {
					content: [
						{
							type: "text",
							text: "IFlow successfully created. You can now use get-iflow and then edit it and upload with update-iflow",
						},
					],
				};
			} catch (error) {
				logError(error);
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({ type: "error", error }),
						},
					],
					isError: true,
				};
			}
		}
	);

	server.registerTool(
		"update-iflow",
		`Update or create files/content of an iflow
You only have to provide files that need to be updated but allways send the full file
Make sure you ONLY change the things the user instructs you to and keep all other things
Folder structure is like this:
src/main/resources/ is the root
src/main/resources/mapping contains message mappings in format <mappingname>.mmap with xml structure
src/main/resources/xsd contains all xsd file in format <filename>.xsd
src/main/resources/scripts contains groovy and javascript scripts that can be used within iflow
src/main/resources/scenarioflows/integrationflow/<iflow id>.iflw contains the iflow in xml structure
        `,
		{
			id: z.string().describe("ID of the IFLOW"),
			files: updateFiles,
			autoDeploy: z
				.boolean()
				.describe(
					"True if iflow should be deployed after updateing, false if not"
				),
		},
		async ({ id, files, autoDeploy }) => {
			logInfo(`Updating iflow ${id} autodeploy: ${autoDeploy}`);

			try {
				const result = await updateIflow(id, files);
				logInfo("Iflow updated successfully");
				if (autoDeploy) {
					logInfo("auto deploy is activated");
					await saveAsNewVersion(id);
					const taskId = await deployIflow(id);
					const deployStatus = await waitAndGetDeployStatus(taskId);
					result["deployStatus"] = deployStatus;
				}

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								type: "server response",
								content: result,
							}),
						},
					],
				};
			} catch (error) {
				logError(error);
				return {
					content: [
						{
							type: "text",
							text: `Error: Could not update`,
						},
					],
					isError: true,
				};
			}
		}
	);

	server.registerTool(
		"get-iflow-endpoints",
		`
Get endpoint(s) of iflow and its URLs and Protocols
		`,
		{
			iflowId: z
				.string()
				.optional()
				.describe("Iflow ID. By default it will get all endpoints"),
		},
		async ({ iflowId }) => {
			const endpoints = await getEndpoints(iflowId);
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify({ type: "success", endpoints }),
					},
				],
			};
		}
	);

	server.registerTool(
		"iflow-image",
		"Get the iflow logic shown as a image/diagram",
		{
			iflowId: z.string().describe("IFlow ID/Name"),
		},
		async ({ iflowId }) => {
			const iflowPath = await getIflowFolder(iflowId);
			logInfo(iflowPath);
			const pngString = await getiFlowToImage(iflowPath);
			return {
				content: [
					{
						type: "image",
						data: pngString,
						mimeType: "image/png",
					},
				],
			};
		}
	);

	server.registerTool(
		"get-deploy-error",
		`
If you tried to deploy an Artifact like Iflow or mapping and got an error use this too to get the error message and context
`,
		{
			id: z
				.string()
				.describe(
					"Artifact ID, can be iflow name or message mapping name etc."
				),
		},
		async ({ id }) => {
			const error = await getDeploymentErrorReason(id);
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(error),
					},
				],
			};
		}
	);

	server.registerTool(
		"deploy-iflow",
		`
deploy a iflow
If the deployment status is unsuccessful try getting information from get-deploy-error
		`,
		{ iflowId: z.string().describe("ID/Name of iflow") },

		async ({ iflowId }) => {
			try {
				const taskId = await deployIflow(iflowId);
				const deployStatus = await waitAndGetDeployStatus(taskId);
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({ deployStatus }),
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({ error }),
						},
					],
					isError: true,
				};
			}
		}
	);
};
