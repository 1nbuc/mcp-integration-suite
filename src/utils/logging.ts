import fs from "fs";
import path from "path";
import util from "util";
import { projPath } from "..";

const log_file = fs.createWriteStream(path.resolve(projPath, "serverlog.txt"), {
	flags: "a",
	encoding: "utf-8",
	mode: 0o666,
});

/**
 * Writes a log entry to the console
 * @param d - The object or message to be logged
 */
export const writeToLog = (d: any) => {
	log_file.write(util.format(d) + "\n");
};
