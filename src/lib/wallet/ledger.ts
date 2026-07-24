import { prisma } from "@/lib/db/prisma";
import { AuthError } from "@/lib/auth/session";
import { getAsset, type WalletAssetId } from "@/lib/wallet/assets";
import { nanoid } from "nanoid";

const MIN_USD = 1;
const MAX_USD = 100_000;

function roundUsd(n: number) {
  return Math.round(n * 100) / 100;
}

/** Demo chain reference for history / Solscan account pairing. */
function makeTxRef(assetId: string) {
  return `${assetId.toLowerCase()}_${nanoid(24)}`;
}

export async function getBalance(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { balanceUsd: true },
  });
  if (!user) throw new AuthError("User not found", 404);
  return roundUsd(user.balanceUsd);
}

export async function creditDeposit(input: {
  userId: string;
  amountUsd: number;
  assetId: WalletAssetId;
  cryptoAmount: number;
}): Promise<{ balanceUsd: number; txId: string; txSignature: string }> {
  const amountUsd = roundUsd(input.amountUsd);
  if (!Number.isFinite(amountUsd) || amountUsd < MIN_USD) {
    throw new AuthError(`Minimum deposit is $${MIN_USD}`, 400);
  }
  if (amountUsd > MAX_USD) {
    throw new AuthError(`Maximum deposit is $${MAX_USD.toLocaleString()}`, 400);
  }

  const asset = getAsset(input.assetId);
  const cryptoAmount = Number(input.cryptoAmount);
  if (!Number.isFinite(cryptoAmount) || cryptoAmount <= 0) {
    throw new AuthError("Invalid crypto amount", 400);
  }

  const txSignature = makeTxRef(asset.id);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: input.userId },
      data: { balanceUsd: { increment: amountUsd } },
      select: { balanceUsd: true },
    });
    const balanceUsd = roundUsd(updated.balanceUsd);
    const record = await tx.walletTransaction.create({
      data: {
        userId: input.userId,
        type: "DEPOSIT",
        status: "COMPLETED",
        amountUsd,
        assetId: asset.id,
        assetSymbol: asset.symbol,
        cryptoAmount,
        address: asset.address,
        txSignature,
        note: `Deposit ${cryptoAmount} ${asset.symbol}`,
        balanceAfterUsd: balanceUsd,
      },
    });
    return { balanceUsd, txId: record.id, txSignature };
  });
}

export async function processWithdraw(input: {
  userId: string;
  amountUsd: number;
  assetId: WalletAssetId;
  destinationAddress: string;
}): Promise<{ balanceUsd: number; txId: string; txSignature: string }> {
  const amountUsd = roundUsd(input.amountUsd);
  if (!Number.isFinite(amountUsd) || amountUsd < MIN_USD) {
    throw new AuthError(`Minimum withdrawal is $${MIN_USD}`, 400);
  }

  const destination = input.destinationAddress.trim();
  if (destination.length < 10 || destination.length > 128) {
    throw new AuthError("Enter a valid wallet address", 400);
  }

  const asset = getAsset(input.assetId);
  const txSignature = makeTxRef(asset.id);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: input.userId },
      select: { balanceUsd: true },
    });
    if (!user) throw new AuthError("User not found", 404);

    const current = roundUsd(user.balanceUsd);
    if (amountUsd > current) {
      throw new AuthError("Insufficient balance", 400);
    }

    const balanceUsd = roundUsd(current - amountUsd);
    await tx.user.update({
      where: { id: input.userId },
      data: { balanceUsd },
    });

    const record = await tx.walletTransaction.create({
      data: {
        userId: input.userId,
        type: "WITHDRAW",
        status: "COMPLETED",
        amountUsd,
        assetId: asset.id,
        assetSymbol: asset.symbol,
        address: destination,
        txSignature,
        note: `Withdraw to ${destination}`,
        balanceAfterUsd: balanceUsd,
      },
    });

    return { balanceUsd, txId: record.id, txSignature };
  });
}
