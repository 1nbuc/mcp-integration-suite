import fs from "fs";
import path from "path";
import util from "util";
import { projPath } from "..";

const log_file = fs.createWriteStream(path.resolve(projPath, "serverlog.txt"), {
	flags: "a",
	encoding: "utf-8",
	mode: 0o666,
});

const err_log_file = fs.createWriteStream(path.resolve(projPath, "errorlog.txt"), {
	flags: "a",
	encoding: "utf-8",
	mode: 0o666,
});

/**
 * Writes a log entry to the log file
 * @param d - The object or message to be logged
 */
export const writeToLog = (d: any) => {
	log_file.write(util.format(d) + "\n");
};


/**
 * Writes a log entry to the error log file
 * @param d - The object or message to be logged
 */
export const writeToErrLog = (d: any) => {
	err_log_file.write(util.format(d) + "\n");
};
