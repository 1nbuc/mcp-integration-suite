
import { extractToFolder, folderToZipBuffer } from "../../utils/zip";
import { getCurrentDestination, getOAuthToken } from "../api_destination";
import { updateFiles } from "../../handlers/iflow/tools";

import { z } from "zod";
import semver from "semver";
import {
	Configurations,
	deployIntegrationDesigntimeArtifact,
	integrationContent,
	IntegrationDesigntimeArtifacts,
	integrationDesigntimeArtifactSaveAsVersion,
	ServiceEndpoints,
} from "../../generated/IntegrationContent";
import { logInfo } from "../..";
import { parseFolder, patchFile } from "../../utils/fileBasedUtils";
import { getEndpointUrl } from "../../utils/getEndpointUrl";
const {
	integrationDesigntimeArtifactsApi,
	serviceEndpointsApi,
	configurationsApi,
	integrationPackagesApi,
} = integrationContent();

/**
 * Download IFlow unzipp it and get the folderpath
 * @param id Iflow Id
 * @returns Path to extracted IFlow
 */
export const getIflowFolder = async (id: string): Promise<string> => {
	const iflowBuffer = await integrationDesigntimeArtifactsApi
		.requestBuilder()
		.getByKey(id, "active")
		.appendPath("/$value")
		.addCustomRequestConfiguration({ responseType: "arraybuffer" })
		.executeRaw(await getCurrentDestination());

	const arrBuffer = await iflowBuffer.data;

	const buf = Buffer.from(arrBuffer);
	return extractToFolder(buf, id);
};

/**
 * Create empty Iflow
 * @param packageId Package ID
 * @param id ID/Name of Iflow
 */
export const createIflow = async (
	packageId: string,
	id: string
): Promise<void> => {
	const newIflow = integrationDesigntimeArtifactsApi
		.entityBuilder()
		.fromJson({
			id,
			name: id,
			packageId,
		});

	await integrationDesigntimeArtifactsApi
		.requestBuilder()
		.create(newIflow)
		.execute(await getCurrentDestination());
};

/**
 *
 * @param id iflowId
 * @param iflowFiles Array of project paths and File content
 * @returns Status information of the update/Deploy process
 */
export const updateIflow = async (
	id: string,
	iflowFiles: z.infer<typeof updateFiles>
): Promise<{
	iflowUpdate: { status: number; text: string };
	deployStatus?: string;
}> => {
	const iflowPath = await getIflowFolder(id);

	for (const file of iflowFiles) {
		await patchFile(
			iflowPath,
			file.filepath,
			file.content,
			file.appendMode
		);
	}

	const iflowBuffer = await folderToZipBuffer(iflowPath);

	const newIflowEntity = integrationDesigntimeArtifactsApi
		.entityBuilder()
		.fromJson({
			version: "active",
			id,
			artifactContent: iflowBuffer.toString("base64"),
		});

	await integrationDesigntimeArtifactsApi
		.requestBuilder()
		.update(newIflowEntity)
		.replaceWholeEntityWithPut()
		.execute(await getCurrentDestination());

	return {
		iflowUpdate: {
			status: 200,
			text: "successfully updated",
		},
	};
};

/**
 * Update version number of iflow by 1 patch using semver
 * @param id iflow Id
 */
export const saveAsNewVersion = async (id: string) => {
	const currentIflow = await integrationDesigntimeArtifactsApi
		.requestBuilder()
		.getByKey(id, "active")
		.execute(await getCurrentDestination());

	const newVersion = semver.inc(currentIflow.version, "patch");

	if (!newVersion) {
		throw new Error("Error increasing semantic version");
	}

	logInfo(
		`Increasing iflow ${id} from version ${currentIflow.version} to ${newVersion}`
	);

	await integrationDesigntimeArtifactSaveAsVersion({
		id,
		saveAsVersion: newVersion,
	}).execute(await getCurrentDestination());
};

/**
 * Download Iflow extract it to folder and parse all content into one string
 * @param id iflow Id
 * @returns One string including all Iflow data
 */
export const getIflowContentString = async (id: string): Promise<string> => {
	const folderPath = await getIflowFolder(id);
	return parseFolder(folderPath);
};

/**
 * Get Service Endpoints of iflow
 * @param id Iflow Id
 * @returns serviceEndpoints instances
 */
export const getEndpoints = async (id?: string) => {
	let endpointRequest = serviceEndpointsApi.requestBuilder().getAll();

	if (id) {
		endpointRequest = endpointRequest.filter(
			serviceEndpointsApi.schema.NAME.equals(id)
		);
	}

	logInfo(
		`Requesting Endpoints on ${await endpointRequest.url(await getCurrentDestination())}`
	);
	const endpoints = await endpointRequest.execute(
		await getCurrentDestination()
	);
	const endpointsWithUrl: (ServiceEndpoints & { URL?: string })[] = endpoints;

	endpointsWithUrl.map((endpoint) => {
		endpoint.URL = getEndpointUrl(endpoint);
	});

	return endpoints;
};

/**
 * Deploy Iflow
 * Only works for iflow deployment altough API is called deployArtifact
 * @param id Iflow ID
 * @returns Deployment Task ID
 */
export const deployIflow = async (id: string): Promise<string> => {
	const deployRes = await deployIntegrationDesigntimeArtifact({
		id,
		version: "active",
	}).executeRaw(await getCurrentDestination());

	if (deployRes.status !== 202) {
		throw new Error("Error starting deployment of " + id);
	}

	return deployRes.data;
};

export const getIflowConfiguration = async (
	iflowId: string
): Promise<
	{ ParameterKey: string; ParameterValue?: string; DataType?: string }[]
> => {
	const configurationRes = await integrationDesigntimeArtifactsApi
		.requestBuilder()
		.getByKey(iflowId, "active")
		.appendPath("/Configurations")
		.executeRaw(await getCurrentDestination());

	if (configurationRes.status !== 200 || !configurationRes.data.d.results) {
		throw new Error(
			`Error getting configuration of ${iflowId} status: ${configurationRes.status}, response: ${configurationRes.data}`
		);
	}

	return configurationRes.data.d.results;
};

export const getAllIflowsByPackage = async (
	pkgId: string
): Promise<
	{
		[k in keyof typeof integrationDesigntimeArtifactsApi.schema]:
		| string
		| undefined;
	}[]
> => {
	const allIflowsRes = await integrationPackagesApi
		.requestBuilder()
		.getByKey(pkgId)
		.appendPath("/IntegrationDesigntimeArtifacts")
		.executeRaw(await getCurrentDestination());
	integrationDesigntimeArtifactsApi.schema;
	if (allIflowsRes.status !== 200 || !allIflowsRes?.data?.d?.results) {
		throw new Error(
			`Error getting iflows of ${pkgId} status: ${allIflowsRes.status}, response: ${allIflowsRes.data}`
		);
	}

	return allIflowsRes.data.d.results;
};
