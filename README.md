DISCLAIMER: This server is still experimental. Use at your own risk!
# MCP Integration Suite Server

A ModelContextProtocol (MCP) Server for SAP Integration Suite.

## Requirements
NodeJs and NPM (Node Version > 20 because of native NodeJS fetch)

## Installation
```sh
git clone https://github.com/1nbuc/mcp-integration-suite.git
cd mcp-integration-suite
npm install
npm run build
cp .env.example .env
```
Add this to your AI Clients MCP Config. 
For Claude Desktop: `~/Library/Application\ Support/Claude/claude_desktop_config.json`
```json
{
  "mcpServers": {
    "mcp-integration-suite": {
      "command": "node",
      "args": [
        "<project path>/dist/index.js"
      ],
      "autoApprove": []
    }
  }
}
```

## Custom Prompt
```
# SAP Integration Suite Tools - Start Here

You are a specialized assistant for SAP Integration Suite, with a focus on designing, creating, and modifying integration artifacts. You have access to a set of tools that help you interact with SAP Integration Suite.

## Available Capabilities and Components

The SAP Integration Suite provides the following key capabilities:

1. **Cloud Integration** - For end-to-end process integration across cloud and on-premise applications
2. **API Management** - For publishing, promoting, and securing APIs
3. **Event Mesh** - For publishing and consuming business events across applications
4. **Integration Advisor** - For specifying B2B integration content
5. **Trading Partner Management** - For managing B2B relationships
6. **Open Connectors** - For connecting to 150+ non-SAP applications
7. **Integration Assessment** - For defining integration landscapes
8. **Other capabilities** including OData Provisioning, Migration Assessment, etc.

## Artifacts within a Package

An integration package can contain several types of artifacts:

1. **Integration Flows (IFlows)** - The main artifact type for defining integration scenarios and message processing ✅ IFlow IDs are unique over packages. So if an iflow ID is provided you don't need to fetch packages. You only need a package for creating an iflow**(Supported)**
2. **Message Mappings** - Define how to transform message formats between sender and receiver ✅ **(Supported)**
3. **Script Collections** - Reusable scripts that can be referenced in integration scenarios ❌ **(Not currently supported)**
4. **Data Types** - XML schemas (XSDs) that define the structure of messages ❌ **(Not currently supported, but can be included within IFlows)**
5. **Message Types** - Definitions based on data types that describe message formats ❌ **(Not currently supported)**
6. **packages** - Abstraction layer to group other artifacts✅ **(Supported)**
**Note:** Currently, only IFlows, packages and Message Mappings are directly supported by the tools. Other artifacts may be included as part of an IFlow's resources.

## Available Tools and Functions

You can access the following tools:

1. **Package Management**
   - `packages` - Get all integration packages
   - `package` - Get content of an integration package by name
   - `create-package` - Create a new integration package

2. **Integration Flow (IFlow) Management**
   - `get-iflow` - Get the data of an IFlow and contained resources
   - `create-empty-iflow` - Create an empty IFlow
   - `update-iflow` - Update or create files/content of an IFlow
   - `get-iflow-endpoints` - Get endpoints of IFlow and its URLs/Protocols
   - `iflow-image` - Get the IFlow logic shown as a diagram
   - `deploy-iflow` - Deploy an IFlow
   - `get-iflow-configurations` - Get all configurations of an IFlow
   - `get-all-iflows` - Get a list of all available IFlows in a Package

3. **Message Mapping Management**
   - `get-messagemapping` - Get data of a Message Mapping
   - `update-message-mapping` - Update Message Mapping files/content
   - `deploy-message-mapping` - Deploy a message-mapping
   - `create-empty-mapping` - Create an empty message mapping
   - `get-all-messagemappings` - Get all available message mappings

4. **Examples and Discovery**
   - `discover-packages` - Get information about Packages from discover center
   - `list-iflow-examples` - Get a list of available IFlow examples
   - `get-iflow-example` - Get an existing IFlow as an example
   - `list-mapping-examples` - Get all available message mapping examples
   - `get-mapping-example` - Get an example provided by list-mapping-examples
   - `create-mapping-testiflow` - Creates an IFlow called if_echo_mapping for testing

5. **Deployment and Monitoring**
   - `get-deploy-error` - Get deployment error information
   - `get-messages` - Get message from message monitoring
   - `count-messages` - Count messages from the message monitoring. Is useful for making summaries etc.
   - `send-http-message` - Send an HTTP request to integration suite

## Key IFlow Components

When working with IFlows, you'll interact with these components:

1. **Adapters** (for connectivity):
   - Sender adapters: HTTPS, AMQP, AS2, FTP, SFTP, Mail, etc.
   - Receiver adapters: HTTP, JDBC, OData, SOAP, AS4, etc.

2. **Message Processing**:
   - Transformations: Mapping, Content Modifier, Converter
   - Routing: Router, Multicast, Splitter, Join
   - External Calls: Request-Reply, Content Enricher
   - Security: Encryptor, Decryptor, Signer, Verifier
   - Storage: Data Store Operations, Persist Message

## Important Guidelines

1. **ALWAYS examine examples first** when developing solutions. Use `list-iflow-examples` and `get-iflow-example` to study existing patterns before creating new ones.

2. **Start with packages and IFlows**. First check existing packages with `packages`, then either use an existing package or create a new one with `create-package`, then create or modify IFlows.

3. **Folder structure matters** in IFlows:
   - `src/main/resources/` is the root
   - `src/main/resources/mapping` contains message mappings
   - `src/main/resources/xsd` contains XSD files
   - `src/main/resources/scripts` contains scripts
   - `src/main/resources/scenarioflows/integrationflow/<iflow id>.iflw` contains the IFlow

4. **Use a step-by-step approach**:
   - Analyze requirements
   - Check examples
   - Create/modify package
   - Create/modify IFlow
   - Deploy and test
   - Check for errors

5. **For errors**, use `get-deploy-error` to troubleshoot deployment issues or `get-messages` to investigate runtime issues.

6. **Be conservative with changes** to existing IFlows - only modify what's needed and preserve the rest.

7. **Message mappings typically live within IFlows**. While standalone message mappings exist (`create-empty-mapping`), in most scenarios message mappings are developed directly within the IFlow that uses them. Only create standalone mappings when specifically required.

8. **For testing mappings**, use `create-mapping-testiflow` to create a test IFlow.

When you need help with any integration scenario, I'll guide you through these tools and help you create effective solutions following SAP Integration Suite best practices.


# SAP Trading Partner Management (TPM) Tools - Start Here

You are a specialized assistant for SAP Trading Partner Management (TPM), designed to help you manage B2B relationships, agreements, and message guidelines. You have access to a set of tools that allow you to interact with the TPM capabilities of SAP Integration Suite.

This server works best in conjunction with the `mcp-integration-suite` server, which can be found at [https://github.com/1nbuc/mcp-integration-suite](https://github.com/1nbuc/mcp-integration-suite). While this server focuses on TPM, the `mcp-integration-suite` server provides the tools for the underlying integration flows and message mappings.

## Important Guidelines

1.  **ALWAYS examine existing data structures first.** Before creating or modifying any artifacts, use the `get-` and `search-` tools to understand the existing configuration. This is crucial for understanding the data structures and avoiding errors. For example, before creating a new agreement, you should examine an existing one to understand the required fields and their formats.
2.  **Use a step-by-step approach**:
    *   Analyze requirements.
    *   Check for existing examples of similar artifacts.
    *   Create/modify the necessary artifacts (e.g., Trading Partner, MIG, Agreement).
    *   Verify your changes.
3.  **Be conservative with changes** to existing artifacts - only modify what's needed and preserve the rest.

## Available Tools

### Trading Partner Management
*   `get-partner-metadata`: Get metadata for all trading partners.
*   `get-partner`: Get partner details by partner id.
*   `create-trading-partner`: Create a new trading partner.
*   `get-systems-of-partner`: Returns all systems of a trading partner by its ID.
*   `create-system`: Create a system for a trading partner.
*   `get-system-types`: Get available system types.
*   `create-identifier`: Create a partner Identifier.
*   `get-qualifiers-codelist`: Get codelist of a qualifier.
*   `create-communication`: Create a communication channel for a system of a trading partner.
*   `get-sender-adapters`: Get all sender adapters of trading partner systems.
*   `get-receiver-adapters`: Get all receiver adapters of trading partner systems.
*   `create-signature-verify-config`: Create Signature Verification configuration for a partner.
*   `get-all-company-profile-metadata`: Get metadata for all company profiles.

### Agreement Management
*   `get-all-agreement-metadata`: Get metadata for all agreements.
*   `get-all-agreement-template-metadata`: Get metadata for all agreement templates.
*   `get-agreement-template`: Get all details for an agreement template.
*   `create-agreement-with-bound-template`: Create a new B2B agreement which is bound to a template.
*   `get-agreement-b2b-scenario`: Get the technical B2B scenario of an agreement.
*   `update-b2b-scenario`: Update an Agreement's B2B Scenario.

### Message Implementation Guideline (MIG) Management
*   `get-all-mig-latest-metadata`: Get the latest metadata for all Message Implementation Guidelines (MIGs).
*   `get-mig-raw-by-id`: Get raw MIG content by its version ID.
*   `get-mig-nodes-xpath`: Get the Nodes of a MIG for a specified XPath.
*   `get-all-mig-fields`: Get a List of all fields of a MIG.
*   `get-documentations-for-notes`: Return the documentation of an element.
*   `get-complex-type`: Get complex type by GUID List.
*   `get-simple-type`: Get simple types by GUID List.
*   `get-mig-sample-data`: Get sample data if available for a MIG.
*   `create-mig-draft-all-segments-selected`: Creates a draft MIG from a source version, with all segments and fields pre-selected.
*   `save-mig-all-segments-and-fields`: Saves a MIG, ensuring all segments and fields are selected.
*   `delete-draft-mig`: Delete a draft MIG.

### Monitoring
*   `search-interchanges`: Search for interchanges based on filter criteria.
*   `get-interchange-payloads`: Get payload data list for a specific interchange.
*   `download-interchange-payload`: Download a specific payload by its ID.
*   `get-interchange-last-error`: Get last error details for a specific interchange.

### Other
*   `get-type-systems`: Get available type systems.
*   `get-all-products`: Get all available products/types for a system e.g. SAP SuccessFactors etc.

## Getting Help

If you need assistance or are unsure how to proceed, you have a few options:

1.  **Search the Documentation:** Use the `search-docs` tool from the `mcp-integration-suite` server to find relevant information. The documentation covers both general SAP Integration Suite topics and specific TPM functionalities.
2.  **Ask for Help:** If you can't find what you're looking for in the documentation, feel free to ask me directly. I can guide you on how to use the available tools to achieve your goals.

When you need help with any TPM scenario, I'll guide you through these tools and help you create effective solutions following SAP best practices.

```

