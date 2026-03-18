;; ============================================================
;; skill-bot.clar
;; ============================================================
;; Agent Studio — x402-Powered Skill Bot Template
;;
;; A composable template for specialized skill bots that charge
;; via x402 using USDCx. Each skill bot has a configurable
;; per-request price and emits structured events for off-chain
;; processing by the backend worker.
;;
;; Flow:
;;   1. Owner configures bot with a USDCx price-per-request
;;   2. Requester pays via payment-router (x402)
;;   3. Backend calls process-request after payment confirmed
;;   4. Contract emits skill-request event
;;   5. Backend processes work and delivers result
;; ============================================================

;; --------------- Error Constants ---------------
(define-constant ERR_NOT_OWNER           (err u100))
(define-constant ERR_INSUFFICIENT_PAYMENT (err u101))
(define-constant ERR_EMPTY_HASH          (err u102))
(define-constant ERR_NOT_ACTIVE          (err u403))
(define-constant ERR_NOT_FOUND           (err u404))
(define-constant ERR_ALREADY_CONFIGURED  (err u409))
(define-constant ERR_DUPLICATE_REQUEST   (err u410))

;; --------------- Event Topics ---------------
(define-constant EVENT_BOT_CONFIGURED "skill-bot-configured")
(define-constant EVENT_SKILL_REQUEST  "skill-request")
(define-constant EVENT_SKILL_COMPLETE "skill-complete")

;; --------------- Contract Owner ---------------
(define-constant CONTRACT_OWNER tx-sender)

;; --------------- Data Variables ---------------
(define-data-var total-requests uint u0)
(define-data-var total-revenue uint u0)

;; --------------- Maps ---------------

;; Per-bot configuration
(define-map bot-config
  { bot-id: uint }
  {
    owner: principal,
    price-per-request: uint,
    active: bool,
    total-served: uint
  }
)

;; Request tracking for idempotency
(define-map requests
  { request-hash: (string-utf8 64) }
  {
    bot-id: uint,
    requester: principal,
    processed: bool,
    block-height: uint
  }
)

;; --------------- Public Functions ---------------

;; @notice Configure a skill bot with a USDCx price per request.
;; @param bot-id  The bot's registry ID.
;; @param price   Price per request in USDCx micro-units (6 decimals).
;; @returns (ok true).
;; @errors u100 not contract owner.
(define-public (configure-bot (bot-id uint) (price uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_OWNER)

    (map-set bot-config
      { bot-id: bot-id }
      {
        owner: tx-sender,
        price-per-request: price,
        active: true,
        total-served: u0
      }
    )

    (print {
      topic: EVENT_BOT_CONFIGURED,
      bot-id: bot-id,
      price-per-request: price,
      owner: tx-sender,
      block-height: block-height
    })

    (ok true)
  )
)

;; @notice Update the price of a configured skill bot.
;; @param bot-id  The bot's registry ID.
;; @param price   New price per request in USDCx micro-units.
;; @returns (ok true).
(define-public (update-price (bot-id uint) (price uint))
  (let ((config (unwrap! (map-get? bot-config { bot-id: bot-id }) ERR_NOT_FOUND)))
    (asserts! (is-eq (get owner config) tx-sender) ERR_NOT_OWNER)

    (map-set bot-config
      { bot-id: bot-id }
      (merge config { price-per-request: price })
    )

    (print {
      topic: "skill-price-updated",
      bot-id: bot-id,
      new-price: price,
      block-height: block-height
    })

    (ok true)
  )
)

;; @notice Deactivate a skill bot.
(define-public (deactivate (bot-id uint))
  (let ((config (unwrap! (map-get? bot-config { bot-id: bot-id }) ERR_NOT_FOUND)))
    (asserts! (is-eq (get owner config) tx-sender) ERR_NOT_OWNER)
    (map-set bot-config { bot-id: bot-id } (merge config { active: false }))
    (ok true)
  )
)

;; @notice Process a skill request after x402 payment is confirmed.
;; Called by the backend relayer after verifying payment via payment-router.
;; Uses request-hash as idempotency key to prevent double processing.
;; @param bot-id        The skill bot's ID.
;; @param requester     The principal who paid for the service.
;; @param request-hash  Unique hash identifying this request (SHA256 of prompt).
;; @returns (ok true).
;; @errors u403 bot inactive, u404 bot not found, u410 duplicate request.
(define-public (process-request
    (bot-id uint)
    (requester principal)
    (request-hash (string-utf8 64)))
  (let ((config (unwrap! (map-get? bot-config { bot-id: bot-id }) ERR_NOT_FOUND)))
    ;; Validate
    (asserts! (get active config) ERR_NOT_ACTIVE)
    (asserts! (> (len request-hash) u0) ERR_EMPTY_HASH)
    (asserts! (is-none (map-get? requests { request-hash: request-hash }))
              ERR_DUPLICATE_REQUEST)

    ;; Record request
    (map-insert requests
      { request-hash: request-hash }
      {
        bot-id: bot-id,
        requester: requester,
        processed: true,
        block-height: block-height
      }
    )

    ;; Update stats
    (map-set bot-config { bot-id: bot-id }
      (merge config { total-served: (+ (get total-served config) u1) }))
    (var-set total-requests (+ (var-get total-requests) u1))
    (var-set total-revenue (+ (var-get total-revenue) (get price-per-request config)))

    ;; Emit event for chainhooks / backend
    (print {
      topic: EVENT_SKILL_REQUEST,
      bot-id: bot-id,
      requester: requester,
      request-hash: request-hash,
      price: (get price-per-request config),
      asset: "USDCx",
      protocol: "x402",
      block-height: block-height
    })

    (ok true)
  )
)

;; --------------- Read-Only Functions ---------------

;; @notice Get the price configuration of a skill bot.
(define-read-only (get-price (bot-id uint))
  (ok (map-get? bot-config { bot-id: bot-id }))
)

;; @notice Check if a request hash has been processed.
(define-read-only (is-request-processed (request-hash (string-utf8 64)))
  (ok (is-some (map-get? requests { request-hash: request-hash })))
)

;; @notice Get total requests processed across all skill bots.
(define-read-only (get-total-requests)
  (ok (var-get total-requests))
)

;; @notice Get total revenue generated in USDCx micro-units.
(define-read-only (get-total-revenue)
  (ok (var-get total-revenue))
)
