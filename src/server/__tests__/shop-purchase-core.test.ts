import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  clearPurchaseLocksForTests,
  purchaseItemCore,
  type CreatePurchaseOrderInput,
  type PurchaseDeps,
  type PurchaseUserSnapshot,
} from '../directus/shop-purchase-core';
import type { ShopItem } from '@/types/shop';

type TestOrder = { id: number; itemId: number; userId: number };

function baseItem(overrides: Partial<ShopItem> = {}): ShopItem {
  return {
    id: 1,
    nome: 'Sofa HC',
    imagem: '/img/box.png',
    preco: 20,
    estoque: 2,
    status: 'ativo',
    ...overrides,
  };
}

function createHarness(options?: {
  item?: ShopItem | null;
  user?: PurchaseUserSnapshot | null;
  failCharge?: boolean;
  failStockUpdate?: boolean;
  failOrder?: boolean;
  failNotify?: boolean;
}) {
  let item = options?.item === undefined ? baseItem() : options.item;
  let user = options?.user === undefined ? { id: 7, nick: 'Decrypt', coins: 100 } : options.user;
  const orders: TestOrder[] = [];
  const coinWrites: number[] = [];
  const stockWrites: number[] = [];
  const coinWriteOptions: Array<{ expectedCoins?: number; reason?: 'charge' | 'refund' } | undefined> = [];
  const stockWriteOptions: Array<{ expectedStock?: number; reason?: 'purchase' | 'restore' } | undefined> = [];
  const criticalLogs: Array<{ message: string; context?: Record<string, unknown> }> = [];

  const deps: PurchaseDeps<TestOrder> = {
    async getItem() {
      return item ? { ...item } : null;
    },
    async getUser() {
      return user ? { ...user } : null;
    },
    async setUserCoins(_userId, balance, writeOptions) {
      coinWrites.push(balance);
      coinWriteOptions.push(writeOptions);
      if (options?.failCharge && coinWrites.length === 1) return false;
      if (user) user = { ...user, coins: balance };
      return true;
    },
    async updateItemStock(_itemId, stock, writeOptions) {
      stockWrites.push(stock);
      stockWriteOptions.push(writeOptions);
      if (options?.failStockUpdate && stockWrites.length === 1) return false;
      if (item) item = { ...item, estoque: stock };
      return true;
    },
    async createOrder(input: CreatePurchaseOrderInput) {
      if (options?.failOrder) return null;
      const order = { id: orders.length + 1, itemId: input.item_id, userId: input.user_id };
      orders.push(order);
      return order;
    },
    async notify() {
      if (options?.failNotify) throw new Error('notification down');
    },
    logCritical(message, context) {
      criticalLogs.push({ message, context });
    },
  };

  return {
    deps,
    get item() { return item; },
    get user() { return user; },
    orders,
    coinWrites,
    stockWrites,
    coinWriteOptions,
    stockWriteOptions,
    criticalLogs,
  };
}

describe('purchaseItemCore', () => {
  beforeEach(() => {
    clearPurchaseLocksForTests();
  });

  it('creates an order, decrements stock, debits coins and returns the server balance', async () => {
    const h = createHarness();

    const result = await purchaseItemCore(7, 'Decrypt', 1, h.deps);

    assert.equal(result.ok, true);
    assert.equal(result.balance, 80);
    assert.equal(h.user?.coins, 80);
    assert.equal(h.item?.estoque, 1);
    assert.equal(h.orders.length, 1);
    assert.deepEqual(h.coinWriteOptions, [{ expectedCoins: 100, reason: 'charge' }]);
    assert.deepEqual(h.stockWriteOptions, [{ expectedStock: 2, reason: 'purchase' }]);
  });

  it('does not mutate anything when the user cannot afford the item', async () => {
    const h = createHarness({ user: { id: 7, nick: 'Decrypt', coins: 10 } });

    const result = await purchaseItemCore(7, 'Decrypt', 1, h.deps);

    assert.equal(result.ok, false);
    assert.match(result.error || '', /Coins insuffisants/);
    assert.equal(h.user?.coins, 10);
    assert.equal(h.item?.estoque, 2);
    assert.equal(h.orders.length, 0);
    assert.deepEqual(h.coinWrites, []);
    assert.deepEqual(h.stockWrites, []);
  });

  it('refunds coins when stock update fails after payment', async () => {
    const h = createHarness({ failStockUpdate: true });

    const result = await purchaseItemCore(7, 'Decrypt', 1, h.deps);

    assert.equal(result.ok, false);
    assert.equal(result.error, 'Erreur lors de la mise à jour du stock');
    assert.equal(h.user?.coins, 100);
    assert.equal(h.item?.estoque, 2);
    assert.deepEqual(h.coinWrites, [80, 100]);
    assert.deepEqual(h.coinWriteOptions, [
      { expectedCoins: 100, reason: 'charge' },
      { expectedCoins: 80, reason: 'refund' },
    ]);
    assert.equal(h.orders.length, 0);
  });

  it('refunds coins and restores stock when order creation fails', async () => {
    const h = createHarness({ failOrder: true });

    const result = await purchaseItemCore(7, 'Decrypt', 1, h.deps);

    assert.equal(result.ok, false);
    assert.equal(result.error, 'Erreur lors de la commande');
    assert.equal(h.user?.coins, 100);
    assert.equal(h.item?.estoque, 2);
    assert.deepEqual(h.coinWrites, [80, 100]);
    assert.deepEqual(h.stockWrites, [1, 2]);
    assert.deepEqual(h.stockWriteOptions, [
      { expectedStock: 2, reason: 'purchase' },
      { expectedStock: 1, reason: 'restore' },
    ]);
    assert.equal(h.orders.length, 0);
  });

  it('serializes concurrent purchases for the same item so stock 1 only sells once', async () => {
    const h = createHarness({ item: baseItem({ estoque: 1 }) });

    const [first, second] = await Promise.all([
      purchaseItemCore(7, 'Decrypt', 1, h.deps),
      purchaseItemCore(7, 'Decrypt', 1, h.deps),
    ]);

    const results = [first, second];
    assert.equal(results.filter((r) => r.ok).length, 1);
    assert.equal(results.filter((r) => !r.ok && r.error === 'Rupture de stock').length, 1);
    assert.equal(h.orders.length, 1);
    assert.equal(h.user?.coins, 80);
    assert.equal(h.item?.estoque, 0);
  });

  it('keeps a successful purchase when notification creation fails', async () => {
    const h = createHarness({ failNotify: true });

    const result = await purchaseItemCore(7, 'Decrypt', 1, h.deps);

    assert.equal(result.ok, true);
    assert.equal(result.balance, 80);
    assert.equal(h.orders.length, 1);
    assert.equal(h.criticalLogs.length, 1);
    assert.match(h.criticalLogs[0].message, /notification/i);
  });
});
