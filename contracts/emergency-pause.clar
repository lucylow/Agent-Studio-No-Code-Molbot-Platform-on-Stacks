;; ============================================================
;; emergency-pause.clar — Global Circuit Breaker
;; ============================================================
;; Central emergency pause for the Agent Studio contract suite.
;; Multi-admin support with event logging for audit trail.
;; ============================================================

;; --------------- Error Constants ---------------
(define-constant ERR_NOT_ADMIN (err u1001))
(define-constant ERR_ALREADY_PAUSED (err u1002))
(define-constant ERR_NOT_PAUSED (err u1003))

;; --------------- Admin ---------------
(define-constant CONTRACT_OWNER tx-sender)
(define-map admins principal bool)

;; --------------- State ---------------
(define-data-var global-paused bool false)
(define-data-var pause-count uint u0)
(define-data-var last-pause-block uint u0)

;; --------------- Helpers ---------------
(define-private (is-admin)
  (or (is-eq tx-sender CONTRACT_OWNER)
      (default-to false (map-get? admins tx-sender)))
)

;; --------------- Public Functions ---------------

(define-public (pause-all)
  (begin
    (asserts! (is-admin) ERR_NOT_ADMIN)
    (asserts! (not (var-get global-paused)) ERR_ALREADY_PAUSED)
    (var-set global-paused true)
    (var-set pause-count (+ (var-get pause-count) u1))
    (var-set last-pause-block block-height)
    (print {
      topic: "emergency-pause",
      action: "paused",
      admin: tx-sender,
      pause-count: (var-get pause-count),
      block-height: block-height
    })
    (ok true)
  )
)

(define-public (unpause-all)
  (begin
    (asserts! (is-admin) ERR_NOT_ADMIN)
    (asserts! (var-get global-paused) ERR_NOT_PAUSED)
    (var-set global-paused false)
    (print {
      topic: "emergency-pause",
      action: "unpaused",
      admin: tx-sender,
      block-height: block-height
    })
    (ok true)
  )
)

(define-public (add-admin (admin principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_ADMIN)
    (map-set admins admin true)
    (print { topic: "admin-added", admin: admin, block-height: block-height })
    (ok true)
  )
)

(define-public (remove-admin (admin principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_ADMIN)
    (map-delete admins admin)
    (print { topic: "admin-removed", admin: admin, block-height: block-height })
    (ok true)
  )
)

;; --------------- Read-Only ---------------

(define-read-only (is-paused)
  (var-get global-paused)
)

(define-read-only (get-pause-stats)
  (ok {
    paused: (var-get global-paused),
    total-pauses: (var-get pause-count),
    last-pause-block: (var-get last-pause-block)
  })
)

(define-read-only (is-authorized (who principal))
  (or (is-eq who CONTRACT_OWNER)
      (default-to false (map-get? admins who)))
)
