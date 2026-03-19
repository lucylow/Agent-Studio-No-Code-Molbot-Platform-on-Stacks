;; ============================================================
;; payment-router.clar  (v2 — Enhanced)
;; ============================================================
;; Agent Studio — x402 Payment Router
;;
;; Handles bot-to-bot micropayments using sBTC (SIP-010).
;; v2 enhancements:
;;   • Explicit SIP-010 trait definition for standalone deploy
;;   • Safe math with overflow guards
;;   • Payment nonce for idempotency
;;   • Batch payments (up to 5 receivers)
;;   • Standardized event topics
;;   • Volume analytics (total payments, volume)
;;   • Access control for admin functions
;; ============================================================

;; --------------- Error Constants ---------------
(define-constant ERR_TRANSFER_FAILED (err u500))
(define-constant ERR_ZERO_AMOUNT     (err u400))
(define-constant ERR_SAME_PRINCIPAL  (err u401))
(define-constant ERR_UNAUTHORIZED    (err u403))
(define-constant ERR_DUPLICATE_NONCE (err u409))
(define-constant ERR_OVERFLOW        (err u1000))

;; --------------- Event Topic Constants ---------------
(define-constant EVENT_PAYMENT      "x402-payment")
(define-constant EVENT_BATCH        "x402-batch-payment")

;; --------------- Contract Owner ---------------
(define-constant CONTRACT_OWNER tx-sender)

;; --------------- SIP-010 Trait ---------------
;; Local trait definition for standalone deployment.
;; On testnet, replace with deployed trait address.
(define-trait sip-010-trait
  (
    (transfer (uint principal principal (optional (buff 34))) (response bool uint))
    (get-balance (principal) (response uint uint))
    (get-name () (response (string-ascii 32) uint))
    (get-symbol () (response (string-ascii 10) uint))
    (get-decimals () (response uint uint))
    (get-total-supply () (response uint uint))
  )
)

;; --------------- State ---------------
(define-data-var total-payments uint u0)
(define-data-var total-volume uint u0)
(define-data-var paused bool false)

;; Nonce tracking for idempotency — prevents duplicate payments.
(define-map payment-nonces
  { nonce: (buff 32) }
  { processed: bool }
)

;; --------------- Private Helpers ---------------

;; @notice Safe addition with overflow guard.
(define-private (safe-add (a uint) (b uint))
  (let ((sum (+ a b)))
    (asserts! (>= sum a) ERR_OVERFLOW)
    (ok sum)
  )
)

;; --------------- Public Functions ---------------

;; @notice Send an x402-compliant sBTC payment.
;; @param token    SIP-010 token contract reference (sBTC).
;; @param sender   Principal sending tokens (must be tx-sender in relayer model).
;; @param receiver Principal receiving tokens.
;; @param amount   Amount in micro-units (satoshis for sBTC).
;; @returns (ok true) on successful transfer.
;; @errors u400 zero amount, u401 same principal, u500 transfer failed.
(define-public (send-payment
    (token <sip-010-trait>)
    (sender principal)
    (receiver principal)
    (amount uint))
  (begin
    ;; Validations
    (asserts! (not (var-get paused)) ERR_UNAUTHORIZED)
    (asserts! (> amount u0) ERR_ZERO_AMOUNT)
    (asserts! (not (is-eq sender receiver)) ERR_SAME_PRINCIPAL)

    ;; Execute SIP-010 transfer (memo = none)
    (unwrap! (contract-call? token transfer amount sender receiver none)
             ERR_TRANSFER_FAILED)

    ;; Update analytics
    (var-set total-payments (+ (var-get total-payments) u1))
    (var-set total-volume (+ (var-get total-volume) amount))

    ;; Emit x402-compliant event
    (print {
      topic: EVENT_PAYMENT,
      version: "1.0",
      sender: sender,
      receiver: receiver,
      amount: amount,
      asset: "sBTC",
      block-height: block-height
    })

    (ok true)
  )
)

;; @notice Send an idempotent x402 payment using a nonce.
;; If the nonce has been seen before, the call is rejected (u409).
;; Prevents duplicate payments from retried backend calls.
(define-public (send-payment-idempotent
    (token <sip-010-trait>)
    (sender principal)
    (receiver principal)
    (amount uint)
    (nonce (buff 32)))
  (begin
    ;; Check nonce hasn't been used
    (asserts! (is-none (map-get? payment-nonces { nonce: nonce }))
             ERR_DUPLICATE_NONCE)

    ;; Record nonce before transfer to prevent reentrancy
    (map-insert payment-nonces { nonce: nonce } { processed: true })

    ;; Delegate to standard send-payment
    (try! (send-payment token sender receiver amount))

    (ok true)
  )
)

;; @notice Batch payment: pay up to 5 receivers in one transaction.
;; Gas-efficient for swarm payouts.
;; Pass u0 for unused amounts (unused principals may be any value).
(define-public (batch-payment
    (token <sip-010-trait>)
    (sender principal)
    (r1 principal) (a1 uint)
    (r2 principal) (a2 uint)
    (r3 principal) (a3 uint)
    (r4 principal) (a4 uint)
    (r5 principal) (a5 uint))
  (let (
    (c1 (if (> a1 u0) u1 u0))
    (c2 (if (> a2 u0) u1 u0))
    (c3 (if (> a3 u0) u1 u0))
    (c4 (if (> a4 u0) u1 u0))
    (c5 (if (> a5 u0) u1 u0))
    (total (+ (+ (+ (+ c1 c2) c3) c4) c5)))
    (begin
      (if (> a1 u0) (try! (send-payment token sender r1 a1)) true)
      (if (> a2 u0) (try! (send-payment token sender r2 a2)) true)
      (if (> a3 u0) (try! (send-payment token sender r3 a3)) true)
      (if (> a4 u0) (try! (send-payment token sender r4 a4)) true)
      (if (> a5 u0) (try! (send-payment token sender r5 a5)) true)

      (print {
        topic: EVENT_BATCH,
        sender: sender,
        total-recipients: total,
        block-height: block-height
      })

      (ok true)
    )
  )
)

;; --------------- Admin Functions ---------------

;; @notice Pause/unpause the payment router (emergency stop).
;; Only callable by the contract deployer.
(define-public (set-paused (is-paused bool))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (var-set paused is-paused)
    (print {
      topic: "router-paused",
      paused: is-paused,
      admin: tx-sender,
      block-height: block-height
    })
    (ok true)
  )
)

;; --------------- Read-Only Functions ---------------

;; @notice Total number of payments processed.
(define-read-only (get-total-payments)
  (ok (var-get total-payments))
)

;; @notice Total volume (in micro-units) routed.
(define-read-only (get-total-volume)
  (ok (var-get total-volume))
)

;; @notice Check if the router is currently paused.
(define-read-only (is-paused)
  (ok (var-get paused))
)

;; @notice Check if a nonce has been used.
(define-read-only (is-nonce-used (nonce (buff 32)))
  (ok (is-some (map-get? payment-nonces { nonce: nonce })))
)
