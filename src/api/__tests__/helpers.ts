import { integrationContent } from "../../generated/IntegrationContent";
import { getCurrentDestination } from "../api_destination";

export const deletePackage = async (pkgId: string) => {
    const { integrationPackagesApi } = integrationContent();
    await integrationPackagesApi.requestBuilder().delete(pkgId).execute(await getCurrentDestination());
}