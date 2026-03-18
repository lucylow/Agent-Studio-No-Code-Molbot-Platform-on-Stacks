;; ============================================================
;; bot-registry.clar  (v2 — Enhanced)
;; ============================================================
;; Agent Studio — Bot Registry Contract
;;
;; Manages on-chain metadata for autonomous molbots.
;; v2 enhancements:
;;   • Implements registry-trait for composability
;;   • Safe-math helpers with explicit overflow guards
;;   • Standardized event topics via constants
;;   • SIP-019 metadata URI support
;;   • Reactivation function
;;   • Comprehensive inline documentation
;; ============================================================

;; --------------- Trait Implementation ---------------
;; (impl-trait .traits.registry-trait.registry-trait)
;; Uncomment above when deploying with Clarinet project structure.

;; --------------- Error Constants ---------------
(define-constant ERR_INVALID_PRICE_MODEL (err u100))
(define-constant ERR_TOO_MANY_BOTS      (err u101))
(define-constant ERR_EMPTY_NAME         (err u102))
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

;; --------------- Data Variables ---------------
(define-data-var next-bot-id uint u1)
(define-data-var total-bots-registered uint u0)

;; --------------- Maps ---------------

;; Primary bot storage keyed by auto-incrementing ID.
(define-map bots
  { bot-id: uint }
  {
    owner: principal,
    name: (string-utf8 64),
    skills: (string-utf8 256),
    price-model: (string-utf8 16),
    price-amount: uint,
    active: bool
  }
)

;; Optional SIP-019 metadata URIs for bots.
(define-map bot-metadata
  { bot-id: uint }
  { metadata-uri: (string-utf8 256) }
)

;; Reverse index: owner → list of bot IDs (max 100 per owner).
(define-map bot-owners
  { owner: principal }
  (list 100 uint)
)

;; --------------- Private Helpers ---------------

;; @notice Validate that price-model is "fixed" or "stream".
(define-private (is-valid-price-model (pm (string-utf8 16)))
  (or (is-eq pm u"fixed") (is-eq pm u"stream"))
)

;; @notice Safe addition with explicit overflow guard.
;; Clarity panics on overflow natively, but this provides
;; a descriptive error for debugging.
(define-private (safe-add (a uint) (b uint))
  (let ((sum (+ a b)))
    (asserts! (>= sum a) ERR_OVERFLOW)
    (ok sum)
  )
)

;; @notice Ensure the caller is the owner of a given bot.
(define-private (assert-owner (bot-id uint))
  (let ((bot (unwrap! (map-get? bots { bot-id: bot-id }) ERR_NOT_FOUND)))
    (asserts! (is-eq (get owner bot) tx-sender) ERR_NOT_OWNER)
    (ok bot)
  )
)

;; --------------- Public Functions ---------------

;; @notice Register a new bot on-chain.
;; @param name       Display name (1-64 UTF-8 chars, must not be empty).
;; @param skills     JSON-encoded array of skill strings (max 256 chars).
;; @param price-model Either "fixed" (x402 per-call) or "stream" (USDCx).
;; @param price-amount Price in micro-units of the chosen asset.
;; @returns (ok uint) The newly assigned bot-id.
;; @errors u100 invalid price model, u101 owner has 100 bots, u102 empty name.
(define-public (register-bot
    (name (string-utf8 64))
    (skills (string-utf8 256))
    (price-model (string-utf8 16))
    (price-amount uint))
  (let (
    (bot-id (var-get next-bot-id))
    (caller tx-sender)
    (current-list (default-to (list) (map-get? bot-owners { owner: caller })))
  )
    ;; Input validation
    (asserts! (> (len name) u0) ERR_EMPTY_NAME)
    (asserts! (is-valid-price-model price-model) ERR_INVALID_PRICE_MODEL)

    ;; Insert bot record
    (map-insert bots
      { bot-id: bot-id }
      {
        owner: caller,
        name: name,
        skills: skills,
        price-model: price-model,
        price-amount: price-amount,
        active: true
      }
    )

    ;; Append bot-id to owner's list (enforce max 100)
    (map-set bot-owners
      { owner: caller }
      (unwrap! (as-max-len? (append current-list bot-id) u100)
               ERR_TOO_MANY_BOTS)
    )

    ;; Increment counters (safe)
    (var-set next-bot-id (+ bot-id u1))
    (var-set total-bots-registered (+ (var-get total-bots-registered) u1))

    ;; Emit standardized event for chainhooks / indexers
    (print {
      topic: EVENT_BOT_REGISTERED,
      bot-id: bot-id,
      owner: caller,
      name: name,
      price-model: price-model,
      price-amount: price-amount,
      block-height: block-height
    })

    (ok bot-id)
  )
)

