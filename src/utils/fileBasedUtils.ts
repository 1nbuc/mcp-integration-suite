import { promises as fs } from "fs";
import { glob } from "glob";
import path from "path";
import { logInfo } from "..";
import { appendFile, mkdir, writeFile } from "fs/promises";

/**
 * Validates that a resolved path stays within the expected base directory.
 * Prevents path traversal attacks via sequences like "../".
 */
export const assertPathWithinBase = (basePath: string, relativePath: string): string => {
	const resolved = path.resolve(basePath, relativePath);
	const normalizedBase = path.resolve(basePath);
	if (!resolved.startsWith(normalizedBase + path.sep) && resolved !== normalizedBase) {
		throw new Error(`Path traversal detected: "${relativePath}" escapes base directory`);
	}
	return resolved;
};

/**
 * Get all files of a folder as one concatenated string for AI readability
 * @param folderPath Path to the folder to parse
 * @returns All files of folder as text in a single string in Format <relative Path>\n---begin-of-file---\n<file content>\n---end-of-file---\n\
 */
export const parseFolder = async (folderPath: string): Promise<string> => {
	const allFiles = await glob(path.join(folderPath, "**", "*").replace(/\\/g, '/'), { nodir: true });

	let resultString = "";

	for (const file of allFiles) {
		const relativeName = path.relative(folderPath, file);
		resultString += relativeName + "\n---begin-of-file---\n";
		resultString += await fs.readFile(file, "utf-8");
		resultString += "\n---end-of-file---\n\n";
	}

	logInfo(
		`Done parsing ${folderPath} Total length is  ${resultString.length}`
	);

	return resultString;
};

/**
 * Write or append content to a file within a base directory
 * @param basePath Path of the project
 * @param relativePath Relative path within the project
 * @param content Content that should be written to the file
 * @param append If true, content is appended; if false, content replaces the file
 */
export const patchFile = async (
	basePath: string,
	relativePath: string,
	content: string,
	append: boolean
): Promise<void> => {
	const filePath = assertPathWithinBase(basePath, relativePath);

	await mkdir(path.dirname(filePath), { recursive: true });

	if (append) {
		await appendFile(filePath, content);
		return;
	}

	await writeFile(filePath, content);
};
