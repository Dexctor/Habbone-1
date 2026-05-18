import type { ShopItem } from '@/types/shop';

export type PurchaseResult<TOrder> = {
  ok: boolean;
  error?: string;
  order?: TOrder;
  balance?: number;
};

export type PurchaseUserSnapshot = {
  id: number;
  nick?: string | null;
  coins: number;
};

export type CreatePurchaseOrderInput = {
  user_id: number;
  user_nick: string;
  item_id: number;
  item_nome: string;
  item_imagem?: string;
  preco: number;
};

export type PurchaseDeps<TOrder> = {
  getItem: (itemId: number) => Promise<ShopItem | null>;
  getUser: (userId: number) => Promise<PurchaseUserSnapshot | null>;
  setUserCoins: (
    userId: number,
    balance: number,
    options?: { expectedCoins?: number; reason?: 'charge' | 'refund' },
  ) => Promise<boolean>;
  updateItemStock: (
    itemId: number,
    stock: number,
    options?: { expectedStock?: number; reason?: 'purchase' | 'restore' },
  ) => Promise<boolean>;
  createOrder: (input: CreatePurchaseOrderInput) => Promise<TOrder | null>;
  notify: (input: { item: ShopItem; userNick: string }) => Promise<void>;
  logCritical?: (message: string, context?: Record<string, unknown>) => void;
};

function getPurchaseLocks(): Map<number, Promise<void>> {
  const g = globalThis as typeof globalThis & { __shopPurchaseLocks?: Map<number, Promise<void>> };
  if (!g.__shopPurchaseLocks) g.__shopPurchaseLocks = new Map();
  return g.__shopPurchaseLocks;
}

async function withShopItemLock<T>(itemId: number, task: () => Promise<T>): Promise<T> {
  const locks = getPurchaseLocks();
  const previous = locks.get(itemId) ?? Promise.resolve();
  const run = previous.catch(() => undefined).then(task);
  const lock = run.then(() => undefined, () => undefined);
  locks.set(itemId, lock);
  try {
    return await run;
  } finally {
    if (locks.get(itemId) === lock) locks.delete(itemId);
  }
}

export function clearPurchaseLocksForTests() {
  getPurchaseLocks().clear();
}

export async function purchaseItemCore<TOrder>(
  userId: number,
  userNick: string,
  itemId: number,
  deps: PurchaseDeps<TOrder>,
): Promise<PurchaseResult<TOrder>> {
  return withShopItemLock(itemId, () => purchaseItemUnlocked(userId, userNick, itemId, deps));
}

async function purchaseItemUnlocked<TOrder>(
  userId: number,
  userNick: string,
  itemId: number,
  deps: PurchaseDeps<TOrder>,
): Promise<PurchaseResult<TOrder>> {
  const item = await deps.getItem(itemId);
  if (!item) return { ok: false, error: 'Article introuvable' };
  if (item.status !== 'ativo') return { ok: false, error: 'Article indisponible' };
  if (item.estoque <= 0) return { ok: false, error: 'Rupture de stock' };

  const user = await deps.getUser(userId);
  if (!user) return { ok: false, error: 'Utilisateur introuvable' };

  const currentCoins = Number(user.coins) || 0;
  if (currentCoins < item.preco) {
    return { ok: false, error: `Coins insuffisants (${currentCoins}/${item.preco})` };
  }

  const newBalance = currentCoins - item.preco;
  const charged = await deps.setUserCoins(userId, newBalance, { expectedCoins: currentCoins, reason: 'charge' });
  if (!charged) return { ok: false, error: 'Erreur lors du paiement' };

  const updatedStock = await deps.updateItemStock(item.id, item.estoque - 1, {
    expectedStock: item.estoque,
    reason: 'purchase',
  });
  if (!updatedStock) {
    const refunded = await deps.setUserCoins(userId, currentCoins, { expectedCoins: newBalance, reason: 'refund' });
    if (!refunded) {
      deps.logCritical?.('[Shop] Critical: failed to refund after stock update failure', {
        userId,
        itemId,
        balance: currentCoins,
      });
    }
    return { ok: false, error: 'Erreur lors de la mise à jour du stock' };
  }

  const effectiveNick = userNick || user.nick || 'Inconnu';
  const order = await deps.createOrder({
    user_id: userId,
    user_nick: effectiveNick,
    item_id: item.id,
    item_nome: item.nome,
    item_imagem: item.imagem,
    preco: item.preco,
  });

  if (!order) {
    const [refunded, restoredStock] = await Promise.all([
      deps.setUserCoins(userId, currentCoins, { expectedCoins: newBalance, reason: 'refund' }),
      deps.updateItemStock(item.id, item.estoque, { expectedStock: item.estoque - 1, reason: 'restore' }),
    ]);
    if (!refunded || !restoredStock) {
      deps.logCritical?.('[Shop] Critical: failed to compensate after order creation failure', {
        userId,
        itemId,
        refunded,
        restoredStock,
      });
    }
    return { ok: false, error: 'Erreur lors de la commande' };
  }

  try {
    await deps.notify({ item, userNick: effectiveNick });
  } catch (error) {
    deps.logCritical?.('[Shop] Failed to create purchase notification', {
      userId,
      itemId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return { ok: true, order, balance: newBalance };
}
