# TicketHub: Concert and Event Ticketing System Design

## 1. Requirements

### 1.1 Functional Requirements

1. **User management:** Users can register, log in, and view their profiles.
2. **Event browsing:** Users can browse upcoming events, search by name or location, and view event details.
3. **Seat selection:** Users can view the seats available for an event and select seats to purchase.
4. **Seat holding:** Users can temporarily hold available seats while completing checkout. A hold expires after five minutes if payment is not completed.
5. **Payment:** Users can pay for held seats and receive a confirmed order after successful payment.
6. **Ticket management:** Users can view their purchased tickets and access a unique ticket identifier or QR code.
7. **Order management:** Users can view order details and payment status.

### 1.2 Non-Functional Requirements

- **Performance:** Event listings and seat maps should load within two seconds under normal conditions. During a major sale, the system should keep responses reasonably fast and communicate waiting or queue status to users.
- **Correctness:** A seat must never be sold to two customers. An order must not be confirmed unless payment is successfully verified.
- **Fairness:** Customers should enter a virtual waiting room during high-demand sales. The queue should assign a stable position or token, and users should not gain an advantage by repeatedly refreshing or sending parallel requests.
- **Availability:** Browsing and ticket viewing should remain available during failures where possible. The purchase workflow must fail safely rather than sell an already reserved seat.
- **Security:** Authentication, authorization, rate limiting, encrypted connections, and payment-provider verification must protect accounts and purchases.
- **Scalability:** The system must handle two million registered users and a sudden surge of 200,000 people trying to purchase tickets.
- **Consistency:** Seat availability and order status must be updated through reliable transactional operations.
- **Maintainability:** The system should use clearly separated components, logging, monitoring, and automated tests.

## 2. Traffic and Capacity Estimates

### 2.1 Normal Traffic

Given:
- Registered users: 2,000,000
- Daily visitors: 50,000
- Pages viewed per visitor: 10
- Tickets sold daily: 5,000

**Daily page views**

50,000 visitors × 10 pages = **500,000 page views/day**

**Average page requests per second**

500,000 ÷ 86,400 seconds ≈ **5.8 page views/second**

This is an average. Actual traffic will be higher during popular events and lower at other times. If peak traffic is five times the average, the system should handle approximately **29 page views/second**, before accounting for additional API requests.

**Average ticket sales rate**

5,000 tickets ÷ 86,400 seconds ≈ **0.058 tickets/second**, or approximately 208 tickets per hour on average.

### 2.2 Big-Sale Traffic

Given:
- 200,000 people attempt to buy tickets.
- 20,000 seats are available.
- The initial demand arrives within 10 minutes.

**Incoming users per second**

200,000 ÷ 600 seconds ≈ **333 people/second**

**Seat demand**

200,000 ÷ 20,000 = **10 people competing for each seat on average.**

Only 10% of these people can obtain a seat if every person wants one seat and all seats are sold. Actual demand may vary because users can select different numbers of seats.

The system must handle more than 333 incoming users per second because one purchase attempt may generate multiple API requests, database operations, and payment-provider calls.

### 2.3 Comparison and Capacity Plan

| Measure | Normal day | Big sale |
|---|---:|---:|
| Visitors or purchase attempts | 50,000/day | 200,000 in 10 min |
| Average incoming rate | 0.58 visitors/sec over a full day | 333 attempts/sec |
| Page views | 500,000/day | Depends on user activity |
| Available seats | Event-dependent | 20,000 |
| Main concern | Efficient everyday service | Overload, fairness, and seat correctness |

The big-sale arrival rate is approximately 575 times the average daily visitor arrival rate. This comparison uses daily visitors spread over 24 hours; it is not a direct comparison of page-view rates.

To handle the sale, TicketHub will use a virtual waiting room, rate limits, caching for read-heavy event data, horizontally scalable application servers, and a transactional database. Capacity testing must validate the actual limits before a major sale.

## 3. API Design

All endpoints use HTTPS and JSON. Protected endpoints require an authenticated user. The examples show representative responses; production APIs should also validate input and return consistent error formats.

### 3.1 Browse Events

**GET `/api/events?search=concert&page=1&limit=20`**

Returns a paginated list of published events.

Example response:

```json
{
  "items": [
    {
      "id": 101,
      "name": "Summer Concert",
      "venue": "City Arena",
      "startsAt": "2027-06-20T18:00:00Z"
    }
  ],
  "page": 1,
  "limit": 20
}
```

### 3.2 View Event Details and Seats

**GET `/api/events/{eventId}`**

Returns event information, including venue, date, and ticket-sale status.

**GET `/api/events/{eventId}/seats`**

Returns seat identifiers and their current status: `available`, `held`, or `sold`. The response is a snapshot, not a guarantee that a seat will remain available until checkout.

