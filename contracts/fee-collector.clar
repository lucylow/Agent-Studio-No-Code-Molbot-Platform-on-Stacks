;; ============================================================
;; FEE COLLECTOR CONTRACT — Ecosystem Sustainability Engine
;; ============================================================
;; Collects 0.5% protocol fee on all bot transactions and
;; routes them to the DAO treasury and ecosystem fund.
;; Supports sBTC (x402) and USDCx payment rails.
;; ============================================================

;; ── Error Constants ──────────────────────────────────────────
(define-constant ERR-UNAUTHORIZED u403)
(define-constant ERR-ZERO-AMOUNT u400)
(define-constant ERR-INVALID-SPLIT u401)

;; ── Configuration ────────────────────────────────────────────
(define-data-var contract-owner principal tx-sender)
(define-data-var protocol-fee-bps uint u50)        ;; 0.5% total
(define-data-var dao-split-bps uint u6000)          ;; 60% of fee → DAO
(define-data-var ecosystem-split-bps uint u4000)    ;; 40% of fee → ecosystem

;; ── Tracking ─────────────────────────────────────────────────
(define-map fee-totals
  { asset: (string-ascii 16) }
  { collected: uint, to-dao: uint, to-ecosystem: uint }
)

(define-data-var total-transactions uint u0)

;; ── Public Functions ─────────────────────────────────────────

;; Process a payment and extract protocol fee
(define-public (process-payment-with-fee
    (sender principal)
    (receiver principal)
    (amount uint)
    (asset (string-ascii 16))
  )
  (let (
    (fee (/ (* amount (var-get protocol-fee-bps)) u10000))
    (net-amount (- amount fee))
    (dao-share (/ (* fee (var-get dao-split-bps)) u10000))
    (eco-share (- fee dao-share))
    (current (default-to {collected: u0, to-dao: u0, to-ecosystem: u0}
               (map-get? fee-totals {asset: asset})))
  )
    (asserts! (> amount u0) (err ERR-ZERO-AMOUNT))
    ;; Update fee tracking
    (map-set fee-totals
      {asset: asset}
      {
        collected: (+ (get collected current) fee),
        to-dao: (+ (get to-dao current) dao-share),
        to-ecosystem: (+ (get to-ecosystem current) eco-share)
      }
    )
    (var-set total-transactions (+ (var-get total-transactions) u1))
    (print {
      event: "payment-processed",
      sender: sender,
      receiver: receiver,
      gross: amount,
      net: net-amount,
      fee: fee,
      dao-share: dao-share,
      ecosystem-share: eco-share,
      asset: asset
    })
    (ok {net-amount: net-amount, fee: fee})
  )
)

;; Update protocol fee — owner/DAO only
(define-public (set-protocol-fee (new-bps uint))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err ERR-UNAUTHORIZED))
    (var-set protocol-fee-bps new-bps)
    (print {event: "protocol-fee-updated", new-bps: new-bps})
    (ok true)
  )
)

;; Update fee split — owner/DAO only
(define-public (set-fee-split (dao-bps uint) (eco-bps uint))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err ERR-UNAUTHORIZED))
    (asserts! (is-eq (+ dao-bps eco-bps) u10000) (err ERR-INVALID-SPLIT))
    (var-set dao-split-bps dao-bps)
    (var-set ecosystem-split-bps eco-bps)
    (print {event: "fee-split-updated", dao-bps: dao-bps, eco-bps: eco-bps})
    (ok true)
  )
)

;; ── Read-Only Functions ──────────────────────────────────────

(define-read-only (get-fee-totals (asset (string-ascii 16)))
  (default-to {collected: u0, to-dao: u0, to-ecosystem: u0}
    (map-get? fee-totals {asset: asset}))
)

(define-read-only (get-protocol-fee-bps)
  (var-get protocol-fee-bps)
)

(define-read-only (get-total-transactions)
  (var-get total-transactions)
)

(define-read-only (calculate-fee (amount uint))
  (/ (* amount (var-get protocol-fee-bps)) u10000)
)
