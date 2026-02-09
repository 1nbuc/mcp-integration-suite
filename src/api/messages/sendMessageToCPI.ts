import { z } from "zod";
import { logInfo } from "../..";
import { sendRequestSchema } from "../../handlers/messages/types";
import { getOAuthTokenCPI } from "../cpi_auth";

export const sendRequestToCPI = async (
    path: z.infer<typeof sendRequestSchema.path>,
    method: z.infer<typeof sendRequestSchema.method>,
    contentType: z.infer<typeof sendRequestSchema.contentType>,
    body?: z.infer<typeof sendRequestSchema.body>,
    headers?: z.infer<typeof sendRequestSchema.headers>
): Promise<{ status: number; response: string }> => {
    logInfo(`Executing HTTP request to CPI on ${path} METHOD: ${method}`);
    logInfo(body);
    logInfo(headers);

    const authHeader = (await getOAuthTokenCPI()).http_header;

    const reqHeaders = {
        [authHeader.key]: authHeader.value,
        "Content-Type": contentType,
    };

    headers?.forEach((header) => {
        reqHeaders[header.key] = header.value;
    });

    const fullURL = `${process.env["CPI_BASE_URL"]}${path}`;
    logInfo(`Executing request against ${fullURL}`);
    const iflowResponse = await fetch(fullURL, {
        headers: reqHeaders,
        body,
        method,
    });

    return {
        status: iflowResponse.status,
        response: await iflowResponse.text(),
    };
};