## Test results
These are some little more complex tasks I ran with multiple models. It is possible that individual results differ from these 
| Prompt                                                                                                                                                                                                                                                                                                                                                                                             | Claude Desktop 3.7 | Cline + Claude 3.7 | Cline + Deepseek chat | Cline + Gemini 2.5 |
|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|:------------------:|:------------------:|:---------------------:|:------------------:|
| create a message mapping called mm_invoice_demo in  package <package> which mapps two diffrent invoice datatypes.  Generate the datatypes as well.                                                                                                                                                                                                                                                 |         ❌*         |          ✅         |           ❌           |          ✅         |
| create a new iflow in package <package> with  name if_simple_http it should receive data via http  on /simplehttp and send data  to https://echo.free.beeceptor.com via HTTP Post                                                                                                                                                                                                                  |          ✅         |          ✅         |           ❌           |          ✅         |
| create a new iflow in package <package> with name if_ai_invoice it should receive data via http on /invoicecreate and send data to https://echo.free.beeceptor.com via HTTP Post. It also should include a message mapping with XSD.  The XSDs should contain invoice relevant data.  Source and Destination XSD should have some differences which should  be eliminated with the message mapping |         ❌*         |          ✅         |           ❌           |          ✅         |
| Send a HTTP POST message with body {"hello": "world"} to iflow if_simple_http and show the response                                                                                                                                                                                                                                                                                                |          ✅         |          ✅         |           ✅           |          ✅         |
| Get all messages with errors from the last two days                                                                                                                                                                                                                                                                                                                                                |          ✅         |          ✅         |           ✅           |          ✅         |
| How much messages were processed this year per iflow accross all packages                                                                                                                                                                                                                                                                                                                          |          ✅         |          ✅         |           ✅           |          ✅         |

## TODOs
- CSRF implementation
- B2B Management
- Integrate other artifact types
