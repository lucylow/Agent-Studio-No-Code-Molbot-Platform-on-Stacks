;; ============================================================
;; IMPACT TRACKER CONTRACT — On-Chain Ecosystem Metrics
;; ============================================================
;; Tracks Agent Studio's contribution to Stacks: wallets created,
;; bots deployed, sBTC volume, USDCx streamed, developers onboarded.
;; Powers the live Impact Dashboard.
;; ============================================================

;; ── Error Constants ──────────────────────────────────────────
(define-constant ERR-UNAUTHORIZED u403)

;; ── Data ─────────────────────────────────────────────────────
(define-map global-stats
  { stat-name: (string-ascii 64) }
  { value: uint }
)

(define-data-var contract-owner principal tx-sender)

;; ── Public Functions ─────────────────────────────────────────

;; Increment a named stat by amount
(define-public (increment-stat (name (string-ascii 64)) (amount uint))
  (let ((current (default-to {value: u0} (map-get? global-stats {stat-name: name}))))
    (map-set global-stats {stat-name: name} {value: (+ (get value current) amount)})
    (print {event: "stat-incremented", stat: name, amount: amount, new-value: (+ (get value current) amount)})
    (ok true)
  )
)

;; Convenience: track a new bot registration
(define-public (track-new-bot)
  (increment-stat "total-bots" u1)
)

;; Convenience: track a new wallet
(define-public (track-new-wallet)
  (increment-stat "total-wallets" u1)
)

;; Convenience: track sBTC payment volume
(define-public (track-sbtc-payment (amount uint))
  (begin
    (try! (increment-stat "total-sbtc-volume" amount))
    (increment-stat "total-payments" u1)
  )
)

;; Convenience: track USDCx stream volume
(define-public (track-usdcx-stream (amount uint))
  (begin
    (try! (increment-stat "total-usdcx-volume" amount))
    (increment-stat "total-streams" u1)
  )
)

;; Convenience: track new developer
(define-public (track-new-developer)
  (increment-stat "total-developers" u1)
)

;; ── Read-Only Functions ──────────────────────────────────────

(define-read-only (get-stat (name (string-ascii 64)))
  (default-to {value: u0} (map-get? global-stats {stat-name: name}))
)

(define-read-only (get-ecosystem-summary)
  {
    total-bots: (get value (get-stat "total-bots")),
    total-wallets: (get value (get-stat "total-wallets")),
    total-sbtc-volume: (get value (get-stat "total-sbtc-volume")),
    total-usdcx-volume: (get value (get-stat "total-usdcx-volume")),
    total-payments: (get value (get-stat "total-payments")),
    total-streams: (get value (get-stat "total-streams")),
    total-developers: (get value (get-stat "total-developers"))
  }
)
