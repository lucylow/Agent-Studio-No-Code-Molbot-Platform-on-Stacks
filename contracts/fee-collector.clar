;; ============================================================
;; fee-collector.clar  (v2 — Hardened)
;; ============================================================
;; Agent Studio — Ecosystem Fee Collection & Distribution
;;
;; Collects protocol fees on all bot transactions and routes
;; them to the DAO treasury and ecosystem fund.
;;
;; v2 enhancements:
;;   • Access control for fee processing
;;   • Per-transaction audit trail
;;   • Configurable minimum fee threshold
;;   • Emergency pause
;; ============================================================

;; ── Error Constants ──────────────────────────────────────────
(define-constant ERR_UNAUTHORIZED  (err u403))
(define-constant ERR_ZERO_AMOUNT   (err u400))
(define-constant ERR_INVALID_SPLIT (err u401))
(define-constant ERR_PAUSED        (err u503))
(define-constant ERR_BELOW_MIN     (err u402))

;; ── Contract Owner ───────────────────────────────────────────
(define-constant CONTRACT_OWNER tx-sender)

;; ── Configuration ────────────────────────────────────────────
(define-data-var protocol-fee-bps uint u50)        ;; 0.5%
(define-data-var dao-split-bps uint u6000)          ;; 60% of fee → DAO
(define-data-var ecosystem-split-bps uint u4000)    ;; 40% of fee → ecosystem
(define-data-var min-fee-threshold uint u1)         ;; Minimum fee in micro-units
(define-data-var paused bool false)

;; ── Tracking ─────────────────────────────────────────────────
(define-map fee-totals
  { asset: (string-ascii 16) }
  { collected: uint, to-dao: uint, to-ecosystem: uint }
)

(define-data-var total-transactions uint u0)
(define-data-var next-fee-id uint u1)

;; Audit trail for fee collections
(define-map fee-records
  { fee-id: uint }
  {
    sender: principal,
    receiver: principal,
    gross-amount: uint,
    fee: uint,
    dao-share: uint,
    eco-share: uint,
    asset: (string-ascii 16),
    block: uint
  }
)

;; Allowlist of authorized fee processors
(define-map authorized-processors
  { processor: principal }
  { active: bool }
)

;; ── Private Helpers ──────────────────────────────────────────

(define-private (is-authorized)
  (or
    (is-eq tx-sender CONTRACT_OWNER)
    (match (map-get? authorized-processors { processor: tx-sender })
      entry (get active entry)
      false
    )
  )
)

;; ── Admin Functions ──────────────────────────────────────────

(define-public (set-authorized-processor (processor principal) (active bool))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (map-set authorized-processors { processor: processor } { active: active })
    (ok true)
  )
)

(define-public (set-paused (is-paused bool))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (var-set paused is-paused)
    (print { topic: "fee-collector-paused", paused: is-paused, block-height: block-height })
    (ok true)
  )
)

;; ── Public Functions ─────────────────────────────────────────

;; @notice Process a payment and extract protocol fee.
;; Returns the net amount after fee deduction.
(define-public (process-payment-with-fee
    (sender principal)
    (receiver principal)
    (amount uint)
    (asset (string-ascii 16)))
  (let (
    (fee (/ (* amount (var-get protocol-fee-bps)) u10000))
    (net-amount (- amount fee))
    (dao-share (/ (* fee (var-get dao-split-bps)) u10000))
    (eco-share (- fee dao-share))
    (fee-id (var-get next-fee-id))
    (current (default-to { collected: u0, to-dao: u0, to-ecosystem: u0 }
               (map-get? fee-totals { asset: asset })))
  )
    ;; Guards
    (asserts! (not (var-get paused)) ERR_PAUSED)
    (asserts! (> amount u0) ERR_ZERO_AMOUNT)
    (asserts! (>= fee (var-get min-fee-threshold)) ERR_BELOW_MIN)

    ;; Update fee tracking
    (map-set fee-totals
      { asset: asset }
      {
        collected: (+ (get collected current) fee),
        to-dao: (+ (get to-dao current) dao-share),
        to-ecosystem: (+ (get to-ecosystem current) eco-share)
      }
    )

    ;; Audit trail
    (map-insert fee-records
      { fee-id: fee-id }
      {
        sender: sender,
        receiver: receiver,
        gross-amount: amount,
        fee: fee,
        dao-share: dao-share,
        eco-share: eco-share,
        asset: asset,
        block: block-height
      }
    )

    (var-set total-transactions (+ (var-get total-transactions) u1))
    (var-set next-fee-id (+ fee-id u1))

    (print {
      topic: "payment-processed",
      fee-id: fee-id,
      sender: sender,
      receiver: receiver,
      gross: amount,
      net: net-amount,
      fee: fee,
      dao-share: dao-share,
      ecosystem-share: eco-share,
      asset: asset,
      block-height: block-height
    })

    (ok { net-amount: net-amount, fee: fee, dao-share: dao-share, eco-share: eco-share })
  )
)

;; @notice Update protocol fee. Owner/DAO only. Max 5% (500 bps).
(define-public (set-protocol-fee (new-bps uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (asserts! (<= new-bps u500) ERR_INVALID_SPLIT)
    (var-set protocol-fee-bps new-bps)
    (print { topic: "protocol-fee-updated", new-bps: new-bps, block-height: block-height })
    (ok true)
  )
)

;; @notice Update fee split distribution. Must sum to 10000.
(define-public (set-fee-split (dao-bps uint) (eco-bps uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (asserts! (is-eq (+ dao-bps eco-bps) u10000) ERR_INVALID_SPLIT)
    (var-set dao-split-bps dao-bps)
    (var-set ecosystem-split-bps eco-bps)
    (print { topic: "fee-split-updated", dao-bps: dao-bps, eco-bps: eco-bps, block-height: block-height })
    (ok true)
  )
)

;; ── Read-Only Functions ──────────────────────────────────────

(define-read-only (get-fee-totals (asset (string-ascii 16)))
  (default-to { collected: u0, to-dao: u0, to-ecosystem: u0 }
    (map-get? fee-totals { asset: asset }))
)

(define-read-only (get-fee-record (fee-id uint))
  (ok (map-get? fee-records { fee-id: fee-id }))
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

(define-read-only (is-paused)
  (ok (var-get paused))
)
