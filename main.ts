import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ethers } from "ethers";
import { ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// Define environment variable name
const PRIVATE_KEY_ENV = "MESON_PRIVATE_KEY";

// Define parameter types
interface PrepareSwapParams {
  fromChain: string;
  toChain: string;
  fromToken: string;
  toToken: string;
  amount: string;
  fromAddress: string;
  recipient?: string; // Optional, defaults to fromAddress
}

interface ExecuteSwapParams {
  encoded: string;
  signingRequest: {
    message: string;
    hash: string;
  };
  fromAddress: string;
  recipient: string;
}

interface CheckSwapParams {
  swapId: string;
}


const toolList = [
  {
    name: "prepareSwap",
    description: "Prepare cross-chain transaction and generate data for signing",
    inputSchema: {
      type: "object",
      properties: {
        fromChain: { type: "string", description: "Source chain ID" },
        toChain: { type: "string", description: "Destination chain ID" },
        fromToken: { type: "string", description: "Source token symbol" },
        toToken: { type: "string", description: "Destination token symbol" },
        amount: { type: "string", description: "Swap amount" },
        fromAddress: { type: "string", description: "Sender address" },
        recipient: { type: "string", description: "Recipient address (optional, defaults to sender)", default: "" },
      },
      required: ["fromChain", "toChain", "fromToken", "toToken", "amount", "fromAddress"],
    },
    // outputSchema: {
    //   type: "object",
    //   properties: {
    //     priceInfo: { type: "object", description: "Price information" },
    //     swapData: { type: "object", description: "Swap data" },
    //     encoded: { type: "string", description: "Encoded transaction data" },
    //     signingRequest: { type: "object", description: "Data to be signed" },
    //     params: { type: "object", description: "Parameters" },
    //   },
    //   required: ["priceInfo", "swapData", "encoded", "signingRequest", "params"],
    // },
  },
  {
    name: "executeSwap",
    description: "Sign and execute cross-chain transaction",
    inputSchema: {
      type: "object",
      properties: {
        encoded: { type: "string", description: "Encoded transaction data" },
        signingRequest: { type: "object", description: "Data to be signed" },
        fromAddress: { type: "string", description: "Sender address" },
        recipient: { type: "string", description: "Recipient address" },
      },
      required: ["encoded", "signingRequest", "fromAddress", "recipient"],
    },
    // outputSchema: {
    //   type: "object",
    //   properties: {
    //     success: { type: "boolean", description: "Whether the operation succeeded" },
    //   },
    // },
  },
  {
    name: "checkSwapStatus",
    description: "Check cross-chain transaction status",
    inputSchema: {
      type: "object",
      properties: {
        swapId: { type: "string", description: "Transaction ID" },
      },
      required: ["swapId"],
    },
    // outputSchema: {
    //   type: "object",
    //   properties: {
    //     swapId: { type: "string", description: "Transaction ID" },
    //     status: { type: "string", description: "Transaction status" },
    //     details: { type: "object", description: "Transaction details" },
    //   },
    //   required: ["swapId", "status", "details"],
    // },
  },
];
// Server configuration
const server = new Server({
  name: "meson-crosschain-mcp",
  version: "1.0.0",
},
  {
    capabilities: {
      tools: {}
    }
  }
);






const prepareSwap = async (params: PrepareSwapParams) => {
  try {
    // If recipient is not provided, use fromAddress
    const recipient = params.recipient || params.fromAddress;

    // Build from and to parameters
    const from = `${params.fromChain}:${params.fromToken}`;
    const to = `${params.toChain}:${params.toToken}`;

    // Get API URL
    const apiUrl = getApiBaseUrl();

    // 1. Get price information
    const priceResponse = await fetch(`${apiUrl}/api/v1/price`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        amount: params.amount,
        fromAddress: params.fromAddress
      }),
    });

    const priceData = await priceResponse.json();

    // 2. Encode swap
    const swapResponse = await fetch(`${apiUrl}/api/v1/swap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        amount: params.amount,
        fromAddress: params.fromAddress,
        recipient
      }),
    });

    const swapData = await swapResponse.json();

    // Return combined results
    return {
      priceInfo: priceData,
      swapData: swapData,
      encoded: swapData.encoded,
      signingRequest: swapData.signingRequest,
      params: {
        from,
        to,
        amount: params.amount,
        fromAddress: params.fromAddress,
        recipient
      }
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { error: `Swap preparation failed: ${errorMessage}` };
  }
}

const executeSwap = async (params: ExecuteSwapParams) => {
  try {
    // Get private key and sign
    const privateKey = Deno.env.get(PRIVATE_KEY_ENV);
    if (!privateKey) {
      return { error: `Environment variable ${PRIVATE_KEY_ENV} not set, cannot sign` };
    }

    const wallet = new ethers.Wallet(privateKey);

    // Verify hash
    if (ethers.keccak256(params.signingRequest.message) !== params.signingRequest.hash) {
      return { error: "Invalid hash value, signing request data may be corrupted" };
    }

    // Sign
    const signature = await wallet.signMessage(ethers.getBytes(params.signingRequest.hash));

    // Submit transaction
    const apiUrl = getApiBaseUrl();
    const response = await fetch(`${apiUrl}/api/v1/swap/${params.encoded}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromAddress: params.fromAddress,
        recipient: params.recipient,
        signature
      }),
    });

    const result = await response.json();

    return {
      success: true,
      swapId: result.swapId,
      signature,
      result
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { error: `Swap execution failed: ${errorMessage}` };
  }
}


const checkSwapStatus = async (params: CheckSwapParams) => {
  try {
    const apiUrl = getApiBaseUrl();
    const response = await fetch(`${apiUrl}/api/v1/swap/${params.swapId}`);
    const result = await response.json();

    return {
      swapId: params.swapId,
      status: result.status,
      details: result
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { error: `Checking swap status failed: ${errorMessage}` };
  }
}


// Helper function: Get API base URL
function getApiBaseUrl(): string {
  const isMainnet = Deno.env.get("MESON_USE_MAINNET") === "true";
  return isMainnet ? "https://relayer.meson.fi" : "https://testnet-relayer.meson.fi";
}

server.setRequestHandler(ListToolsRequestSchema, () => {
  console.log("Handling listTools request");
  return {
    tools: toolList,
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { params } = request;
    const toolName = params.name;
    let handler: any;
    switch (toolName) {
      case "prepareSwap":
        handler = prepareSwap;
        break;
      case "executeSwap":
        handler = executeSwap;
        break;
      case "checkSwapStatus":
        handler = checkSwapStatus;
        break;
      default:
        return {
          content: [
            {
              type: "text",
              text: `Unknown tool name: ${toolName}`
            }
          ]
        }
    }
    const result = await handler(params);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result)
        }
      ]
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Tool execution failed: ${errorMessage}`
        }
      ]
    }
  }
})

// Start server
async function startServer() {
  console.error("Starting Meson Cross-chain MCP Server...");

  // Create stdio transport
  const transport = new StdioServerTransport();

  // Connect to server
  await server.connect(transport);
}

// Start server
startServer().catch((error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error("Server start failed:", errorMessage);
  Deno.exit(1);
});
