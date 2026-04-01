# Bugfix Requirements Document

## Introduction

A thorough code analysis of the LINE Telepharmacy ERP system revealed 12 issues across multiple severity levels — 4 critical, 4 high, and 4 medium. These issues span race conditions in inventory and loyalty, missing database transactions in order and payment flows, missing stock release and refund logic, unauthenticated webhooks, insecure cookie handling, and various code quality problems. Left unfixed, these bugs can cause data corruption (overselling, negative loyalty points, duplicate order numbers), permanent inventory loss, payment/order state inconsistency, and security vulnerabilities (unauthenticated webhook access, XSS-exposed tokens).

---

## Bug Analysis

### Current Behavior (Defect)

**🔴 Critical — Race Conditions & Missing Transactions**

1.1 WHEN two or more concurrent orders request `reserveStock()` for the same inventory lot THEN the system reads the same `quantityAvailable` value for both, resulting in overselling because the read-check-write cycle has no database transaction or row-level lock

1.2 WHEN two or more concurrent orders call `releaseReservedStock()` or `consumeReservedStock()` for the same lot simultaneously THEN the system can produce incorrect `quantityAvailable` / `quantityReserved` values due to the same read-then-write race condition without locking

1.3 WHEN `createOtcOrder()` succeeds at `reserveStock()` but fails during `insert(orderItems)` or `createPayment()` THEN the reserved stock is permanently locked with no rollback, because the entire operation is not wrapped in a database transaction

1.4 WHEN `refundOrder()` is called for an order that had stock reserved or consumed THEN the system does not call `releaseReservedStock()` or reverse consumed stock, causing those inventory quantities to be permanently lost from available stock

1.5 WHEN `refundOrder()` is called THEN the system does not call `paymentService.processRefund()`, so the payment record remains in `successful` status while the order is set to `cancelled`

1.6 WHEN any external party sends a POST request to `/webhooks/shipping` THEN the system accepts and processes it without any authentication guard, signature verification, or API key check, allowing unauthorized manipulation of order and delivery statuses

**🟠 High — Transaction & Security Issues**

1.7 WHEN `confirmPayment()` updates the payment status to `successful` but the subsequent order status update to `processing` fails THEN the payment is marked successful while the order remains in `awaiting_payment` status, creating an inconsistent state

1.8 WHEN two or more concurrent requests call `redeemPoints()` for the same patient THEN both read the same `currentPoints` balance, both pass the sufficiency check, and both deduct points, potentially resulting in a negative points balance

1.9 WHEN the admin frontend calls `setCookie('access_token', ...)` THEN the cookie is set without the `Secure` flag (token sent over HTTP) and without the `HttpOnly` flag (JavaScript can read the token, enabling XSS attacks)

1.10 WHEN the admin middleware checks the JWT token THEN it only decodes the base64 payload to check expiry and `type` field but does not verify the JWT signature, allowing forged tokens to pass the middleware check

1.11 WHEN `reorder()` creates a new order from a previous order THEN the system does not call `reserveStock()` for any items, does not check if products have sufficient stock, and does not calculate `subtotal` or `totalAmount` on the new order

**🟡 Medium — Code Quality & Robustness**

1.12 WHEN `generateOrderNo()` is called concurrently by two requests at the same time THEN both read the same last order number, increment to the same sequence, and attempt to insert duplicate order numbers

---

### Expected Behavior (Correct)

**🔴 Critical — Race Conditions & Missing Transactions**

2.1 WHEN two or more concurrent orders request `reserveStock()` for the same inventory lot THEN the system SHALL use `SELECT ... FOR UPDATE` (pessimistic locking) or optimistic locking with version checks within a database transaction to ensure only one request can modify the lot quantities at a time, preventing overselling

2.2 WHEN two or more concurrent operations call `releaseReservedStock()` or `consumeReservedStock()` for the same lot simultaneously THEN the system SHALL use row-level locking within a transaction to ensure atomic read-check-write on lot quantities

2.3 WHEN `createOtcOrder()` is executed THEN the system SHALL wrap the entire sequence (stock reservation → order insert → order items insert → payment creation) in a single database transaction, so that any failure at any step rolls back all previous steps

