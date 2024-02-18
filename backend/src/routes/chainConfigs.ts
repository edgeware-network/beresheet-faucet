// Chain configurations
const chainConfigs = {
  beresheet: {
    chainName: 'Beresheet: Edgeware Testnet Solochain',
    TOKEN_SYMBOL: 'tEDG',
    RPC_URL: 'wss://beresheet.jelliedowl.net',
    TOKEN_DECIMALS: 18,
    networkPrefix: 7,
    chainColour: '#111111',
    MAX_TOKEN: 10
  },
  westend: {
    chainName: 'Westend Testnet Relaychain',
    TOKEN_SYMBOL: 'WND',
    RPC_URL: 'wss://westend-rpc.polkadot.io',
    TOKEN_DECIMALS: 12,
    networkPrefix: 42,
    chainColour: '#da68a7',
    MAX_TOKEN: 2
  },
  rococo: {
    chainName: 'Rococo Testnet Relaychain',
    TOKEN_SYMBOL: 'ROC',
    RPC_URL: 'wss://rococo-rpc.polkadot.io',
    TOKEN_DECIMALS: 12,
    networkPrefix: 42,
    chainColour: '#6f36dc',
    MAX_TOKEN: 0.01
  },
  rococo_assethub: {
    chainName: 'Rococo Assethub Testnet (Common) Parachain',
    TOKEN_SYMBOL: 'ROC',
    RPC_URL: 'wss://rococo-asset-hub-rpc.polkadot.io',
    TOKEN_DECIMALS: 12,
    networkPrefix: 42,
    chainColour: '#77bb77',
    MAX_TOKEN: 0.01
  },
  nodle: {
    chainName: 'Nodle Testnet Parachain',
    TOKEN_SYMBOL: 'notNODL',
    RPC_URL: 'wss://node-6957502816543653888.lh.onfinality.io/ws?apikey=09b04494-3139-4b57-a5d1-e1c4c18748ce',
    TOKEN_DECIMALS: 11,
    networkPrefix: 37,
    chainColour: '#1ab394',
    MAX_TOKEN: 0.1
  },
};

// Look up the chain configuration
const chainConfig = chainConfigs[chain];

// Use chain specific configurations
const { chainName, TOKEN_SYMBOL, RPC_URL, TOKEN_DECIMALS, networkPrefix, chainColour, MAX_TOKEN } = chainConfig;

export default chainConfigs;
