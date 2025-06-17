import { z } from "zod";
import { McpServerWithMiddleware } from "../../utils/middleware";
import { projPath } from "../..";
import fs from 'fs/promises';
import path from "path";

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

            const docStr = (await fs.readFile(fullDocPath)).toString()
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
}