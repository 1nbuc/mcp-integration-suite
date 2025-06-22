import { logInfo } from "../..";
import {
	deployMessageMappingDesigntimeArtifact,
	integrationContent,
	messageMappingDesigntimeArtifactSaveAsVersion,
} from "../../generated/IntegrationContent";
import { updateFiles } from "../../handlers/iflow/tools";
import { parseFolder, patchFile } from "../../utils/fileBasedUtils";
import { extractToFolder, folderToZipBuffer } from "../../utils/zip";
import { getCurrentDestination, getOAuthToken } from "../api_destination";
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
		.executeRaw(await getCurrentDestination());

	const buf = Buffer.from(arrBuffer.data);
	return extractToFolder(buf, id);
};

export const updateMessageMapping = async (
	id: string,
	messagemappingFiles: z.infer<typeof updateFiles>
): Promise<{
	messageMappingUpdate: { status: number; text: string };
	deployStatus?: string;
}> => {
	const messagemappingPath = await getMessageMappingFolder(id);

	for (const file of messagemappingFiles) {
		await patchFile(
			messagemappingPath,
			file.filepath,
			file.content,
			file.appendMode
		);
	}

	const messagemappingBuffer = await folderToZipBuffer(messagemappingPath);

	const url = await messageMappingDesigntimeArtifactsApi
		.requestBuilder()
		.getByKey(id, "active")
		.url(await getCurrentDestination());

	const res = await executeHttpRequest(await getCurrentDestination(), {
		url,
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		data: JSON.stringify({
			Name: id,
			ArtifactContent: messagemappingBuffer.toString("base64"),
		}),
	});

	if (res.status !== 200) {
		throw new Error("Error updating message mapping");
	}

	return {
		messageMappingUpdate: {
			status: res.status,
			text: "Succesfully updated mapping",
		},
	};
};

export const saveAsNewVersion = async (id: string) => {
	const currentMessageMapping = await messageMappingDesigntimeArtifactsApi
		.requestBuilder()
		.getByKey(id, "active")
		.execute(await getCurrentDestination());

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
	}).execute(await getCurrentDestination());
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
	}).executeRaw(await getCurrentDestination());

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
		.execute(await getCurrentDestination());
};

export const getAllMessageMappings = async () =>
	messageMappingDesigntimeArtifactsApi
		.requestBuilder()
		.getAll()
		.execute(await getCurrentDestination());
