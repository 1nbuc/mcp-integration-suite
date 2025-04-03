import { integrationContent } from "../../generated/IntegrationContent/service";
import { extractToFolder, folderToZipBuffer } from "../../utils/zip";
import { getCurrentDestionation, getOAuthToken } from "../api_destination";
import { updateFiles } from "../../handlers/iflow/tools";

import { z } from "zod";
import semver from "semver";
import {
	deployIntegrationDesigntimeArtifact,
	integrationDesigntimeArtifactSaveAsVersion,
	ServiceEndpoints,
} from "../../generated/IntegrationContent";
import { logInfo } from "../..";
import { parseFolder, patchFile } from "../../utils/fileBasedUtils";
import { getEndpointUrl } from "../../utils/getEndpointUrl";
const { integrationDesigntimeArtifactsApi, serviceEndpointsApi } =
	integrationContent();

/**
 * Download IFlow unzipp it and get the folderpath
 * @param id Iflow Id
 * @returns Path to extracted IFlow
 */
export const getIflowFolder = async (id: string): Promise<string> => {
	const iflowUrl = await integrationDesigntimeArtifactsApi
		.requestBuilder()
		.getByKey(id, "active")
		.appendPath("/$value")
		.url(await getCurrentDestionation());

	const authHeader = (await getOAuthToken()).http_header;

	// Use fetch instead of built in axios because it is trash
	const iflowResponse = await fetch(iflowUrl, {
		headers: { [authHeader.key]: authHeader.value },
	});

	if (iflowResponse.status !== 200) {
		throw new Error("Error while downloading iflow ZIP");
	}
	const arrBuffer = await iflowResponse.arrayBuffer();

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
		.execute(await getCurrentDestionation());
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
): Promise<{ iflowUpdate: { status: number; text: string }, deployStatus?: string }> => {
	const iflowPath = await getIflowFolder(id);

	for (const file of iflowFiles) {
		await patchFile(iflowPath, file.filepath, file.content);
	}

	const iflowBuffer = await folderToZipBuffer(iflowPath);

	const currentIflow = await integrationDesigntimeArtifactsApi
		.requestBuilder()
		.getByKey(id, "active")
		.execute(await getCurrentDestionation());

	currentIflow.version = "active";

	const requestURI = await integrationDesigntimeArtifactsApi
		.requestBuilder()
		.update(currentIflow)
		.url(await getCurrentDestionation());

	logInfo(`Request URI: ${requestURI}`);

	const newIflowObj = {
		Name: id,
		ArtifactContent: iflowBuffer.toString("base64"),
	};

	const reqBody = JSON.stringify(newIflowObj);
	logInfo(reqBody);

	const authHeader = (await getOAuthToken()).http_header;

	// Use fetch instead of built in axios because it is trash
	const iflowResponse = await fetch(requestURI, {
		headers: {
			[authHeader.key]: authHeader.value,
			"Content-Type": "application/json",
		},
		body: reqBody,
		method: "PUT",
	});

	const respText = await iflowResponse.text();

	return {
		iflowUpdate: {
			status: iflowResponse.status,
			text: respText,
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
		.execute(await getCurrentDestionation());

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
	}).execute(await getCurrentDestionation());
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
		`Requesting Endpoints on ${await endpointRequest.url(await getCurrentDestionation())}`
	);
	const endpoints = await endpointRequest.execute(
		await getCurrentDestionation()
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
	}).executeRaw(await getCurrentDestionation());

	if (deployRes.status !== 202) {
		throw new Error("Error starting deployment of " + id);
	}

	return deployRes.data;
};