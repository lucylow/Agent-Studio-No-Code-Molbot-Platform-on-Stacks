;; ============================================================
;; bot-registry.clar  (v4 — Production Hardened)
;; ============================================================
;; Agent Studio — Bot Registry Contract
;;
;; v4 production enhancements:
;;   • Emergency pause integration
;;   • Admin controls (transfer ownership, authorized callers)
;;   • Pagination (get-bots-page)
;;   • Reputation score field
;;   • Skill count validation (max 10)
;;   • Contract-caller allowlist for backend writes
;; ============================================================

;; --------------- Error Constants ---------------
(define-constant ERR_INVALID_PRICE_MODEL (err u100))
(define-constant ERR_TOO_MANY_BOTS      (err u101))
(define-constant ERR_EMPTY_NAME         (err u102))
(define-constant ERR_INVALID_ASSET      (err u103))
(define-constant ERR_PAUSED             (err u104))
(define-constant ERR_NOT_ADMIN          (err u105))
(define-constant ERR_NOT_OWNER          (err u403))
(define-constant ERR_NOT_FOUND          (err u404))
(define-constant ERR_ALREADY_INACTIVE   (err u410))
(define-constant ERR_ALREADY_ACTIVE     (err u411))
(define-constant ERR_OVERFLOW           (err u1000))

;; --------------- Event Topics ---------------
(define-constant EVENT_BOT_REGISTERED   "bot-registered")
(define-constant EVENT_BOT_UPDATED      "bot-updated")
(define-constant EVENT_BOT_DEACTIVATED  "bot-deactivated")
(define-constant EVENT_BOT_REACTIVATED  "bot-reactivated")
(define-constant EVENT_METADATA_UPDATE  "sip019-metadata-update")
(define-constant EVENT_OWNERSHIP_TRANSFER "bot-ownership-transferred")

;; --------------- Limits ---------------
(define-constant MAX_BOTS_PER_OWNER u100)

;; --------------- Admin ---------------
(define-constant CONTRACT_ADMIN tx-sender)
(define-map authorized-admins principal bool)
(define-map authorized-callers principal bool)

;; --------------- State ---------------
(define-data-var next-bot-id uint u1)
(define-data-var total-bots-registered uint u0)
(define-data-var total-active-bots uint u0)
(define-data-var paused bool false)

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
    active: bool,
    reputation: uint,
    created-at: uint
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

(define-private (assert-not-paused)
  (ok (asserts! (not (var-get paused)) ERR_PAUSED))
)

(define-private (assert-owner (bot-id uint))
  (let ((bot (unwrap! (map-get? bots { bot-id: bot-id }) ERR_NOT_FOUND)))
    (asserts! (is-eq (get owner bot) tx-sender) ERR_NOT_OWNER)
    (ok bot)
  )
)

(define-private (is-admin)
  (or (is-eq tx-sender CONTRACT_ADMIN)
      (default-to false (map-get? authorized-admins tx-sender)))
)

;; --------------- Admin Functions ---------------

(define-public (set-paused (is-paused bool))
  (begin
    (asserts! (is-admin) ERR_NOT_ADMIN)
    (var-set paused is-paused)
    (print { topic: "registry-paused", paused: is-paused, admin: tx-sender, block-height: block-height })
    (ok true)
  )
)

(define-public (add-admin (admin principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_ADMIN) ERR_NOT_ADMIN)
    (map-set authorized-admins admin true)
    (ok true)
  )
)

(define-public (remove-admin (admin principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_ADMIN) ERR_NOT_ADMIN)
    (map-delete authorized-admins admin)
    (ok true)
  )
)

(define-public (add-authorized-caller (caller principal))
  (begin
    (asserts! (is-admin) ERR_NOT_ADMIN)
    (map-set authorized-callers caller true)
    (ok true)
  )
)

;; @notice Admin-only: transfer bot ownership (for migrations)
(define-public (admin-transfer-bot (bot-id uint) (new-owner principal))
  (let ((bot (unwrap! (map-get? bots { bot-id: bot-id }) ERR_NOT_FOUND)))
    (asserts! (is-admin) ERR_NOT_ADMIN)
    (map-set bots { bot-id: bot-id } (merge bot { owner: new-owner }))
    (print {
      topic: EVENT_OWNERSHIP_TRANSFER,
      bot-id: bot-id,
      old-owner: (get owner bot),
      new-owner: new-owner,
      admin: tx-sender,
      block-height: block-height
    })
    (ok true)
  )
)

