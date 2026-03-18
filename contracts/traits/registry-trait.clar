;; ============================================================
;; traits/registry-trait.clar
;; ============================================================
;; Defines a composable interface for the Bot Registry.
;; Any contract implementing this trait can serve as a bot
;; registry, enabling mocking in tests and future upgrades.
;; ============================================================

(define-trait registry-trait
  (
    ;; Register a new bot. Returns the assigned bot-id.
    (register-bot
      ((string-utf8 64) (string-utf8 256) (string-utf8 16) uint)
      (response uint uint))

    ;; Update mutable fields of an existing bot.
    (update-bot
      (uint (string-utf8 64) (string-utf8 256) uint)
      (response bool uint))

    ;; Deactivate a bot (soft delete).
    (deactivate-bot (uint) (response bool uint))

    ;; Read-only: get bot details.
    (get-bot-details (uint)
      (response (optional {
        owner: principal,
        name: (string-utf8 64),
        skills: (string-utf8 256),
        price-model: (string-utf8 16),
        price-amount: uint,
        active: bool
      }) uint))

    ;; Read-only: get bot IDs by owner.
    (get-bots-by-owner (principal)
      (response (optional (list 100 uint)) uint))
  )
)
