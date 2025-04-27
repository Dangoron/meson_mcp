# Meson Cross-Chain Transaction MCP Server

A Meson cross-chain transaction MCP (Model Context Protocol) server implemented with Deno and TypeScript, helping users transfer assets conveniently between different blockchains.

## Features

- Cross-chain asset transfer based on [Meson Protocol](https://meson.fi)
- Conversational cross-chain transaction experience using MCP standard
- Integration of complete cross-chain transaction process: transaction preparation, signature submission, status query
- Support for mainnet and testnet environments
- Private key configuration using environment variables for security
- Based on Deno runtime, no complex dependency configuration required

## Requirements

- [Deno](https://deno.com/) 1.37.0 or higher
- Ethereum compatible private key (for transaction signing)

## Installation and Running

1. Clone the repository

```bash
git clone <repository-url>
cd meson-mcp
```

2. Set environment variables

```bash
# Linux/MacOS
export MESON_PRIVATE_KEY=your_private_key

# Windows
set MESON_PRIVATE_KEY=your_private_key
```

3. Run the MCP server

```bash
deno run --allow-net --allow-env main.ts
```

## Main Functions

The MCP server provides three core tools:

### 1. Prepare Cross-Chain Transaction (prepareSwap)

Prepares a cross-chain transaction and generates data for signing.

**Parameters:**
- `fromChain`: Source chain ID
- `toChain`: Destination chain ID
- `fromToken`: Source token symbol
- `toToken`: Destination token symbol
- `amount`: Swap amount
- `fromAddress`: Sender address
- `recipient`: Recipient address (optional, defaults to sender)

**Returns:**
- Price information
- Encoded transaction data
- Data to be signed

### 2. Sign and Execute Transaction (executeSwap)

Signs the transaction data and submits it to the Meson network.

**Parameters:**
- `encoded`: Encoded transaction data
- `signingRequest`: Data to be signed (containing message and hash)
- `fromAddress`: Sender address
- `recipient`: Recipient address

**Returns:**
- Transaction ID
- Transaction result information

### 3. Query Transaction Status (checkSwapStatus)

Checks the status of a submitted transaction.

**Parameters:**
- `swapId`: Transaction ID

**Returns:**
- Transaction status
- Detailed information

## Usage Example

Here's a complete cross-chain transaction flow example:

1. Set environment (testnet/mainnet)

```
I want to perform a cross-chain transaction on testnet
```

2. Prepare cross-chain transaction

```
Please prepare a transaction from Ethereum Sepolia testnet to transfer 10 USDC to Arbitrum Sepolia, 
my address is 0x1234...abcd
```

3. Sign and execute transaction

```
Please sign and submit the transaction prepared above
```

4. Query transaction status

```
Please check the status of the transaction I just submitted
```

## Important Notes

- Private keys are only stored in environment variables and will not be sent to any external services
- Transaction signing is completed locally, and signed data is submitted through the Meson API
- Mainnet transactions involve real assets, please be sure to verify transaction details
- Testnet is a safe testing environment, new users are recommended to try on testnet first
- Ensure the private key has enough native tokens (ETH, etc.) to pay for transaction fees

## Supported Chains and Tokens

This MCP server supports all blockchains and tokens supported by the Meson protocol, including but not limited to:

- Ethereum and its testnets
- Arbitrum
- Avalanche
- BSC
- Optimism
- Polygon
- Solana
- And many other EVM and non-EVM chains

For specific supported chains and tokens, please refer to the [Meson official documentation](https://meson.fi).

## Technical Details

- Implemented based on [Model Context Protocol](https://github.com/modelcontextprotocol/typescript-sdk)
- Using Deno as the runtime environment
- Cross-chain transactions through Meson API
- Transaction signing using ethers library

## License

MIT 