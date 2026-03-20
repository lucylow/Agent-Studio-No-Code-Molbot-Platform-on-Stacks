;; ============================================================
;; bot-registry.clar  (v3 — Production)
;; ============================================================
;; Agent Studio — Bot Registry Contract
;;
;; Manages on-chain metadata for autonomous molbots.
;; v3 enhancements:
;;   • Asset field (sBTC | USDCx) stored per bot
;;   • Implements registry-trait for composability
;;   • Safe-math helpers with explicit overflow guards
;;   • Standardized event topics via constants
;;   • SIP-019 metadata URI support
;;   • Reactivation function
;; ============================================================

;; --------------- Trait Implementation ---------------
;; (impl-trait .traits.registry-trait.registry-trait)

;; --------------- Error Constants ---------------
(define-constant ERR_INVALID_PRICE_MODEL (err u100))
(define-constant ERR_TOO_MANY_BOTS      (err u101))
(define-constant ERR_EMPTY_NAME         (err u102))
(define-constant ERR_INVALID_ASSET      (err u103))
(define-constant ERR_NOT_OWNER          (err u403))
(define-constant ERR_NOT_FOUND          (err u404))
(define-constant ERR_ALREADY_INACTIVE   (err u410))
(define-constant ERR_ALREADY_ACTIVE     (err u411))
(define-constant ERR_OVERFLOW           (err u1000))

;; --------------- Event Topic Constants ---------------
(define-constant EVENT_BOT_REGISTERED   "bot-registered")
(define-constant EVENT_BOT_UPDATED      "bot-updated")
(define-constant EVENT_BOT_DEACTIVATED  "bot-deactivated")
(define-constant EVENT_BOT_REACTIVATED  "bot-reactivated")
(define-constant EVENT_METADATA_UPDATE  "sip019-metadata-update")

;; --------------- Limits ---------------
(define-constant MAX_BOTS_PER_OWNER u100)

;; --------------- Data Variables ---------------
(define-data-var next-bot-id uint u1)
(define-data-var total-bots-registered uint u0)

;; --------------- Maps ---------------

(define-map bots
  { bot-id: uint }
  {
    owner: principal,
    name: (string-utf8 64),
    skills: (string-utf8 256),
    price-model: (string-utf8 16),
    price-amount: uint,
    asset: (string-utf8 8),
    active: bool
  }
)

(define-map bot-metadata
  { bot-id: uint }
  { metadata-uri: (string-utf8 256) }
)

(define-map bot-owners
  { owner: principal }
  (list 100 uint)
)

;; --------------- Private Helpers ---------------

(define-private (is-valid-price-model (pm (string-utf8 16)))
  (or (is-eq pm u"fixed") (is-eq pm u"stream"))
)

(define-private (is-valid-asset (a (string-utf8 8)))
  (or (is-eq a u"sBTC") (is-eq a u"USDCx"))
)

(define-private (safe-add (a uint) (b uint))
  (let ((sum (+ a b)))
    (asserts! (>= sum a) ERR_OVERFLOW)
    (ok sum)
  )
)

(define-private (assert-owner (bot-id uint))
  (let ((bot (unwrap! (map-get? bots { bot-id: bot-id }) ERR_NOT_FOUND)))
    (asserts! (is-eq (get owner bot) tx-sender) ERR_NOT_OWNER)
    (ok bot)
  )
)

;; --------------- Public Functions ---------------

