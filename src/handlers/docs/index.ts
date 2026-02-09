import { z } from "zod";
import { McpServerWithMiddleware } from "../../utils/middleware";
import { logError, projPath } from "../..";
import fsAsync from 'fs/promises';
import fs from 'fs';
import path from "path";
import { globSync } from "glob";
import { formatError } from "../../utils/customErrHandler";
import { assertPathWithinBase } from "../../utils/fileBasedUtils";

const baseDocPath = path.join(projPath, "resources", "Docs", "ISuite");

const getDocsMap = () => {
    const allFiles = globSync(path.join(baseDocPath, "**", "*.md").replace(/\\/g, '/'), { nodir: true });

    const resultObj: { [key: string]: string } = {};

    for (const file of allFiles) {
        const displayFile = path.relative(baseDocPath, file);
        resultObj[displayFile] = fs.readFileSync(file).toString("utf-8")
    }

    return resultObj;
}

const docsMap: { [key: string]: string } = getDocsMap();

export const registerDocsHandlers = (server: McpServerWithMiddleware) => {
    server.registerToolIntegrationSuite("get-docs",
        "Get indexed documentation parts. From the index of the SAP Integration Suite documentation jump to any part of the documentation you want",
        {
            docPath: z.string().describe(`
Internal documentation path e.g. 40-RemoteSystems/basic-authentication-of-an-idp-user-for-api-clients-57f104d.md
If not provided it returns the index`).optional()
        }, async ({ docPath }) => {
            try {
                docPath = docPath ? docPath : "index.md";
                const fullDocPath = assertPathWithinBase(baseDocPath, docPath);

                const docStr = (await fsAsync.readFile(fullDocPath)).toString()
                const formattedString = JSON.stringify({
                    docPath,
                    text: docStr
                })

                return {
                    content: [{
                        type: "text",
                        text: formattedString
                    }]
                }
            } catch (error) {
                logError(error);
                return {
                    isError: true,
                    content: [formatError(error)],
                };
            }
        })

    server.registerToolIntegrationSuite("search-docs", "Search for docs based on keywords (case-sensitive)", {
        keywords: z.array(z.string()).describe("Search keywords"),
        matchAll: z.boolean().describe("If true it must match all keywords, if false only one of the provided keywords")
    }, async ({ keywords, matchAll }) => {
        try {
            const matches: { [key: string]: string } = {};

            Object.entries(docsMap).forEach(([key, value]) => {
                if (matchAll) {
                    const allMatch = keywords.every((keyword: string) => value.includes(keyword));
                    if (allMatch) {
                        matches[key] = value;
                    }
                } else {
                    const anyMatch = keywords.some((keyword: string) => value.includes(keyword));
                    if (anyMatch) {
                        matches[key] = value;
                    }
                }
            });

            const result = JSON.stringify(matches);

            if (result.length > 1000000) {
                throw new Error(`Your search returned documents with a total length of ${result.length}. Please use different search parameters. Total length must be < 1000000`)
            }

            return {
                content: [{
                    type: "text",
                    text: result
                }]
            }
        } catch (error) {
            logError(error);
            return {
                isError: true,
                content: [formatError(error)],
            };
        }
    })
}
