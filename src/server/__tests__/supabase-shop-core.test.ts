import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  appStatusToDb,
  dbStatusToApp,
  mapShopItemToSupabasePatch,
  mapSupabaseAdminNotification,
  mapSupabaseShopItem,
  mapSupabaseShopOrder,
} from '@/server/supabase/shop-core';

describe('supabase shop core', () => {
  it('maps Supabase shop items to the app shop shape', () => {
    const item = mapSupabaseShopItem({
      id: 3,
      name: 'Sofa',
      description: 'Rare',
      image: 'item.png',
      price_coins: 25,
      stock: 4,
      active: true,
    });

    assert.deepEqual(item, {
      id: 3,
      nome: 'Sofa',
      descricao: 'Rare',
      imagem: 'item.png',
      preco: 25,
      estoque: 4,
      status: 'ativo',
    });
  });

  it('maps shop item patches without legacy column names', () => {
    assert.deepEqual(
      mapShopItemToSupabasePatch({ nome: 'Badge', preco: 10, estoque: 2, status: 'inativo' }),
      { name: 'Badge', price_coins: 10, stock: 2, active: false },
    );
  });

  it('maps order statuses in both directions', () => {
    assert.equal(appStatusToDb('pendente'), 'pending');
    assert.equal(appStatusToDb('entregue'), 'delivered');
    assert.equal(appStatusToDb('cancelado'), 'cancelled');
    assert.equal(dbStatusToApp('pending'), 'pendente');
    assert.equal(dbStatusToApp('delivered'), 'entregue');
    assert.equal(dbStatusToApp('cancelled'), 'cancelado');
  });

  it('maps Supabase shop orders to the admin order shape', () => {
    const order = mapSupabaseShopOrder({
      id: 9,
      item: 3,
      buyer: 20,
      buyer_nick: 'Dexct',
      price_paid: 25,
      status: 'pending',
      item_name: 'Sofa',
      item_image: 'item.png',
    });

    assert.equal(order.user_nick, 'Dexct');
    assert.equal(order.item_nome, 'Sofa');
    assert.equal(order.status, 'pendente');
  });

  it('maps admin notifications', () => {
    const notification = mapSupabaseAdminNotification({
      id: 63,
      message: 'Nouvelle commande',
      severity: 'success',
      read: false,
    });

    assert.equal(notification.type, 'success');
    assert.equal(notification.title, 'Nouvelle commande');
    assert.equal(notification.read, false);
  });
});
