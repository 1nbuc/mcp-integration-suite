import { config } from "dotenv";
import { getOAuthToken, getCurrentDestination } from "../api_destination";
import path from "path";
import { projPath } from "../..";


describe("API Destination Handling", () => {
    // Increase timeout for network requests
    jest.setTimeout(30000); // 30 seconds

    // --- Tests for getOAuthToken (Management API) ---
    describe("getOAuthToken (Management API)", () => {
        it("should retrieve a valid OAuth token for Management API if OAuth env vars are set", async () => {
            // Check if necessary environment variables are set
            if (!process.env.API_OAUTH_CLIENT_ID || !process.env.API_OAUTH_CLIENT_SECRET || !process.env.API_OAUTH_TOKEN_URL) {
                console.warn("Skipping Management API OAuth test: Required environment variables (API_OAUTH_CLIENT_ID, API_OAUTH_CLIENT_SECRET, API_OAUTH_TOKEN_URL) are not set.");
                return; // Skip test if env vars are missing
            }

            try {
                const token = await getOAuthToken();

                // Basic structure validation
                expect(token).toBeDefined();
                expect(token.value).toBeDefined();
                expect(typeof token.value).toBe("string");
                expect(token.value.length).toBeGreaterThan(0);
                expect(token.type).toBeDefined();
                expect(typeof token.type).toBe("string");
                expect(token.expiresIn).toBeDefined();
                expect(typeof token.expiresIn).toBe("number");
                expect(token.http_header).toBeDefined();
                expect(token.http_header.key).toEqual("Authorization");
                expect(token.http_header.value).toContain("Bearer ");
                expect(token.error).toBeNull();

                // Test caching
                const cachedToken = await getOAuthToken();
                expect(cachedToken).toBeDefined();
                expect(cachedToken.value).toEqual(token.value);

            } catch (error) {
                console.error("Error during getOAuthToken (Management API) test:", error);
                throw error;
            }
        });

        it("should throw an error if OAuth env vars are missing and it's called directly (though getCurrentDestination handles this)", async () => {
            // Only run this if OAuth vars are NOT set but Basic Auth vars MIGHT be set (or neither)
            if (process.env.API_OAUTH_CLIENT_ID || process.env.API_OAUTH_CLIENT_SECRET || process.env.API_OAUTH_TOKEN_URL) {
                console.warn("Skipping direct getOAuthToken error test: OAuth variables seem to be present.");
                return;
            }
            // We expect this to fail if called directly without the necessary env vars
            // Update expected error message based on the check added in getOAuthToken
            await expect(getOAuthToken()).rejects.toThrow("API_OAUTH_TOKEN_URL environment variable is not set."); // Use exact string
        });
    });

    // --- Tests for getCurrentDestination ---
    describe("getCurrentDestination", () => {
        it("should throw an error if API_BASE_URL is missing", async () => {
            const originalBaseUrl = process.env.API_BASE_URL;
            delete process.env.API_BASE_URL; // Temporarily remove the variable

            await expect(getCurrentDestination()).rejects.toThrow("No API Url provided in project .env file");

            process.env.API_BASE_URL = originalBaseUrl; // Restore the variable
        });

        it("should throw an error if no complete authentication method (OAuth or Basic) is provided", async () => {
            // Temporarily store and remove auth variables
            const originalOAuthClientId = process.env.API_OAUTH_CLIENT_ID;
            const originalOAuthClientSecret = process.env.API_OAUTH_CLIENT_SECRET;
            const originalOAuthTokenUrl = process.env.API_OAUTH_TOKEN_URL;
            const originalUser = process.env.API_USER;
            const originalPass = process.env.API_PASS;

            delete process.env.API_OAUTH_CLIENT_ID;
            delete process.env.API_OAUTH_CLIENT_SECRET;
            // Keep one OAuth var potentially set to ensure partial config doesn't pass
            // delete process.env.API_OAUTH_TOKEN_URL;
            delete process.env.API_USER;
            delete process.env.API_PASS;

            await expect(getCurrentDestination()).rejects.toThrow("No Authentication method provided in project .env file");

            // Restore variables
            config({ path: path.join(projPath, '.env') });
        });


        // Temporarily skip this test due to persistent environment variable/fetch issues within Jest
        it("should return OAuth destination if OAuth env vars are set", async () => {
            // Add specific check for API_OAUTH_TOKEN_URL as well, as getOAuthToken now requires it
            if (!process.env.API_BASE_URL || !process.env.API_OAUTH_CLIENT_ID || !process.env.API_OAUTH_CLIENT_SECRET || !process.env.API_OAUTH_TOKEN_URL) {
                console.warn("Skipping getCurrentDestination (OAuth) test: Required environment variables (API_BASE_URL, API_OAUTH_CLIENT_ID, API_OAUTH_CLIENT_SECRET, API_OAUTH_TOKEN_URL) are not set.");
                return;
            }

            try {
                const destination = await getCurrentDestination();
                expect(destination).toBeDefined();
                // Use string literal for AuthenticationType comparison
                expect(destination.authentication).toEqual("OAuth2ClientCredentials");
                expect(destination.url).toEqual(process.env.API_BASE_URL);
                // Add a check to ensure authTokens is defined before accessing its properties
                expect(destination.authTokens).toBeDefined();
                // Use non-null assertion (!) after the check or refine the check
                expect(Array.isArray(destination.authTokens!)).toBe(true);
                expect(destination.authTokens!.length).toBeGreaterThan(0);
                expect(destination.authTokens![0].value).toBeDefined();
                expect(destination.authTokens![0].type).toBeDefined();
                expect(destination.authTokens![0].expiresIn).toBeDefined();
                expect(destination.authTokens![0].http_header).toBeDefined();
            } catch (error) {
                console.error("Error during getCurrentDestination (OAuth) test:", error);
                throw error;
            }
        });

        it("should return Basic Auth destination if Basic Auth env vars are set (and OAuth is not)", async () => {

            if (!process.env.API_BASE_URL || !process.env.API_USER || !process.env.API_PASS) {
                console.warn("Skipping getCurrentDestination (Basic) test: Required environment variables (API_BASE_URL, API_USER, API_PASS) are not set.");
                return;
            }

            try {
                const destination = await getCurrentDestination();
                expect(destination).toBeDefined();
                // Use string literal for AuthenticationType comparison
                expect(destination.authentication).toEqual("BasicAuthentication");
                expect(destination.url).toEqual(process.env.API_BASE_URL);
                expect(destination.username).toEqual(process.env.API_USER);
                expect(destination.password).toEqual(process.env.API_PASS);
            } catch (error) {
                console.error("Error during getCurrentDestination (Basic) test:", error);
                throw error;
            }
        });
    });
});