2.4 WHEN `refundOrder()` is called for an order that had stock reserved or consumed THEN the system SHALL release reserved stock back to available (via `releaseReservedStock()`) for each order item that has a `lotId`, restoring inventory quantities

2.5 WHEN `refundOrder()` is called THEN the system SHALL call `paymentService.processRefund()` to update the payment record status and initiate the refund process, keeping payment and order states consistent

2.6 WHEN a POST request arrives at `/webhooks/shipping` THEN the system SHALL verify the request authenticity via a signature header or API key guard before processing, rejecting unauthenticated requests with 401/403

**🟠 High — Transaction & Security Issues**

2.7 WHEN `confirmPayment()` is executed THEN the system SHALL wrap the payment status update and order status update in a single database transaction, so both succeed or both roll back

2.8 WHEN two or more concurrent requests call `redeemPoints()` for the same patient THEN the system SHALL use row-level locking (e.g., `SELECT ... FOR UPDATE` on the loyalty account) within a transaction to ensure the balance check and deduction are atomic, preventing negative balances

2.9 WHEN the admin frontend sets the access token cookie THEN the system SHALL include the `Secure` flag (HTTPS-only transmission) and the `HttpOnly` flag (inaccessible to JavaScript) on the cookie

2.10 WHEN the admin middleware checks the JWT token THEN the system SHALL verify the JWT signature using the secret key, not just decode the payload, to prevent forged tokens from being accepted

2.11 WHEN `reorder()` creates a new order from a previous order THEN the system SHALL check stock availability, reserve stock via `selectFefoLots()` and `reserveStock()`, and calculate `subtotal` and `totalAmount` based on current product prices

**🟡 Medium — Code Quality & Robustness**

2.12 WHEN `generateOrderNo()` is called concurrently THEN the system SHALL use a database sequence or an atomic counter mechanism to guarantee unique order numbers without race conditions

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a single order reserves stock from a lot with sufficient quantity THEN the system SHALL CONTINUE TO correctly decrement `quantityAvailable` and increment `quantityReserved` by the requested amount

3.2 WHEN `createOtcOrder()` completes successfully with all steps passing THEN the system SHALL CONTINUE TO return the complete order response with items, payment info, and QR code data

3.3 WHEN `cancelOrder()` is called for an order in `draft` or `awaiting_payment` status THEN the system SHALL CONTINUE TO release reserved stock and set the order status to `cancelled`

3.4 WHEN a valid, authenticated shipping webhook is received with a known tracking number THEN the system SHALL CONTINUE TO update delivery status and trigger `markDelivered()` when status is `delivered`

3.5 WHEN `confirmPayment()` succeeds for a valid payment THEN the system SHALL CONTINUE TO set payment status to `successful`, set order status to `processing`, and record `paidAt` timestamps

3.6 WHEN a patient redeems points with sufficient balance in a single (non-concurrent) request THEN the system SHALL CONTINUE TO deduct points, record the transaction, and return the discount amount

3.7 WHEN a staff user logs in with valid credentials THEN the system SHALL CONTINUE TO receive an access token, store it, and be able to access protected dashboard routes

3.8 WHEN `reorder()` encounters unavailable or inactive products from the original order THEN the system SHALL CONTINUE TO skip those items and include them in the `unavailableItems` list

3.9 WHEN `selectFefoLots()` selects lots for a product THEN the system SHALL CONTINUE TO order lots by expiry date ascending (FEFO) and skip expired lots

3.10 WHEN `shipOrder()` is called for a packed/ready order THEN the system SHALL CONTINUE TO create a delivery record, consume reserved stock, and update order status to `shipped`

3.11 WHEN loyalty points are earned on order delivery THEN the system SHALL CONTINUE TO apply the correct tier multiplier and update lifetime spent for tier progression

3.12 WHEN `uploadSlip()` is called with a valid order in `awaiting_payment` status THEN the system SHALL CONTINUE TO update payment status to `processing` and enqueue the OCR job
