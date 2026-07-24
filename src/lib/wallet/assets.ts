export type WalletAssetId = "SOL" | "USDT" | "USDC" | "ETH" | "LTC" | "BTC";

export interface WalletAsset {
  id: WalletAssetId;
  name: string;
  symbol: string;
  address: string;
  network: string;
  coingeckoId: string;
  /** Accent used in UI chips */
  color: string;
  warning: string;
}

export const WALLET_ASSETS: WalletAsset[] = [
  {
    id: "SOL",
    name: "Solana",
    symbol: "SOL",
    address: "2EJJSZFqgHpxKLADZWsJVmbs2uLdtaHBYGn2hY2AoRtT",
    network: "Solana Network",
    coingeckoId: "solana",
    color: "#9945FF",
    warning: "Please only send SOL on the Solana network to this address.",
  },
  {
    id: "USDT",
    name: "Tether",
    symbol: "USDT",
    address: "0xeDe0540c31620409e3b05164d1132BBB89A18131",
    network: "ERC-20 Network",
    coingeckoId: "tether",
    color: "#26A17B",
    warning: "Please only send USDT (ERC-20) to this address.",
  },
  {
    id: "USDC",
    name: "USD Coin",
    symbol: "USDC",
    address: "0xeDe0540c31620409e3b05164d1132BBB89A18131",
    network: "ERC-20 Network",
    coingeckoId: "usd-coin",
    color: "#2775CA",
    warning: "Please only send USDC (ERC-20) to this address.",
  },
  {
    id: "ETH",
    name: "Ethereum",
    symbol: "ETH",
    address: "0xeDe0540c31620409e3b05164d1132BBB89A18131",
    network: "Ethereum Network",
    coingeckoId: "ethereum",
    color: "#627EEA",
    warning: "Please only send ETH on the Ethereum network to this address.",
  },
  {
    id: "LTC",
    name: "Litecoin",
    symbol: "LTC",
    address: "LUrHPds3v6Ykx1u7roQg8rYSBA5icDQ8nf",
    network: "Litecoin Network",
    coingeckoId: "litecoin",
    color: "#345D9D",
    warning: "Please only send LTC on the Litecoin network to this address.",
  },
  {
    id: "BTC",
    name: "Bitcoin",
    symbol: "BTC",
    address: "bc1q5csk56n8zclrqyf2pqr25actwmdflelg9x3cyf",
    network: "Bitcoin Network",
    coingeckoId: "bitcoin",
    color: "#F7931A",
    warning: "Please only send BTC on the Bitcoin network to this address.",
  },
];

export function getAsset(id: WalletAssetId) {
  return WALLET_ASSETS.find((a) => a.id === id) ?? WALLET_ASSETS[0];
}

export function qrCodeUrl(address: string, size = 240) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(address)}`;
}

export function shortenAddress(address: string, left = 10, right = 8) {
  if (address.length <= left + right + 3) return address;
  return `${address.slice(0, left)}…${address.slice(-right)}`;
}

/** Block explorer links for wallet history. */
export function explorerAccountUrl(assetId: string | null | undefined, address: string | null | undefined) {
  if (!address) return null;
  const id = (assetId ?? "").toUpperCase();
  if (id === "SOL") return `https://solscan.io/account/${address}`;
  if (id === "BTC") return `https://mempool.space/address/${address}`;
  if (id === "LTC") return `https://litecoinspace.org/address/${address}`;
  // ETH / USDT / USDC (ERC-20)
  if (id === "ETH" || id === "USDT" || id === "USDC") {
    return `https://etherscan.io/address/${address}`;
  }
  return null;
}

export function explorerTxUrl(assetId: string | null | undefined, signature: string | null | undefined) {
  if (!signature) return null;
  const id = (assetId ?? "").toUpperCase();
  if (id === "SOL") return `https://solscan.io/tx/${signature}`;
  if (id === "BTC") return `https://mempool.space/tx/${signature}`;
  if (id === "LTC") return `https://litecoinspace.org/tx/${signature}`;
  if (id === "ETH" || id === "USDT" || id === "USDC") {
    return `https://etherscan.io/tx/${signature}`;
  }
  return null;
}

export function isSolanaAsset(assetId: string | null | undefined) {
  return (assetId ?? "").toUpperCase() === "SOL";
}