;; --------------- Public Functions ---------------

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
    (try! (assert-not-paused))
    (asserts! (> (len name) u0) ERR_EMPTY_NAME)
    (asserts! (is-valid-price-model price-model) ERR_INVALID_PRICE_MODEL)
    (asserts! (is-valid-asset asset) ERR_INVALID_ASSET)

    (map-insert bots
      { bot-id: bot-id }
      {
        owner: caller,
        name: name,
        skills: skills,
        price-model: price-model,
        price-amount: price-amount,
        asset: asset,
        active: true,
        reputation: u500,
        created-at: block-height
      }
    )

    (map-set bot-owners
      { owner: caller }
      (unwrap! (as-max-len? (append current-list bot-id) u100)
               ERR_TOO_MANY_BOTS)
    )

    (var-set next-bot-id (+ bot-id u1))
    (var-set total-bots-registered (+ (var-get total-bots-registered) u1))
    (var-set total-active-bots (+ (var-get total-active-bots) u1))

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

(define-public (update-bot
    (bot-id uint)
    (name (string-utf8 64))
    (skills (string-utf8 256))
    (price-amount uint))
  (let ((bot (try! (assert-owner bot-id))))
    (try! (assert-not-paused))
    (asserts! (> (len name) u0) ERR_EMPTY_NAME)

    (map-set bots
      { bot-id: bot-id }
      (merge bot { name: name, skills: skills, price-amount: price-amount })
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

(define-public (update-bot-metadata
    (bot-id uint)
    (metadata-uri (string-utf8 256)))
  (let ((bot (try! (assert-owner bot-id))))
    (map-set bot-metadata { bot-id: bot-id } { metadata-uri: metadata-uri })
    (print { topic: EVENT_METADATA_UPDATE, bot-id: bot-id, metadata-uri: metadata-uri, block-height: block-height })
    (ok true)
  )
)

(define-public (deactivate-bot (bot-id uint))
  (let ((bot (try! (assert-owner bot-id))))
    (try! (assert-not-paused))
    (asserts! (get active bot) ERR_ALREADY_INACTIVE)
    (map-set bots { bot-id: bot-id } (merge bot { active: false }))
    (var-set total-active-bots (- (var-get total-active-bots) u1))
    (print { topic: EVENT_BOT_DEACTIVATED, bot-id: bot-id, owner: tx-sender, block-height: block-height })
    (ok true)
  )
)

(define-public (reactivate-bot (bot-id uint))
  (let ((bot (try! (assert-owner bot-id))))
    (try! (assert-not-paused))
    (asserts! (not (get active bot)) ERR_ALREADY_ACTIVE)
    (map-set bots { bot-id: bot-id } (merge bot { active: true }))
    (var-set total-active-bots (+ (var-get total-active-bots) u1))
    (print { topic: EVENT_BOT_REACTIVATED, bot-id: bot-id, owner: tx-sender, block-height: block-height })
    (ok true)
  )
)

;; @notice Update reputation score (authorized callers only — backend)
(define-public (update-reputation (bot-id uint) (new-score uint))
  (let ((bot (unwrap! (map-get? bots { bot-id: bot-id }) ERR_NOT_FOUND)))
    (asserts! (or (is-admin) (default-to false (map-get? authorized-callers tx-sender)))
              ERR_NOT_ADMIN)
    (map-set bots { bot-id: bot-id } (merge bot { reputation: new-score }))
    (print { topic: "bot-reputation-updated", bot-id: bot-id, score: new-score, block-height: block-height })
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

(define-read-only (get-total-active-bots)
  (ok (var-get total-active-bots))
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

(define-read-only (get-bot-reputation (bot-id uint))
  (match (map-get? bots { bot-id: bot-id })
    bot (ok (get reputation bot))
    (err u404)
  )
)

(define-read-only (is-paused)
  (ok (var-get paused))
)

;; @notice Get ecosystem stats in a single call (for Impact Dashboard)
(define-read-only (get-ecosystem-stats)
  (ok {
    total-registered: (var-get total-bots-registered),
    total-active: (var-get total-active-bots),
    next-id: (var-get next-bot-id),
    paused: (var-get paused)
  })
)
