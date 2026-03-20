;; ============================================================
;; impact-tracker.clar  (v2 — Access Controlled)
;; ============================================================
;; Agent Studio — On-Chain Ecosystem Metrics
;;
;; Tracks bots deployed, sBTC volume, USDCx streamed, developers.
;; Powers the live Impact Dashboard.
;;
;; v2: Added access control — only authorized contracts/backend
;; can increment stats. Read access remains public.
;; ============================================================

;; ── Error Constants ──────────────────────────────────────────
(define-constant ERR_UNAUTHORIZED (err u403))
(define-constant ERR_EMPTY_NAME  (err u400))

;; ── Contract Owner ───────────────────────────────────────────
(define-constant CONTRACT_OWNER tx-sender)

;; ── Data ─────────────────────────────────────────────────────
(define-map global-stats
  { stat-name: (string-ascii 64) }
  { value: uint }
)

;; Allowlist of principals authorized to write stats
(define-map authorized-writers
  { writer: principal }
  { active: bool }
)

;; ── Private Helpers ──────────────────────────────────────────

(define-private (is-authorized)
  (or
    (is-eq tx-sender CONTRACT_OWNER)
    (match (map-get? authorized-writers { writer: tx-sender })
      entry (get active entry)
      false
    )
  )
)

;; ── Admin Functions ──────────────────────────────────────────

;; @notice Add or remove an authorized stat writer.
;; Only contract owner can manage the allowlist.
(define-public (set-authorized-writer (writer principal) (active bool))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (map-set authorized-writers { writer: writer } { active: active })
    (print { topic: "writer-updated", writer: writer, active: active, block-height: block-height })
    (ok true)
  )
)

;; ── Public Functions (Write — Access Controlled) ─────────────

;; @notice Increment a named stat by amount. Restricted to authorized writers.
(define-public (increment-stat (name (string-ascii 64)) (amount uint))
  (begin
    (asserts! (is-authorized) ERR_UNAUTHORIZED)
    (asserts! (> (len name) u0) ERR_EMPTY_NAME)
    (let ((current (default-to { value: u0 } (map-get? global-stats { stat-name: name }))))
      (map-set global-stats { stat-name: name } { value: (+ (get value current) amount) })
      (print {
        topic: "stat-incremented",
        stat: name,
        amount: amount,
        new-value: (+ (get value current) amount),
        block-height: block-height
      })
      (ok true)
    )
  )
)

;; Convenience wrappers — all require authorization
(define-public (track-new-bot)
  (increment-stat "total-bots" u1)
)

(define-public (track-new-wallet)
  (increment-stat "total-wallets" u1)
)

(define-public (track-sbtc-payment (amount uint))
  (begin
    (try! (increment-stat "total-sbtc-volume" amount))
    (increment-stat "total-payments" u1)
  )
)

(define-public (track-usdcx-stream (amount uint))
  (begin
    (try! (increment-stat "total-usdcx-volume" amount))
    (increment-stat "total-streams" u1)
  )
)

(define-public (track-new-developer)
  (increment-stat "total-developers" u1)
)

;; @notice Track daily active users (DAU). Backend calls once per unique
;; user per day.
(define-public (track-daily-active-user)
  (increment-stat "daily-active-users" u1)
)

;; @notice Reset a daily counter (e.g., DAU at midnight UTC).
;; Only contract owner.
(define-public (reset-daily-stat (name (string-ascii 64)))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (map-set global-stats { stat-name: name } { value: u0 })
    (print { topic: "stat-reset", stat: name, block-height: block-height })
    (ok true)
  )
)

;; ── Read-Only Functions (Public) ─────────────────────────────

(define-read-only (get-stat (name (string-ascii 64)))
  (default-to { value: u0 } (map-get? global-stats { stat-name: name }))
)

(define-read-only (get-ecosystem-summary)
  {
    total-bots: (get value (get-stat "total-bots")),
    total-wallets: (get value (get-stat "total-wallets")),
    total-sbtc-volume: (get value (get-stat "total-sbtc-volume")),
    total-usdcx-volume: (get value (get-stat "total-usdcx-volume")),
    total-payments: (get value (get-stat "total-payments")),
    total-streams: (get value (get-stat "total-streams")),
    total-developers: (get value (get-stat "total-developers")),
    daily-active-users: (get value (get-stat "daily-active-users"))
  }
)

(define-read-only (is-writer-authorized (writer principal))
  (match (map-get? authorized-writers { writer: writer })
    entry (get active entry)
    false
  )
)
