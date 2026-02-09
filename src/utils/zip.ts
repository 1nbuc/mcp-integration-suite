import { mkdir } from "node:fs/promises";
import { logInfo, projPath } from "..";
import AdmZip from "adm-zip";
import path from "node:path";
import { rimraf } from "rimraf";
import { assertPathWithinBase } from "./fileBasedUtils";

const tempDir = path.join(projPath, "temp");

/**
 * Extracts a ZIP buffer to a specified folder
 * @param zipBuf - The ZIP file as a buffer
 * @param id - The unique identifier for the extraction folder
 * @returns The path to the extracted folder
 */
export const extractToFolder = async (
	zipBuf: Buffer,
	id: string
): Promise<string> => {
	const extractPath = assertPathWithinBase(tempDir, id);
	await rimraf(extractPath);
	await mkdir(extractPath, { recursive: true });

	const zip = new AdmZip(zipBuf);
	zip.extractAllTo(extractPath, true);

	return extractPath;
};

/**
 * Converts a folder to a ZIP buffer
 * @param folderPath - The path to the folder to be zipped
 * @returns A buffer containing the zipped folder
 */
export const folderToZipBuffer = async (folderPath: string): Promise<Buffer> => {
	const zip = new AdmZip();
	logInfo(`Adding ${folderPath} to ZIP archive`);
	zip.addLocalFolder(folderPath);
	return zip.toBufferPromise();
};