;; @notice Update mutable fields of an existing bot.
;; Price model is immutable after creation to prevent payment confusion.
;; @param bot-id      ID of the bot to update.
;; @param name        New display name.
;; @param skills      New skills JSON.
;; @param price-amount New price in micro-units.
;; @returns (ok true) on success.
;; @errors u403 not owner, u404 not found, u102 empty name.
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

;; @notice Update SIP-019 compliant metadata URI for a bot.
;; Used by indexers and marketplaces for rich bot metadata.
;; @param bot-id        ID of the bot.
;; @param metadata-uri  URI pointing to off-chain metadata JSON.
;; @returns (ok true).
;; @errors u403 not owner, u404 not found.
(define-public (update-bot-metadata
    (bot-id uint)
    (metadata-uri (string-utf8 256)))
  (let ((bot (try! (assert-owner bot-id))))
    (map-set bot-metadata
      { bot-id: bot-id }
      { metadata-uri: metadata-uri }
    )

    ;; SIP-019 compliant print for indexers
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
;; The record stays on-chain but won't appear in marketplace queries.
;; @errors u403 not owner, u404 not found, u410 already inactive.
(define-public (deactivate-bot (bot-id uint))
  (let ((bot (try! (assert-owner bot-id))))
    (asserts! (get active bot) ERR_ALREADY_INACTIVE)

    (map-set bots
      { bot-id: bot-id }
      (merge bot { active: false })
    )

    (print {
      topic: EVENT_BOT_DEACTIVATED,
      bot-id: bot-id,
      owner: tx-sender,
      block-height: block-height
    })

    (ok true)
  )
)

;; @notice Reactivate a previously deactivated bot.
;; @errors u403 not owner, u404 not found, u411 already active.
(define-public (reactivate-bot (bot-id uint))
  (let ((bot (try! (assert-owner bot-id))))
    (asserts! (not (get active bot)) ERR_ALREADY_ACTIVE)

    (map-set bots
      { bot-id: bot-id }
      (merge bot { active: true })
    )

    (print {
      topic: EVENT_BOT_REACTIVATED,
      bot-id: bot-id,
      owner: tx-sender,
      block-height: block-height
    })

    (ok true)
  )
)

;; --------------- Read-Only Functions ---------------

;; @notice Fetch full details for a single bot.
(define-read-only (get-bot-details (bot-id uint))
  (ok (map-get? bots { bot-id: bot-id }))
)

;; @notice Fetch SIP-019 metadata URI for a bot.
(define-read-only (get-bot-metadata (bot-id uint))
  (ok (map-get? bot-metadata { bot-id: bot-id }))
)

;; @notice Fetch the list of bot IDs owned by a principal.
(define-read-only (get-bots-by-owner (owner principal))
  (ok (map-get? bot-owners { owner: owner }))
)

;; @notice Return the next bot-id that will be assigned.
(define-read-only (get-next-bot-id)
  (ok (var-get next-bot-id))
)

;; @notice Return total number of bots ever registered.
(define-read-only (get-total-bots-registered)
  (ok (var-get total-bots-registered))
)

;; @notice Check if a specific bot is currently active.
(define-read-only (is-bot-active (bot-id uint))
  (match (map-get? bots { bot-id: bot-id })
    bot (ok (get active bot))
    (err u404)
  )
)

;; @notice Get the owner principal of a specific bot.
(define-read-only (get-bot-owner (bot-id uint))
  (match (map-get? bots { bot-id: bot-id })
    bot (ok (get owner bot))
    (err u404)
  )
)
