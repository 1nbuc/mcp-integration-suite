import { DestinationAuthToken } from "@sap-cloud-sdk/connectivity";
import { logError, logInfo } from "..";

interface OAuthConfig {
	clientId: string;
	clientSecret: string;
	tokenUrl: string;
}

interface TokenCacheEntry {
	token: DestinationAuthToken;
	expiresAt: number;
}

const tokenCaches = new Map<string, TokenCacheEntry>();

/**
 * Fetches an OAuth2 client-credentials token with caching.
 * Reusable across different OAuth endpoints (API and CPI).
 */
export const fetchOAuthToken = async (config: OAuthConfig): Promise<DestinationAuthToken> => {
	const cacheKey = config.tokenUrl;
	const now = Date.now();
	const cached = tokenCaches.get(cacheKey);

	if (cached && cached.expiresAt > now + 5 * 60 * 1000) {
		return cached.token;
	}

	if (!config.tokenUrl) {
		throw new Error("OAuth token URL is not configured.");
	}
	if (!config.clientId || !config.clientSecret) {
		throw new Error("OAuth client ID and/or client secret are not configured.");
	}

	const params = new URLSearchParams();
	params.append("grant_type", "client_credentials");
	params.append("client_id", config.clientId);
	params.append("client_secret", config.clientSecret);

	const response = await fetch(config.tokenUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: params,
	});

	logInfo("Fetched OAuth token");

	if (response.status !== 200) {
		throw new Error(
			`Error getting OAuth token: ${response.status} ${response.statusText}`
		);
	}

	try {
		const data = await response.json();
		const token: DestinationAuthToken = {
			value: data.access_token,
			type: data.token_type,
			expiresIn: data.expires_in,
			http_header: {
				key: "Authorization",
				value: `Bearer ${data.access_token}`,
			},
			error: null,
		};

		tokenCaches.set(cacheKey, {
			token,
			expiresAt: now + data.expires_in * 1000,
		});

		return token;
	} catch (error) {
		logError(error instanceof Error ? error.message : String(error));
		throw new Error(
			"Invalid response from OAuth authentication URL. Please consider checking your credentials/endpoints"
		);
	}
};
