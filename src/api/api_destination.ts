import {
	HttpDestinationOrFetchOptions,
	retrieveJwt,
	DestinationAuthToken,
	AuthenticationType,
} from "@sap-cloud-sdk/connectivity";
import { logError, logInfo } from "..";

// Token cache
let tokenCache: {
	token: DestinationAuthToken;
	expiresAt: number;
} | null = null;

export const getOAuthToken = async (): Promise<DestinationAuthToken> => {
	// Check if token is expired
	const now = Date.now();
	if (tokenCache && tokenCache.expiresAt > now + 5 * 60 * 1000) {
		return tokenCache.token;
	}
	// Add check for token URL existence
	if (!process.env.API_OAUTH_TOKEN_URL) {
		throw new Error("API_OAUTH_TOKEN_URL environment variable is not set.");
	}
	const params = new URLSearchParams();
	params.append("grant_type", "client_credentials");
	params.append("client_id", process.env.API_OAUTH_CLIENT_ID as string);
	params.append(
		"client_secret",
		process.env.API_OAUTH_CLIENT_SECRET as string
	);

	const response = await fetch(process.env.API_OAUTH_TOKEN_URL as string, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: params,
	});

	logInfo("Fetched token");
	logInfo(response.status);

	if (response.status !== 200) {
		throw new Error(
			`Error getting OAuth token: ${response.status} ${response.statusText}`
		);
	}

	try {
		const data = await response.json();
		const token = {
			value: data.access_token,
			type: data.token_type,
			expiresIn: data.expires_in,
			http_header: {
				key: "Authorization",
				value: `Bearer ${data.access_token}`,
			},
			error: null,
		};

		tokenCache = {
			token,
			expiresAt: now + data.expires_in * 1000,
		};

		return token;
	} catch (error) {
		logError(JSON.stringify(error));
		throw new Error(
			"Invalid response from OAuth authentication URL. Please consider checking your credentials/endpoints"
		);
	}
};

const isOAuthPresent = () =>
	process.env.API_OAUTH_CLIENT_ID &&
		process.env.API_OAUTH_CLIENT_SECRET &&
		process.env.API_OAUTH_TOKEN_URL
		? true
		: false;

const isBasicCredPresent = () => process.env.API_USER && process.env.API_PASS ? true : false;

/**
 * Get the API Destination based on .env file
 * @returns
 */
export const getCurrentDestination =
	async (): Promise<HttpDestinationOrFetchOptions> => {
		if (!process.env.API_BASE_URL) {
			throw new Error("No API Url provided in project .env file");
		}

		// check if either API basic credentials or oauth client-credentials is present in full
		if (!isBasicCredPresent() && !isOAuthPresent()) {
			throw new Error(
				"No Authentication method provided in project .env file"
			);
		}

		if (isOAuthPresent()) return getOAuthConfig();

		if (isBasicCredPresent()) return getBasicAuthConfig();

		throw new Error("Error setting up Authentication. Please check .env");

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
	}
}
