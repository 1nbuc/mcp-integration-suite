import {
	integrationContent,
} from "../generated/IntegrationContent";
import { getCurrentDestination } from "./api_destination";

const { buildAndDeployStatusApi, integrationRuntimeArtifactsApi } =
	integrationContent();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const MAX_DEPLOY_POLL_ATTEMPTS = 120; // ~2 minutes at 1s intervals

/**
 * Waits until deployment is finished
 * Runs as long as status is DEPLOYING, up to MAX_DEPLOY_POLL_ATTEMPTS
 * @param taskId Task ID of deployment
 * @returns Status e.g. SUCCESS, FAILED, ...
 */
export const waitAndGetDeployStatus = async (
	taskId: string
): Promise<string> => {
	let attempts = 0;
	let statusObj = await buildAndDeployStatusApi
		.requestBuilder()
		.getByKey(taskId)
		.execute(await getCurrentDestination());

	while (statusObj.status === "DEPLOYING" && attempts < MAX_DEPLOY_POLL_ATTEMPTS) {
		await sleep(1000);
		statusObj = await buildAndDeployStatusApi
			.requestBuilder()
			.getByKey(taskId)
			.execute(await getCurrentDestination());
		attempts++;
	}

	if (statusObj.status === "DEPLOYING") {
		throw new Error(`Deployment polling timed out after ${MAX_DEPLOY_POLL_ATTEMPTS} attempts for task ${taskId}`);
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
