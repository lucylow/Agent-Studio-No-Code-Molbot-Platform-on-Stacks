;; ============================================================
;; traits/payment-trait.clar
;; ============================================================
;; Defines a composable interface for payment routing.
;; Enables swapping payment implementations (x402, direct, etc.)
;; without modifying consumer contracts.
;; ============================================================

(define-trait payment-trait
  (
    ;; Send a payment from sender to receiver for a given amount.
    ;; The token parameter allows supporting multiple SIP-010 assets.
    (send-payment
      (principal principal uint)
      (response bool uint))
  )
)
