import { DestinationAuthToken } from "@sap-cloud-sdk/connectivity";
import { fetchOAuthToken } from "../utils/oauthClient";

/**
 * Get OAuth token for CPI runtime with caching functionality
 * TODO: add CSRF support
 * @returns OAuth2 Token in SAP SDK compatible format
 */
export const getOAuthTokenCPI = async (): Promise<DestinationAuthToken> => {
	return fetchOAuthToken({
		clientId: process.env.CPI_OAUTH_CLIENT_ID ?? "",
		clientSecret: process.env.CPI_OAUTH_CLIENT_SECRET ?? "",
		tokenUrl: process.env.CPI_OAUTH_TOKEN_URL ?? "",
	});
};
