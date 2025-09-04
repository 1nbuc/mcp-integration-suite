import { messageFilterSchema, sendRequestSchema } from "./types";
import { getMessages, getMessagesCount } from "../../api/messages/messageLogs";
import { McpServerWithMiddleware } from "../../utils/middleware";
import { formatError } from "../../utils/customErrHandler";
import { sendRequestToCPI } from "../../api/messages/sendMessageToCPI";

export const registerMessageHandlers = (server: McpServerWithMiddleware) => {
	server.registerToolIntegrationSuite(
		"send-http-message",
		`
send an HTTP request to integration suite.
If you need to get HTTP Endpoints please use get-iflow-endpoints
Please only provide HTTP Path without endpoint etc if the URL is https://abc123.itcpi01-rt-cfapps.aa11.hana.ondemand.com/http/myendpoint You should send /http/myendpoint

The URI path will allways be prefixed with protocol

This tool can be used to test mappings together with the endpoint of iflow if_echo_mapping by updating iflow with corresponding mapping
If you get a error response you can use get-messages functionality to find out more about the error
If not specified otherwise the user probably wants to see the text in response

Currently only non CSRF-protected endpoints are supported for POST requests, which could be a reason for 403 or 401
        `,
		sendRequestSchema,
		async ({ path, method, contentType, body, headers }) => {
			try {
				const requestResult = await sendRequestToCPI(
					path,
					method,
					contentType,
					body,
					headers
				);

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(requestResult),
						},
					],
				};
			} catch (error) {
				return {
					isError: true,
					content: [formatError(error)],
				};
			}
		}
	);

	server.registerToolIntegrationSuite(
		"get-messages",
		`
Get message from the message monitoring
This will include information about errors, attachements etc.
It will only get top 50 messages because otherwise the request could get too big
For bigger querys which don't need content of the messages consider using count-messages
		`,
		{
			filterProps: messageFilterSchema,
		},
		async ({ filterProps }) => {
			try {
				const messages = await getMessages(filterProps);
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({ messages }),
						},
					],
				};
			} catch (error) {
				return {
					isError: true,
					content: [formatError(error)],
				};
			}
		}
	);

	server.registerToolIntegrationSuite(
		"count-messages",
		`Count messages from the message monitoring
This function can be usefull for making evaluations by counting messages with specific filters`,
		{
			filterProps: messageFilterSchema,
		},
		async ({ filterProps }) => {
			try {
				const msgCount = await getMessagesCount(filterProps);
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								success: `Found ${msgCount} messages with filter criteria`,
							}),
						},
					],
				};
			} catch (error) {
				return {
					isError: true,
					content: [formatError(error)],
				};
			}
		}
	);
};
