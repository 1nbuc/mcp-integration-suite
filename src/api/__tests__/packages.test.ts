import { createPackage, getPackage, getPackages } from "../packages/index";
// Import the type for package entities
// Correct the relative path from src/api/__tests__/ to src/generated/
import { integrationContent, IntegrationPackages } from "../../generated/IntegrationContent/index";
import dotenv from 'dotenv';
import { getCurrentDestination } from "../api_destination";
import { deletePackage } from "./helpers";

// Load environment variables from .env file
dotenv.config();

describe("Package Management API", () => {
    // Increase timeout for network requests
    jest.setTimeout(60000); // 60 seconds for potentially multiple API calls

    const testPackageId = `jesttestpkg`; // Use timestamp for uniqueness, no underscores
    let packageCreated = false;

    // Check prerequisites before running tests
    beforeAll(() => {
        if (!process.env.API_BASE_URL || (!process.env.API_USER && !process.env.API_OAUTH_CLIENT_ID)) {
            throw new Error("Missing required environment variables for API connection (URL and Auth). Skipping Package tests.");
        }
    });

    // Attempt to create a package before tests run
    // Note: No cleanup function is available via the API/tools provided. Manual cleanup might be needed.
    beforeAll(async () => {
        try {
            console.log(`Attempting to create test package: ${testPackageId}`);
            await createPackage(testPackageId, `Jest Test Package`, `Temporary package for Jest tests`);
            packageCreated = true;
            console.log(`Test package ${testPackageId} created successfully.`);
        } catch (error) {
            console.error(`Failed to create test package ${testPackageId}. Some tests might fail or be skipped. Error:`, error);
            // Decide if tests should proceed without the package
            // For now, we'll let them run and potentially fail if they depend on the created package.
        }
    });



    it("should create a new package", async () => {
        // This test implicitly relies on the beforeAll hook.
        // If beforeAll failed, this test might not accurately reflect createPackage functionality.
        // A more robust test would create *another* unique package here.
        // For simplicity, we rely on the beforeAll hook's success flag.
        expect(packageCreated).toBe(true); // Check if the setup hook succeeded
    });

    it("should retrieve a list of all packages", async () => {
        try {
            const packages = await getPackages();
            expect(packages).toBeDefined();
            expect(Array.isArray(packages)).toBe(true);
            // Check if the newly created package is in the list (if creation was successful)
            if (packageCreated) {
                // Add type annotation to pkg parameter
                const found = packages.some((pkg: IntegrationPackages) => pkg.id === testPackageId);
                expect(found).toBe(true);
            }
        } catch (error) {
            console.error("Error during getPackages test:", error);
            throw error;
        }
    });

    it("should retrieve a specific package by ID", async () => {
        if (!packageCreated) {
            console.warn(`Skipping getPackage test: Test package ${testPackageId} was not created.`);
            return;
        }
        try {
            const pkg = await getPackage(testPackageId);
            expect(pkg).toBeDefined();
            expect(pkg.id).toEqual(testPackageId);
            expect(pkg.name).toEqual(`Jest Test Package`);
            // Add more assertions based on expected package structure if needed
        } catch (error) {
            console.error(`Error during getPackage test for ID ${testPackageId}:`, error);
            throw error;
        }
    });

    afterAll(async () => {
        await deletePackage(testPackageId);
    });
});
