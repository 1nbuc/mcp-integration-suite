import { logInfo } from "../..";
import {
	deployMessageMappingDesigntimeArtifact,
	integrationContent,
	messageMappingDesigntimeArtifactSaveAsVersion,
} from "../../generated/IntegrationContent";
import { updateFiles } from "../../handlers/iflow/tools";
import { parseFolder, patchFile } from "../../utils/fileBasedUtils";
import { extractToFolder, folderToZipBuffer } from "../../utils/zip";
import { getCurrentDestionation, getOAuthToken } from "../api_destination";
import { z } from "zod";
import semver from "semver";
import { executeHttpRequest } from "@sap-cloud-sdk/http-client";

const { messageMappingDesigntimeArtifactsApi } = integrationContent();

export const getMessageMappingContentString = async (
	id: string
): Promise<string> => {
	const folderPath = await getMessageMappingFolder(id);
	return parseFolder(folderPath);
};

export const getMessageMappingFolder = async (id: string): Promise<string> => {
	const arrBuffer = await messageMappingDesigntimeArtifactsApi
		.requestBuilder()
		.getByKey(id, "active")
		.appendPath("/$value")
		.addCustomRequestConfiguration({ responseType: "arraybuffer" })
		.executeRaw(await getCurrentDestionation());

	const buf = Buffer.from(arrBuffer.data);
	return extractToFolder(buf, id);
};

export const updateMessageMapping = async (
	id: string,
	messagemappingFiles: z.infer<typeof updateFiles>
) => {
	const messagemappingPath = await getMessageMappingFolder(id);

	for (const file of messagemappingFiles) {
		await patchFile(messagemappingPath, file.filepath, file.content, file.appendMode);
	}

	const messagemappingBuffer = await folderToZipBuffer(messagemappingPath);

	const requestUrl = await messageMappingDesigntimeArtifactsApi
		.requestBuilder()
		.getByKey(id, "active")
		.url(await getCurrentDestionation());

	const authHeader = (await getOAuthToken()).http_header;

	// Use fetch because SAP API is not compatible with SAP SDK (yep...)
	const mmUpdateResponse = await fetch(requestUrl, {
		headers: {
			[authHeader.key]: authHeader.value,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			Name: id,
			ArtifactContent: messagemappingBuffer.toString("base64"),
		}),
		method: "PUT",
	});

	if (mmUpdateResponse.status !== 200) {
		throw new Error(
			"Error while updating mapping ZIP" +
				mmUpdateResponse.status +
				(await mmUpdateResponse.text())
		);
	}

	return {
		messageMappingUpdate: {
			status: 200,
			text: "successfully updated",
		},
	};
};

export const saveAsNewVersion = async (id: string) => {
	const currentMessageMapping = await messageMappingDesigntimeArtifactsApi
		.requestBuilder()
		.getByKey(id, "active")
		.execute(await getCurrentDestionation());

	const newVersion = semver.inc(currentMessageMapping.version, "patch");

	if (!newVersion) {
		throw new Error("Error increasing semantic version");
	}

	logInfo(
		`Increasing messagemapping ${id} from version ${currentMessageMapping.version} to ${newVersion}`
	);

	await messageMappingDesigntimeArtifactSaveAsVersion({
		id,
		saveAsVersion: newVersion,
	}).execute(await getCurrentDestionation());
};

/**
 * Deploy Mapping
 * @param Mapping ID
 * @returns Deployment Task ID
 */
export const deployMapping = async (id: string): Promise<string> => {
	const deployRes = await deployMessageMappingDesigntimeArtifact({
		id,
		version: "active",
	}).executeRaw(await getCurrentDestionation());

	if (deployRes.status !== 202) {
		throw new Error("Error starting deployment of " + id);
	}

	// Actually SAP API is broken, it returns an empty body instead of the taskId, so waiting for deployment isn't possible
	if (deployRes.data) {
		throw new Error(`The deployment was triggered successfully altough didn't return a token to wait for the deployment to finish
		But you can still use get-deploy-error to check the status`);
	}
	logInfo(`got TaskId ${deployRes.data} for deployment of ${id}`);
	return deployRes.data;
};

export const createMessageMapping = async (
	packageId: string,
	id: string
): Promise<void> => {
	const newMessageMapping = messageMappingDesigntimeArtifactsApi
		.entityBuilder()
		.fromJson({
			id,
			name: id,
			packageId,
		});

	await messageMappingDesigntimeArtifactsApi
		.requestBuilder()
		.create(newMessageMapping)
		.execute(await getCurrentDestionation());
};
