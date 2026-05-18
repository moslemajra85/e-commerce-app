import { createId } from '../../db/store.js';

// Persists an order snapshot. Product names, SKUs, prices, and payment details
// are copied into the order so history remains stable if the catalog changes.
export function createOrder(store, orderInput) {
  const totalCents = orderInput.items.reduce((sum, item) => sum + item.lineTotalCents, 0);
  const order = {
    id: createId('order'),
    orderNumber: `EC-${store.nextOrderNumber++}`,
    userId: orderInput.userId,
    paymentStatus: orderInput.payment.status,
    fulfillmentStatus: 'pending',
    totalCents,
    currency: orderInput.items[0]?.currency ?? 'USD',
    shippingAddress: orderInput.shippingAddress,
    items: orderInput.items,
    payment: {
      id: createId('payment'),
      provider: orderInput.payment.provider,
      status: orderInput.payment.status,
      amountCents: totalCents,
    },
    createdAt: new Date().toISOString(),
  };

  store.orders.push(order);
  return order;
}

// Order history is scoped to the authenticated customer.
export function listOrdersForUser(store, userId) {
  return store.orders.filter((order) => order.userId === userId);
}
