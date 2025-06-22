import {
	deployIntegrationDesigntimeArtifact,
	integrationContent,
} from "../generated/IntegrationContent";
import { getCurrentDestination } from "./api_destination";

const { buildAndDeployStatusApi, integrationRuntimeArtifactsApi } =
	integrationContent();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));


/**
 * Waits until deployment is finished
 * Runs as long as status is DEPLOYING
 * @param taskId Task ID of deployment
 * @returns Staus e.g. SUCCESS, FAILED, ...
 */
export const waitAndGetDeployStatus = async (
	taskId: string
): Promise<string> => {
	let statusObj = await buildAndDeployStatusApi
		.requestBuilder()
		.getByKey(taskId)
		.execute(await getCurrentDestination());

	while (statusObj.status === "DEPLOYING") {
		statusObj = await buildAndDeployStatusApi
			.requestBuilder()
			.getByKey(taskId)
			.execute(await getCurrentDestination());
		await sleep(1000);
	}

	if (!statusObj.status) {
		throw new Error("Error getting deployment status for " + taskId);
	}

	return statusObj.status;
};

/**
 * Get the error of an artifact
 * @param id
 * @returns the error or null if there is no error
 */
export const getDeploymentErrorReason = async (
	id: string
): Promise<string | null> => {
	return (await integrationRuntimeArtifactsApi
		.requestBuilder()
		.getByKey(id)
		.appendPath("/ErrorInformation/$value")
		.executeRaw(await getCurrentDestination())).data;
};
