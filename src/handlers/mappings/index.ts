import { logError, logInfo } from "../..";
import {
	createMessageMapping,
	deployMapping,
	getMessageMappingContentString,
	saveAsNewVersion,
	updateMessageMapping,
} from "../../api/mappings";
import { McpServerWithMiddleware } from "../../utils/middleware";
import { z } from "zod";
import { updateFiles } from "../iflow/tools";
import { waitAndGetDeployStatus } from "../../api/deployment";
import { formatError } from "../../utils/customErrHandler";

export const registerMappingsHandler = (server: McpServerWithMiddleware) => {
	server.registerTool(
		"get-messagemapping",
		`Get the data of an Message Mapping and the contained ressources. 
    Some ressources might relay on other package artefacts which are not included but reffrenced
    `,
		{
			id: z.string().describe("ID of the Message Mapping"),
		},
		async ({ id }) => {
			logInfo(`trying to get message mapping ${id}`);
			try {
				const fileContent = await getMessageMappingContentString(id);

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								type: "success",
								messageMappingContent: fileContent,
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
		"update-message-mapping",
		`Update or create files/content of an message mapping
    You only have to provide files that need to be updated but allways send the full file
    Make sure you ONLY change the things the user instructs you to and keep all other things

	

    Folder structure is like this:
    src/main/resources/ is the root
    src/main/resources/mapping contains message mappings in format <mappingname>.mmap with xml structure
    src/main/resources/xsd contains all xsd file in format <filename>.xsd
    src/main/resources/scripts contains groovy and javascript scripts that can be used within message mapping
    src/main/resources/mapping/<message mapping id>.mmap contains the mapping in xml structure
            `,
		{
			id: z.string().describe("ID of the messageMapping"),
			files: updateFiles,
			autoDeploy: z
				.boolean()
				.describe(
					"True if messageMapping should be deployed after updateing, false if not"
				),
		},
		async ({ id, files, autoDeploy }) => {
			logInfo(`Updating messageMapping ${id} autodeploy: ${autoDeploy}`);

			try {
				const result = await updateMessageMapping(id, files);
				logInfo("messageMapping updated successfully");
				if (autoDeploy) {
					logInfo("auto deploy is activated");
					await saveAsNewVersion(id);
					try {
						const taskId = await deployMapping(id);
						const deployStatus = await waitAndGetDeployStatus(taskId);
						result["deployStatus"] = deployStatus;
					} catch (error) {
						result["deployStatus"] = 'Unable to check deployment status for message mapping';
					}

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
				return {
					isError: true,
					content: [formatError(error)],
				};
			}
		}
	);

	server.registerTool(
		"deploy-message-mapping",
		`
        deploy a message-mapping
        If the deployment status is unsuccessful try getting information from get-deploy-error
                `,
		{ mappingId: z.string().describe("ID/Name of message-mapping") },

		async ({ mappingId }) => {
			try {
				const taskId = await deployMapping(mappingId);
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
					isError: true,
					content: [formatError(error)],
				};
			}
		}
	);

	server.registerTool(
		"create-empty-mapping",
		`Create an empty message mapping without functionality. You probably want to add content to it afterwards with tool get-mapping and then update-mapping`,
		{
			packageId: z.string().describe("Package ID"),
			id: z.string().describe("ID/Name of the Message Mapping"),
		},
		async ({ packageId, id }) => {
			try {
				await createMessageMapping(packageId, id);
				return {
					content: [
						{
							type: "text",
							text: "Message Mapping successfully created. You can now use get-messagemapping and then edit it and upload with update-message-mapping",
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