### 3.3 Hold Seats

**POST `/api/orders/holds`**

Requires authentication and a valid queue token during high-demand sales.

Example request:

```json
{
  "eventId": 101,
  "seatIds": [501, 502],
  "queueToken": "signed-queue-token"
}
```

Example response:

```json
{
  "holdId": "hold-abc123",
  "expiresAt": "2027-06-20T12:05:00Z",
  "status": "held"
}
```

The server atomically reserves the requested seats only if all are available. If a seat is unavailable, the request fails without partially holding the requested group of seats.

### 3.4 Pay for an Order

**POST `/api/orders/{orderId}/payment`**

Requires authentication and a valid active hold. The client supplies a payment-provider reference or a payment-method token, not raw card details.

Example request:

```json
{
  "paymentMethodToken": "provider-token",
  "idempotencyKey": "pay-unique-request-123"
}
```

Example response:

```json
{
  "orderId": "order-abc123",
  "status": "processing"
}
```

Payment may be asynchronous. A verified payment callback or reconciliation process confirms the order and marks the seats as sold. Idempotency prevents retries from creating duplicate charges or orders.

### 3.5 View My Tickets

**GET `/api/me/tickets?page=1&limit=20`**

Returns tickets belonging to the authenticated user.

Example response:

```json
{
  "items": [
    {
      "ticketId": "ticket-789",
      "eventId": 101,
      "seatId": 501,
      "status": "confirmed"
    }
  ],
  "page": 1,
  "limit": 20
}
```

### 3.6 Error Responses

- `400 Bad Request`: Invalid input or malformed seat selection.
- `401 Unauthorized`: User is not authenticated.
- `403 Forbidden`: User is not allowed to access an order or does not have a valid queue token.
- `404 Not Found`: Event, seat, or order does not exist.
- `409 Conflict`: Seat is no longer available or the hold has expired.
- `429 Too Many Requests`: Request rate or queue policy exceeded.
- `500 Internal Server Error`: Unexpected server failure.

## 4. Data Model

A relational database such as PostgreSQL is suitable because ticket sales require transactions, constraints, and relationships.

### 4.1 Tables and Relationships

**Users**
- `id` — primary key
- `email` — unique, not null
- `password_hash` — not null
- `created_at` — timestamp

**Events**
- `id` — primary key
- `name` — not null
- `venue` — not null
- `starts_at` — timestamp, not null
- `sale_status` — not null

**Seats**
- `id` — primary key
- `event_id` — foreign key referencing `Events.id`
- `seat_label` — not null
- `status` — available, held, or sold
- `hold_expires_at` — nullable timestamp
- `hold_user_id` — nullable foreign key referencing `Users.id`

Add a unique constraint on `(event_id, seat_label)` so the same seat label cannot be created twice for one event.

**Orders**
- `id` — primary key
- `user_id` — foreign key referencing `Users.id`
- `status` — pending, processing, confirmed, failed, or expired
- `total_amount` — not null
- `currency` — not null
- `idempotency_key` — unique for the appropriate user/payment operation
- `created_at` — timestamp

**Order_Items**
- `id` — primary key
- `order_id` — foreign key referencing `Orders.id`
- `seat_id` — foreign key referencing `Seats.id`
- `price` — not null

Add a **unique constraint on `Order_Items.seat_id`** if each seat can be sold only once for its event. If the system retains canceled orders and supports resale, use a separate active-ticket or seat-allocation table with a uniqueness constraint on the seat for active allocations, rather than allowing historical order rows to block legitimate resale.

**Payments**
- `id` — primary key
- `order_id` — foreign key referencing `Orders.id`
- `provider_reference` — unique
- `status` — pending, succeeded, or failed
- `amount` — not null
- `created_at` — timestamp

### 4.2 Relationships

- One user can place many orders: `Users 1 → many Orders`.
- One event has many seats: `Events 1 → many Seats`.
- One order contains one or more order items: `Orders 1 → many Order_Items`.
- Each order item refers to one seat: `Seats 1 → many historical Order_Items` only if historical orders are retained; the active-sale uniqueness rule prevents more than one valid sale.
- One order can have multiple payment attempts, but only one successful payment should be accepted for the amount due.

Useful indexes include `Events(starts_at)`, `Seats(event_id, status)`, `Orders(user_id, created_at)`, and `Payments(provider_reference)`.

### 4.3 Preventing Double-Booking

Application-level checks alone are insufficient. Two requests can both read a seat as available before either writes an update.

TicketHub prevents double-booking with a database transaction and an atomic conditional update:

1. Begin a transaction.
2. Lock or conditionally update the requested seats only when their status is `available` or their previous hold has expired.
3. Set their status to `held`, record the user, and set a five-minute expiry.
4. Verify that every requested seat was successfully acquired.
5. Create the pending order and its order items within the same transaction.
6. Commit only if all requested seats were acquired; otherwise roll back the transaction.

