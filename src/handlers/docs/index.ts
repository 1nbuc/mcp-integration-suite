import { z } from "zod";
import { McpServerWithMiddleware } from "../../utils/middleware";
import { projPath } from "../..";
import fsAsync from 'fs/promises';
import fs from 'fs';
import path from "path";
import { glob, globSync } from "glob";

const getDocsMap = () => {
    const baseDocPath = path.join(projPath, "resources", "Docs", "ISuite");
    const allFiles = globSync(path.join(baseDocPath, "**", "*.md").replace(/\\/g, '/'), { nodir: true });

    const resultObj: {[key: string]: string} = {};

    for (const file of allFiles) {
        const displayFile = path.relative(baseDocPath, file);
        resultObj[displayFile] = fs.readFileSync(file).toString("utf-8")
    }

    return resultObj;
}

const docsMap: {[key: string]: string} = getDocsMap();

export const registerDocsHandlers = (server: McpServerWithMiddleware) => {
    server.registerTool("get-docs",
        "Get indexed documentation parts. From the index of the SAP integration Suite documentation jump to any part of the documentation you want",
        {
            docPath: z.string().describe(`
Internal documentation path e.g. 40-RemoteSystems/basic-authentication-of-an-idp-user-for-api-clients-57f104d.md
If not provided it returns the index`).optional()
        }, async ({ docPath }) => {
            docPath = docPath ? docPath : "index.md";
            const fullDocPath = path.join(projPath, "resources", "Docs", "ISuite", docPath);

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
        })

        server.registerTool("search-docs", "Search for docs based on keywords", {
            keywords: z.array(z.string()).describe("Search keywords"),
            matchAll: z.boolean().describe("If true it must match all keywords, if false only one of the provided keywords")
        }, async({ keywords, matchAll }) => {
            const matches: {[key: string]: string} = {};

            Object.entries(docsMap).forEach(docPage => {
                const [ key, value ] = docPage;

                let hasUnmatchedKeyword = false;
                
                for(const keyword of keywords) {
                    if(matchAll && hasUnmatchedKeyword) {
                        continue;
                    } 

                    if (value.includes(keyword)) {
                        matches[key] = value;
                        continue;
                    }

                    if (matchAll && matches[key]) {
                        delete matches[key];
                    }

                    hasUnmatchedKeyword = true;
                }

                hasUnmatchedKeyword = false;
            });

            return {
                content: [{
                    type: "text",
                    text: JSON.stringify(matches)
                }]
            }
        })
}