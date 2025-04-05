import axios, { AxiosError } from "axios";
import { contentReturnElement } from "./middleware";
import { logError } from "..";

export const formatError = (error: any): contentReturnElement => {
	if (process.env.DEBUG) logError(error);
	const errReturn = extractAxiosError(error);
	logError(errReturn);
	return errReturn;
};

export const extractAxiosError = (error: any): contentReturnElement => {

	if (error === null) {
		return {
			type: "text",
			text: "Received a null error! This should never happen. Consider checking server logs",
		};
	}

	try {
		// SAP SDK can return actual axios error in complex structure
		if (
			axios.isAxiosError(error) ||
			axios.isAxiosError(error?.cause) ||
			axios.isAxiosError(error?.cause?.cause)
		) {
			const axiosError = (() => {
				if (axios.isAxiosError(error)) return error as AxiosError;
				if (axios.isAxiosError(error?.cause))
					return error.cause as AxiosError;
				return error.cause?.cause as AxiosError;
			})();

			const response = axiosError?.response;
			const request = axiosError?.request;

			if (response) {
				//The request was made and the server responded with a status code that falls out of the range of 2xx the http status code mentioned above
				

				let body =
					typeof response.data === "string" ||
					typeof response.data === "object"
						? response.data
						: "undefined or binary";

				if (
					typeof body === "object" &&
					body !== null &&
					"type" in body &&
					body.type === "Buffer"
				) {
					body = "undefined or binary";
				}

				return {
					type: "text",
					text: JSON.stringify({
						type: "response with error",
						statusCode: response.status,
						statusText: response.statusText,
						responseBody: body,
					}),
				};
			} else {
				//The request was made but no response was received, `error.request` is an instance of XMLHttpRequest in the browser and an instance of http.ClientRequest in Node.js
				return {
					type: "text",
					text: JSON.stringify({
						type: "error creating request",
						text: { URI: request.path, method: request.method },
					}),
				};
			}
		}
	} catch (error) {}

	return {
		type: "text",
		text: JSON.stringify({ error: error.toString() }),
	};
};