A competing request cannot acquire a seat that another transaction has already held. Database constraints provide a second line of defense against duplicate seat allocation.

Payment is processed outside the database transaction to avoid holding locks while waiting for an external service. After payment is verified, a short transaction confirms the order and marks the held seats as sold, provided the hold is still valid and belongs to that order. Expiration and payment processing must be coordinated so that a seat cannot be released while its payment is being confirmed. If payment succeeds after a hold expires, the system must reconcile the result and refund or otherwise safely resolve the payment rather than sell the seat twice.

## 5. Architecture

### 5.1 Architecture Diagram

```text
                         Customers
                             |
                             v
                    DNS / CDN / WAF
                             |
                             v
                    Load Balancer
                             |
                 +-----------+-----------+
                 |                       |
                 v                       v
          Application Server 1    Application Server 2
                 |                       |
                 +-----------+-----------+
                             |
              +--------------+--------------+
              |              |              |
              v              v              v
         Cache/Redis    Queue Service   Payment Provider
              |              |
              |              v
              |       Background Workers
              |              |
              +-------+------+
                      |
                      v
             Primary PostgreSQL DB
                      |
                      v
                Read Replica
```

### 5.2 Component Responsibilities

- **DNS:** Directs users to the service's public entry point.
- **CDN and WAF:** Cache static assets and help block malicious traffic and common attacks.
- **Load balancer:** Distributes requests across healthy application servers.
- **Application servers:** Handle authentication, event browsing, seat holds, orders, and ticket APIs. Multiple instances allow horizontal scaling.
- **Cache/Redis:** Stores frequently accessed event details, short-lived queue information, and other data suitable for caching. It is not the final authority for seat ownership.
- **Virtual waiting room and queue service:** Limits how many users can enter the purchase workflow at once. It issues queue tokens and applies a consistent admission policy.
- **Primary PostgreSQL database:** Owns authoritative seat status, holds, orders, and payments. Transactions and constraints enforce purchase correctness.
- **Read replica:** Serves suitable read-heavy queries, such as browsing events. Seat availability shown from a replica may be slightly stale, so all purchase decisions must be validated by the primary database.
- **Payment provider:** Processes payments and sends signed, verifiable callbacks.
- **Background workers:** Process payment callbacks, expire abandoned holds, issue tickets, send notifications, and reconcile delayed or failed operations.

### 5.3 How the System Survives a Big Sale

Before the sale, TicketHub preloads event details and static assets into caches and the CDN. At the opening time, the virtual waiting room admits customers at a controlled rate instead of allowing all 200,000 users to overwhelm the purchase service.

Application servers scale horizontally, while rate limits and per-user controls reduce abuse. Read traffic is served from caches and replicas where appropriate. Seat holds, order creation, and final sale confirmation go through the primary database, which applies atomic updates and uniqueness constraints.

Queues and background workers absorb non-interactive work, such as notifications and ticket delivery. Health checks, monitoring, alerts, database backups, and recovery procedures support reliability. If the primary database or payment provider is unavailable, the system temporarily pauses affected purchases rather than falsely confirming sales.

## 6. Trade-Offs

### 6.1 Strict Consistency vs. Maximum Availability

Using a primary relational database for seat allocation ensures that concurrent requests cannot sell the same seat. However, the primary database may become a bottleneck during the sale. TicketHub accepts this limitation for purchasing operations and scales read traffic separately. When authoritative seat allocation cannot be verified, it fails safely instead of risking duplicate sales.

### 6.2 Fairness vs. Speed

A virtual waiting room introduces waiting time and additional infrastructure. However, it gives users a more predictable process and protects the application and database from sudden overload. A documented admission policy, stable queue tokens, rate limits, and controls against repeated queue entry make the process fairer than a first-request-to-hit-the-server approach.

### 6.3 Short Holds vs. Purchase Completion

Short holds make seats available again when customers abandon checkout, improving seat utilization. However, a five-minute hold may be insufficient for some users or payment delays. The system must clearly show expiration time, coordinate payment confirmation with hold expiry, and safely resolve late payment results.

### 6.4 Cache Performance vs. Freshness

Caching event pages and seat-map snapshots reduces database load and improves response time. However, cached seat information may become stale during a sale. TicketHub therefore uses cached data for browsing but checks and reserves seats against the authoritative primary database before confirming a purchase.

## Conclusion

TicketHub is designed for both everyday browsing and highly concentrated ticket sales. Its most important correctness guarantee is that each seat can have only one active allocation. A fair waiting room, horizontally scalable application servers, read caching, a transactional primary database, payment idempotency, and background processing help the system remain responsive without sacrificing purchase correctness.
