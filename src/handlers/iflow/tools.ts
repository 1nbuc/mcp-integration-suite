import { z } from "zod";
import {
	createIflow,
	deployIflow,
	getAllIflowsByPackage,
	getEndpoints,
	getIflowConfiguration,
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
import { formatError } from "../../utils/customErrHandler";

export const updateFiles = z.array(
	z.object({
		filepath: z
			.string()
			.describe(
				'filepath within project. E.g. "resources/scenarioflows/integrationflow/myiflow.iflw    Does not have to be an existing file'
			),
		content: z.string().describe(`File content.`),
		appendMode: z
			.boolean()
			.default(false)
			.describe(
				"This can be useful to split requests with large texts into smaller pieces.\n False: file will be replaced by given content True: existing file will be appended with content"
			),
	})
);

export const registerIflowHandlers = (server: McpServerWithMiddleware) => {
	server.registerToolIntegrationSuite(
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
					isError: true,
					content: [formatError(error)],
				};
			}
		}
	);

	server.registerToolIntegrationSuite(
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
				return {
					isError: true,
					content: [formatError(error)],
				};
			}
		}
	);

	server.registerToolIntegrationSuite(
		"update-iflow",
		`Update or create files/content of an iflow
You only have to provide files that need to be updated but allways send the full file

If you encounter prolems updating/deploying iflows consider taking a look at the available templates where you can learn from
Templates for complex iflows and message mappings are avialagle

Iflows can contain message mappings, datatypes (XSDs) and scripts
Message mappings can also be standalone objects, but most of the time will be featured within an iflow

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
					if (taskId) {
						const deployStatus = await waitAndGetDeployStatus(taskId);
						result["deployStatus"] = deployStatus;
					} else {
						result["deployStatus"] = "unknown, please check manually. Deployment was scheduled"
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
	// Shit SAP API
	server.registerToolIntegrationSuite(
		"get-iflow-endpoints",
		`
Get endpoint(s) of iflow and its URLs and Protocols
Isn't very reliable unfourtunately.
If you receive <host>/http/endpointlink the endpoint could also be <host>/http/endpoint/link

The URI path will allways be prefixed with protocol

If you use the error and it gives you 404 try getting the iflow and parsing the actual endpint
But keep in mind that the path in the iflow is missing a prefix
These are the prefixes based on protocol. So if you get /some/endpoint from get-iflow actual path is /http/some/endpoint for REST
    "REST": '/http/',
    
    "AS2": '/as2/as2/'
    
    "SOAP": '/cfx/soapapi/'
    
		`,
		{
			iflowId: z
				.string()
				.optional()
				.describe("Iflow ID. By default it will get all endpoints"),
		},
		async ({ iflowId }) => {
			try {
				const endpoints = await getEndpoints(iflowId);
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								type: "success",
								endpoints,
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

	server.registerToolIntegrationSuite(
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

	server.registerToolIntegrationSuite(
		"get-deploy-error",
		`
If you tried to deploy an Artifact like Iflow or mapping and got an error use this too to get the error message and context
If the response is empty it means there is no deployment error and it was successful

If you have errors consider checking the available examples to resolve them
`,
		{
			id: z
				.string()
				.describe(
					"Artifact ID, can be iflow name or message mapping name etc."
				),
		},
		async ({ id }) => {
			try {
				const errorReason = await getDeploymentErrorReason(id);
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(errorReason),
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

	server.registerToolIntegrationSuite(
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
					isError: true,
					content: [formatError(error)],
				};
			}
		}
	);

	server.registerToolIntegrationSuite(
		"get-iflow-configurations",
		`Get all configurations of an IFlow
Configuration is used to dynamically set values within an iflow. For example a username could be stored in a configuration instead of the iflow directly
Not every iflow is using configurations tho. most of the time configuration is made in iflow directly
`,
		{
			iflowId: z.string().describe("Id or name of the iflow"),
		},
		async ({ iflowId }) => {
			try {
				const configurations = await getIflowConfiguration(iflowId);

				return {
					content: [
						{
							text: JSON.stringify({
								iflowConfiguration: configurations,
							}),
							type: "text",
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

	server.registerToolIntegrationSuite(
		"get-all-iflows",
		`Get a list of all available iflows in a Package
If the user asks for all iflows, get all packages first and then query for each package`,
		{
			pkgId: z.string().describe("Package id"),
		},
		async ({ pkgId }) => {
			try {
				const allIFs = await getAllIflowsByPackage(pkgId);
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({ iflows: allIFs }),
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
