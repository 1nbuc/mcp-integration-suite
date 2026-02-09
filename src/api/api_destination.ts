import {
	HttpDestinationOrFetchOptions,
	DestinationAuthToken,
	AuthenticationType,
} from "@sap-cloud-sdk/connectivity";
import { fetchOAuthToken } from "../utils/oauthClient";

export const getOAuthToken = async (): Promise<DestinationAuthToken> => {
	return fetchOAuthToken({
		clientId: process.env.API_OAUTH_CLIENT_ID ?? "",
		clientSecret: process.env.API_OAUTH_CLIENT_SECRET ?? "",
		tokenUrl: process.env.API_OAUTH_TOKEN_URL ?? "",
	});
};

const isOAuthPresent = () =>
	!!(process.env.API_OAUTH_CLIENT_ID &&
		process.env.API_OAUTH_CLIENT_SECRET &&
		process.env.API_OAUTH_TOKEN_URL);

const isBasicCredPresent = () =>
	!!(process.env.API_USER && process.env.API_PASS);

/**
 * Get the API Destination based on .env file
 */
export const getCurrentDestination =
	async (): Promise<HttpDestinationOrFetchOptions> => {
		if (!process.env.API_BASE_URL) {
			throw new Error("No API Url provided in project .env file");
		}

		if (!isBasicCredPresent() && !isOAuthPresent()) {
			throw new Error(
				"No Authentication method provided in project .env file"
			);
		}

		if (isOAuthPresent()) return getOAuthConfig();

		return getBasicAuthConfig();
	};

const getOAuthConfig = async (): Promise<HttpDestinationOrFetchOptions> => {
	return {
		authentication: "OAuth2ClientCredentials" as AuthenticationType,
		isTrustingAllCertificates: false,
		url: process.env.API_BASE_URL as string,
		authTokens: [await getOAuthToken()],
	};
};

const getBasicAuthConfig = async (): Promise<HttpDestinationOrFetchOptions> => {
	return {
		authentication: "BasicAuthentication" as AuthenticationType,
		username: process.env.API_USER,
		password: process.env.API_PASS,
		isTrustingAllCertificates: false,
		url: process.env.API_BASE_URL as string,
	};
};
