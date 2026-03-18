;; ============================================================
;; REFERRAL SYSTEM CONTRACT — Agent Studio Viral Growth Engine
;; ============================================================
;; Tracks referrals between users and credits 0.5% fees on
;; bot hires, NFT mints, and swarm jobs. Creates network effects
;; that drive exponential Stacks ecosystem growth.
;; ============================================================

;; ── Error Constants ──────────────────────────────────────────
(define-constant ERR-ALREADY-REFERRED u400)
(define-constant ERR-NOT-FOUND u404)
(define-constant ERR-SELF-REFER u401)
(define-constant ERR-UNAUTHORIZED u403)

;; ── Data Maps ────────────────────────────────────────────────
;; user → their referrer + total earned from referrals
(define-map referrals
  { user: principal }
  { referrer: principal, earned: uint, referral-count: uint }
)

;; referrer → aggregate stats
(define-map referrer-stats
  { referrer: principal }
  { total-referred: uint, total-earned: uint }
)

;; Global counters
(define-data-var total-referrals uint u0)
(define-data-var total-fees-distributed uint u0)
(define-data-var fee-bps uint u50) ;; 0.5% = 50 basis points
(define-data-var contract-owner principal tx-sender)

;; ── Public Functions ─────────────────────────────────────────

;; Register a referral link — called when a new user signs up via ref link
(define-public (register-referral (referrer principal))
  (let ((user tx-sender))
    (asserts! (not (is-eq user referrer)) (err ERR-SELF-REFER))
    (asserts! (is-none (map-get? referrals {user: user})) (err ERR-ALREADY-REFERRED))
    (map-insert referrals
      {user: user}
      {referrer: referrer, earned: u0, referral-count: u0}
    )
    ;; Update referrer stats
    (let ((stats (default-to {total-referred: u0, total-earned: u0}
                   (map-get? referrer-stats {referrer: referrer}))))
      (map-set referrer-stats
        {referrer: referrer}
        (merge stats {total-referred: (+ (get total-referred stats) u1)})
      )
    )
    (var-set total-referrals (+ (var-get total-referrals) u1))
    (print {event: "referral-registered", user: user, referrer: referrer})
    (ok true)
  )
)

;; Credit referral fee — called by payment router after a transaction
(define-public (credit-referral (user principal) (tx-amount uint))
  (let (
    (referral (unwrap! (map-get? referrals {user: user}) (err ERR-NOT-FOUND)))
    (fee (/ (* tx-amount (var-get fee-bps)) u10000))
  )
    ;; Update user's referral record
    (map-set referrals
      {user: user}
      (merge referral {earned: (+ (get earned referral) fee)})
    )
    ;; Update referrer aggregate stats
    (let ((stats (default-to {total-referred: u0, total-earned: u0}
                   (map-get? referrer-stats {referrer: (get referrer referral)}))))
      (map-set referrer-stats
        {referrer: (get referrer referral)}
        (merge stats {total-earned: (+ (get total-earned stats) fee)})
      )
    )
    (var-set total-fees-distributed (+ (var-get total-fees-distributed) fee))
    (print {
      event: "referral-credited",
      user: user,
      referrer: (get referrer referral),
      fee: fee,
      tx-amount: tx-amount
    })
    (ok fee)
  )
)

;; Update fee basis points — owner only
(define-public (set-fee-bps (new-bps uint))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err ERR-UNAUTHORIZED))
    (var-set fee-bps new-bps)
    (print {event: "fee-bps-updated", new-bps: new-bps})
    (ok true)
  )
)

;; ── Read-Only Functions ──────────────────────────────────────

(define-read-only (get-referral (user principal))
  (map-get? referrals {user: user})
)

(define-read-only (get-referrer-stats (referrer principal))
  (default-to {total-referred: u0, total-earned: u0}
    (map-get? referrer-stats {referrer: referrer}))
)

(define-read-only (get-total-referrals)
  (var-get total-referrals)
)

(define-read-only (get-total-fees-distributed)
  (var-get total-fees-distributed)
)

(define-read-only (get-fee-bps)
  (var-get fee-bps)
)
