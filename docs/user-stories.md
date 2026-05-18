# E-Commerce User Stories

## Customer Stories

### Account

- As a customer, I want to create an account so that I can save my orders and addresses.
- As a customer, I want to sign in securely so that only I can view my order history.
- As a customer, I want to reset my password so that I can recover access.

### Product Discovery

- As a customer, I want to browse products so that I can discover what the store sells.
- As a customer, I want to filter products by category, price, and availability so that I can narrow my choices.
- As a customer, I want to search by product name or SKU so that I can find a specific item.
- As a customer, I want to view product details so that I can decide whether to buy.

### Cart

- As a customer, I want to add a product variant to my cart so that I can buy the exact item I selected.
- As a customer, I want to change item quantities so that my cart matches what I need.
- As a customer, I want to remove items so that I can correct mistakes.
- As a customer, I want the cart to show accurate totals so that I understand the cost before checkout.

### Checkout

- As a customer, I want to enter a shipping address so that my order can be delivered.
- As a customer, I want to review my order before paying so that I can catch mistakes.
- As a customer, I want to pay securely so that I can complete my purchase.
- As a customer, I want a confirmation after payment so that I know the order was placed.

### Orders

- As a customer, I want to see my order history so that I can track past purchases.
- As a customer, I want to see order status so that I know whether it is pending, paid, shipped, or delivered.
- As a customer, I want to request cancellation before shipment so that I can stop an unwanted order.

## Admin Stories

### Catalog Management

- As an admin, I want to create products so that customers can buy them.
- As an admin, I want to manage product variants so that sizes, colors, or other options are represented correctly.
- As an admin, I want to upload product images so that customers can inspect products.
- As an admin, I want to update prices so that the catalog stays current.
- As an admin, I want to archive products instead of deleting them so that old orders remain valid.

### Inventory

- As an admin, I want to update stock quantities so that product availability is accurate.
- As an admin, I want to see low-stock products so that I know what needs replenishment.

### Orders

- As an admin, I want to view new orders so that I can process them.
- As an admin, I want to update fulfillment status so that customers know what is happening.
- As an admin, I want to cancel eligible orders so that operational mistakes can be corrected.
- As an admin, I want to issue or record refunds so that customer problems can be resolved.

## Acceptance Criteria Examples

### Add Item To Cart

- Given a product variant is active and in stock, when a customer adds it to the cart, then the cart contains that variant and quantity.
- Given the same variant already exists in the cart, when the customer adds it again, then the quantity increases.
- Given the requested quantity exceeds available stock, when the customer adds it to the cart, then the server rejects the request.

### Create Order

- Given the customer has valid cart items and a shipping address, when checkout starts, then the server recalculates totals.
- Given a product price changed after it was added to the cart, when checkout starts, then the latest valid price is used or the customer is asked to review the change.
- Given payment succeeds, when the payment confirmation is received, then the order payment status becomes paid.
- Given the same payment webhook is received twice, when it is processed, then the order is not charged or updated twice.

### Update Inventory

- Given an order is paid, when inventory is reserved or decremented, then stock cannot go below zero.
- Given two customers try to buy the last unit at the same time, when both check out, then only one order can successfully claim the unit.