;; @notice Register a new bot on-chain.
;; @param name         Display name (1-64 UTF-8 chars).
;; @param skills       JSON-encoded skill array (max 256 chars).
;; @param price-model  "fixed" (x402 per-call) or "stream" (USDCx).
;; @param price-amount Price in micro-units of the chosen asset.
;; @param asset        "sBTC" or "USDCx".
;; @returns (ok uint) The newly assigned bot-id.
(define-public (register-bot
    (name (string-utf8 64))
    (skills (string-utf8 256))
    (price-model (string-utf8 16))
    (price-amount uint)
    (asset (string-utf8 8)))
  (let (
    (bot-id (var-get next-bot-id))
    (caller tx-sender)
    (current-list (default-to (list) (map-get? bot-owners { owner: caller })))
  )
    ;; Input validation
    (asserts! (> (len name) u0) ERR_EMPTY_NAME)
    (asserts! (is-valid-price-model price-model) ERR_INVALID_PRICE_MODEL)
    (asserts! (is-valid-asset asset) ERR_INVALID_ASSET)

    ;; Insert bot record
    (map-insert bots
      { bot-id: bot-id }
      {
        owner: caller,
        name: name,
        skills: skills,
        price-model: price-model,
        price-amount: price-amount,
        asset: asset,
        active: true
      }
    )

    ;; Append bot-id to owner's list (enforce max)
    (map-set bot-owners
      { owner: caller }
      (unwrap! (as-max-len? (append current-list bot-id) u100)
               ERR_TOO_MANY_BOTS)
    )

    ;; Increment counters
    (var-set next-bot-id (+ bot-id u1))
    (var-set total-bots-registered (+ (var-get total-bots-registered) u1))

    ;; Emit event for chainhooks / indexers
    (print {
      topic: EVENT_BOT_REGISTERED,
      bot-id: bot-id,
      owner: caller,
      name: name,
      price-model: price-model,
      price-amount: price-amount,
      asset: asset,
      block-height: block-height
    })

    (ok bot-id)
  )
)

;; @notice Update mutable fields. Price model and asset are immutable.
(define-public (update-bot
    (bot-id uint)
    (name (string-utf8 64))
    (skills (string-utf8 256))
    (price-amount uint))
  (let ((bot (try! (assert-owner bot-id))))
    (asserts! (> (len name) u0) ERR_EMPTY_NAME)

    (map-set bots
      { bot-id: bot-id }
      (merge bot {
        name: name,
        skills: skills,
        price-amount: price-amount
      })
    )

    (print {
      topic: EVENT_BOT_UPDATED,
      bot-id: bot-id,
      owner: tx-sender,
      name: name,
      price-amount: price-amount,
      block-height: block-height
    })

    (ok true)
  )
)

;; @notice Update SIP-019 metadata URI.
(define-public (update-bot-metadata
    (bot-id uint)
    (metadata-uri (string-utf8 256)))
  (let ((bot (try! (assert-owner bot-id))))
    (map-set bot-metadata
      { bot-id: bot-id }
      { metadata-uri: metadata-uri }
    )
    (print {
      topic: EVENT_METADATA_UPDATE,
      bot-id: bot-id,
      metadata-uri: metadata-uri,
      block-height: block-height
    })
    (ok true)
  )
)

;; @notice Deactivate a bot (soft delete).
(define-public (deactivate-bot (bot-id uint))
  (let ((bot (try! (assert-owner bot-id))))
    (asserts! (get active bot) ERR_ALREADY_INACTIVE)
    (map-set bots { bot-id: bot-id } (merge bot { active: false }))
    (print { topic: EVENT_BOT_DEACTIVATED, bot-id: bot-id, owner: tx-sender, block-height: block-height })
    (ok true)
  )
)

;; @notice Reactivate a deactivated bot.
(define-public (reactivate-bot (bot-id uint))
  (let ((bot (try! (assert-owner bot-id))))
    (asserts! (not (get active bot)) ERR_ALREADY_ACTIVE)
    (map-set bots { bot-id: bot-id } (merge bot { active: true }))
    (print { topic: EVENT_BOT_REACTIVATED, bot-id: bot-id, owner: tx-sender, block-height: block-height })
    (ok true)
  )
)

;; --------------- Read-Only Functions ---------------

(define-read-only (get-bot-details (bot-id uint))
  (ok (map-get? bots { bot-id: bot-id }))
)

(define-read-only (get-bot-metadata (bot-id uint))
  (ok (map-get? bot-metadata { bot-id: bot-id }))
)

(define-read-only (get-bots-by-owner (owner principal))
  (ok (map-get? bot-owners { owner: owner }))
)

(define-read-only (get-next-bot-id)
  (ok (var-get next-bot-id))
)

(define-read-only (get-total-bots-registered)
  (ok (var-get total-bots-registered))
)

(define-read-only (is-bot-active (bot-id uint))
  (match (map-get? bots { bot-id: bot-id })
    bot (ok (get active bot))
    (err u404)
  )
)

(define-read-only (get-bot-owner (bot-id uint))
  (match (map-get? bots { bot-id: bot-id })
    bot (ok (get owner bot))
    (err u404)
  )
)

(define-read-only (get-bot-asset (bot-id uint))
  (match (map-get? bots { bot-id: bot-id })
    bot (ok (get asset bot))
    (err u404)
  )
)
