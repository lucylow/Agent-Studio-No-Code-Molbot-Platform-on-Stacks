;; ============================================================
;; template-royalties.clar
;; ============================================================
;; Agent Studio — Bot Template Royalty System
;;
;; Creators of bot templates earn long-term royalties every time
;; a bot built from their template generates revenue. This
;; incentivizes high-quality template creation and creates a
;; sustainable marketplace for bot blueprints.
;;
;; Revenue share is defined per template in basis points.
;; Maximum royalty is capped at 20% (2000 bps) to prevent abuse.
;; ============================================================

;; --------------- Error Constants ---------------
(define-constant ERR_NOT_OWNER          (err u403))
(define-constant ERR_NOT_FOUND          (err u404))
(define-constant ERR_ALREADY_EXISTS     (err u409))
(define-constant ERR_ROYALTY_TOO_HIGH   (err u410))
(define-constant ERR_ZERO_AMOUNT        (err u411))
(define-constant ERR_EMPTY_NAME         (err u412))
(define-constant ERR_UNAUTHORIZED       (err u401))

;; --------------- Event Topics ---------------
(define-constant EVENT_TEMPLATE_CREATED  "template-created")
(define-constant EVENT_TEMPLATE_UPDATED  "template-updated")
(define-constant EVENT_ROYALTY_PAID      "royalty-paid")

;; --------------- Constants ---------------
(define-constant CONTRACT_OWNER tx-sender)
(define-constant MAX_ROYALTY_BPS u2000)    ;; 20% cap
(define-constant BPS_DENOMINATOR u10000)

;; --------------- Data Variables ---------------
(define-data-var next-template-id uint u1)
(define-data-var total-templates uint u0)
(define-data-var total-royalties-paid uint u0)

;; --------------- Maps ---------------

(define-map templates
  { template-id: uint }
  {
    creator: principal,
    name: (string-utf8 64),
    description: (string-utf8 256),
    royalty-bps: uint,
    total-earned: uint,
    total-bots-using: uint,
    active: bool
  }
)

;; Track which bots use which template
(define-map bot-template
  { bot-id: uint }
  { template-id: uint }
)

;; Allowlist of principals authorized to trigger royalty payments
(define-map authorized-payers
  { payer: principal }
  { active: bool }
)

;; --------------- Private Helpers ---------------

(define-private (is-authorized-payer)
  (or
    (is-eq tx-sender CONTRACT_OWNER)
    (match (map-get? authorized-payers { payer: tx-sender })
      entry (get active entry)
      false
    )
  )
)

;; --------------- Admin Functions ---------------

;; @notice Authorize a principal to trigger royalty payments.
(define-public (set-authorized-payer (payer principal) (active bool))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (map-set authorized-payers { payer: payer } { active: active })
    (ok true)
  )
)

;; --------------- Public Functions ---------------

;; @notice Create a new bot template.
;; @param name        Template name.
;; @param description Template description.
;; @param royalty-bps  Royalty percentage in basis points (max 2000 = 20%).
;; @returns (ok uint) The template ID.
(define-public (create-template
    (name (string-utf8 64))
    (description (string-utf8 256))
    (royalty-bps uint))
  (let ((template-id (var-get next-template-id)))
    ;; Validate
    (asserts! (> (len name) u0) ERR_EMPTY_NAME)
    (asserts! (<= royalty-bps MAX_ROYALTY_BPS) ERR_ROYALTY_TOO_HIGH)

    ;; Insert template
    (map-insert templates
      { template-id: template-id }
      {
        creator: tx-sender,
        name: name,
        description: description,
        royalty-bps: royalty-bps,
        total-earned: u0,
        total-bots-using: u0,
        active: true
      }
    )

    ;; Increment
    (var-set next-template-id (+ template-id u1))
    (var-set total-templates (+ (var-get total-templates) u1))

    (print {
      topic: EVENT_TEMPLATE_CREATED,
      template-id: template-id,
      creator: tx-sender,
      name: name,
      royalty-bps: royalty-bps,
      block-height: block-height
    })

    (ok template-id)
  )
)

;; @notice Update template description (creator only).
(define-public (update-template
    (template-id uint)
    (description (string-utf8 256)))
  (let ((template (unwrap! (map-get? templates { template-id: template-id }) ERR_NOT_FOUND)))
    (asserts! (is-eq (get creator template) tx-sender) ERR_NOT_OWNER)
    (map-set templates
      { template-id: template-id }
      (merge template { description: description })
    )
    (print { topic: EVENT_TEMPLATE_UPDATED, template-id: template-id, block-height: block-height })
    (ok true)
  )
)

;; @notice Register a bot as using a template.
;; Called by backend when a bot is created from a template.
(define-public (register-bot-template (bot-id uint) (template-id uint))
  (let ((template (unwrap! (map-get? templates { template-id: template-id }) ERR_NOT_FOUND)))
    (asserts! (is-authorized-payer) ERR_UNAUTHORIZED)
    (asserts! (is-none (map-get? bot-template { bot-id: bot-id })) ERR_ALREADY_EXISTS)

    (map-insert bot-template { bot-id: bot-id } { template-id: template-id })
    (map-set templates
      { template-id: template-id }
      (merge template { total-bots-using: (+ (get total-bots-using template) u1) })
    )
    (ok true)
  )
)

;; @notice Pay royalty to template creator when a bot earns revenue.
;; Called by backend or fee-collector after a payment is processed.
;; @param template-id  The template that earned the royalty.
;; @param revenue      The gross revenue amount (royalty = revenue * bps / 10000).
;; @returns (ok uint) The royalty amount credited.
(define-public (pay-royalty (template-id uint) (revenue uint))
  (let ((template (unwrap! (map-get? templates { template-id: template-id }) ERR_NOT_FOUND)))
    (asserts! (is-authorized-payer) ERR_UNAUTHORIZED)
    (asserts! (> revenue u0) ERR_ZERO_AMOUNT)

    (let ((royalty-amount (/ (* revenue (get royalty-bps template)) BPS_DENOMINATOR)))
      ;; Update template earnings
      (map-set templates
        { template-id: template-id }
        (merge template { total-earned: (+ (get total-earned template) royalty-amount) })
      )
      (var-set total-royalties-paid (+ (var-get total-royalties-paid) royalty-amount))

      ;; Emit event — actual token transfer handled off-chain
      ;; via payment-router::send-payment
      (print {
        topic: EVENT_ROYALTY_PAID,
        template-id: template-id,
        creator: (get creator template),
        revenue: revenue,
        royalty-amount: royalty-amount,
        royalty-bps: (get royalty-bps template),
        block-height: block-height
      })

      (ok royalty-amount)
    )
  )
)

;; --------------- Read-Only Functions ---------------

(define-read-only (get-template (template-id uint))
  (ok (map-get? templates { template-id: template-id }))
)

(define-read-only (get-bot-template (bot-id uint))
  (ok (map-get? bot-template { bot-id: bot-id }))
)

(define-read-only (get-template-royalty (template-id uint) (revenue uint))
  (match (map-get? templates { template-id: template-id })
    template (ok (/ (* revenue (get royalty-bps template)) BPS_DENOMINATOR))
    (err u404)
  )
)

(define-read-only (get-next-template-id)
  (ok (var-get next-template-id))
)

(define-read-only (get-total-templates)
  (ok (var-get total-templates))
)

(define-read-only (get-total-royalties-paid)
  (ok (var-get total-royalties-paid))
)
