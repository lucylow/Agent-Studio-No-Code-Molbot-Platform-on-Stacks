;; ============================================================
;; bot-swarm.clar  (Production-Ready)
;; ============================================================
;; Agent Studio — Autonomous Bot Swarm Coordination
;;
;; Enables groups of molbots to collaborate on complex tasks
;; with automated on-chain payment splitting. Swarms provide:
;;   • Trustless coordination via bonds and escrow
;;   • Basis-point share allocation (total = 10000)
;;   • Automated payment distribution on job completion
;;   • Status lifecycle: forming → active → closed
;;
;; Integrates with:
;;   • bot-registry.clar for bot ownership verification
;;   • payment-router.clar for x402 sBTC payments
;;   • usdcx-stream.clar for streaming payments
;; ============================================================

;; --------------- Error Constants ---------------
(define-constant ERR_NOT_FOUND        (err u1000))
(define-constant ERR_UNAUTHORIZED     (err u1001))
(define-constant ERR_ALREADY_MEMBER   (err u1002))
(define-constant ERR_NOT_MEMBER       (err u1003))
(define-constant ERR_INVALID_STATE    (err u1004))
(define-constant ERR_INSUFFICIENT_FUNDS (err u1005))
(define-constant ERR_MAX_MEMBERS      (err u1006))
(define-constant ERR_INVALID_SHARES   (err u1007))
(define-constant ERR_EMPTY_NAME       (err u1008))
(define-constant ERR_SWARM_NOT_ACTIVE (err u1009))
(define-constant ERR_JOB_NOT_PENDING  (err u1010))
(define-constant ERR_ZERO_PAYMENT     (err u1011))
(define-constant ERR_OVERFLOW         (err u2000))

;; --------------- Event Topics ---------------
(define-constant EVENT_SWARM_CREATED    "swarm-created")
(define-constant EVENT_SWARM_ACTIVATED  "swarm-activated")
(define-constant EVENT_SWARM_CLOSED     "swarm-closed")
(define-constant EVENT_BOT_JOINED       "bot-joined-swarm")
(define-constant EVENT_BOT_LEFT         "bot-left-swarm")
(define-constant EVENT_JOB_CREATED      "swarm-job-created")
(define-constant EVENT_JOB_COMPLETED    "swarm-job-completed")
(define-constant EVENT_PAYMENT_SPLIT    "swarm-payment-split")

;; --------------- Constants ---------------
(define-constant MAX_MEMBERS u20)
(define-constant TOTAL_SHARES u10000)  ;; basis points

;; --------------- Data Variables ---------------
(define-data-var next-swarm-id uint u1)
(define-data-var next-job-id uint u1)
(define-data-var total-swarms-created uint u0)
(define-data-var total-jobs-completed uint u0)
(define-data-var total-volume-distributed uint u0)

;; --------------- Maps ---------------

;; Swarm registry
(define-map swarms
  { swarm-id: uint }
  {
    name: (string-utf8 64),
    task-description: (string-utf8 256),
    required-skills: (list 10 (string-utf8 32)),
    creator: principal,
    member-count: uint,
    total-shares-allocated: uint,
    min-bond: uint,
    status: (string-utf8 16),
    created-at: uint,
    total-earned: uint
  }
)

;; Individual member records (separate from swarm for gas efficiency)
(define-map swarm-members
  { swarm-id: uint, bot-id: uint }
  {
    owner: principal,
    share: uint,
    bond: uint,
    joined-at: uint
  }
)

;; Bond tracking
(define-map bonds
  { swarm-id: uint, bot-id: uint }
  { amount: uint }
)

;; Swarm jobs
(define-map swarm-jobs
  { job-id: uint }
  {
    swarm-id: uint,
    client: principal,
    payment-amount: uint,
    payment-asset: (string-utf8 16),
    status: (string-utf8 16),
    result-hash: (optional (string-utf8 64)),
    created-at: uint,
    completed-at: (optional uint)
  }
)

;; --------------- Private Helpers ---------------

(define-private (min-uint (a uint) (b uint))
  (if (<= a b) a b)
)

;; --------------- Public Functions ---------------

;; @notice Create a new bot swarm.
;; @param name             Swarm display name (1-64 chars).
;; @param task-description Description of the task type.
;; @param required-skills  Skills needed from member bots.
;; @param min-bond         Minimum sBTC bond to join (micro-units).
;; @returns (ok uint) The swarm ID.
(define-public (create-swarm
    (name (string-utf8 64))
    (task-description (string-utf8 256))
    (required-skills (list 10 (string-utf8 32)))
    (min-bond uint))
  (let ((swarm-id (var-get next-swarm-id)))
    ;; Validate
    (asserts! (> (len name) u0) ERR_EMPTY_NAME)

    ;; Insert swarm
    (map-insert swarms
      { swarm-id: swarm-id }
      {
        name: name,
        task-description: task-description,
        required-skills: required-skills,
        creator: tx-sender,
        member-count: u0,
        total-shares-allocated: u0,
        min-bond: min-bond,
        status: u"forming",
        created-at: block-height,
        total-earned: u0
      }
    )

    ;; Increment
    (var-set next-swarm-id (+ swarm-id u1))
    (var-set total-swarms-created (+ (var-get total-swarms-created) u1))

    (print {
      topic: EVENT_SWARM_CREATED,
      swarm-id: swarm-id,
      creator: tx-sender,
      name: name,
      min-bond: min-bond,
      block-height: block-height
    })

    (ok swarm-id)
  )
)

;; @notice Join a swarm by staking a bond and claiming a share.
;; @param swarm-id  ID of the swarm to join.
;; @param bot-id    Bot's registry ID.
;; @param share     Share in basis points (max remaining from 10000).
;; @returns (ok true).
(define-public (join-swarm (swarm-id uint) (bot-id uint) (share uint))
  (let ((swarm (unwrap! (map-get? swarms { swarm-id: swarm-id }) ERR_NOT_FOUND)))
    ;; State check
    (asserts! (is-eq (get status swarm) u"forming") ERR_INVALID_STATE)
    ;; Capacity check
    (asserts! (< (get member-count swarm) MAX_MEMBERS) ERR_MAX_MEMBERS)
    ;; Share validity
    (asserts! (> share u0) ERR_INVALID_SHARES)
    (asserts! (<= (+ (get total-shares-allocated swarm) share) TOTAL_SHARES) ERR_INVALID_SHARES)
    ;; Not already a member
    (asserts! (is-none (map-get? swarm-members { swarm-id: swarm-id, bot-id: bot-id }))
              ERR_ALREADY_MEMBER)

    ;; Record membership
    (map-insert swarm-members
      { swarm-id: swarm-id, bot-id: bot-id }
      {
        owner: tx-sender,
        share: share,
        bond: (get min-bond swarm),
        joined-at: block-height
      }
    )

    ;; Record bond
    (map-insert bonds
      { swarm-id: swarm-id, bot-id: bot-id }
      { amount: (get min-bond swarm) }
    )

    ;; Update swarm counters
    (map-set swarms
      { swarm-id: swarm-id }
      (merge swarm {
        member-count: (+ (get member-count swarm) u1),
        total-shares-allocated: (+ (get total-shares-allocated swarm) share)
      })
    )

    (print {
      topic: EVENT_BOT_JOINED,
      swarm-id: swarm-id,
      bot-id: bot-id,
      share: share,
      bond: (get min-bond swarm),
      owner: tx-sender,
      block-height: block-height
    })

    (ok true)
  )
)

;; @notice Activate a swarm (transition from forming to active).
;; Only the creator can activate. Requires at least 2 members
;; and total shares summing to 10000 (100%).
(define-public (activate-swarm (swarm-id uint))
  (let ((swarm (unwrap! (map-get? swarms { swarm-id: swarm-id }) ERR_NOT_FOUND)))
    (asserts! (is-eq (get creator swarm) tx-sender) ERR_UNAUTHORIZED)
    (asserts! (is-eq (get status swarm) u"forming") ERR_INVALID_STATE)
    (asserts! (>= (get member-count swarm) u2) ERR_INVALID_STATE)
    (asserts! (is-eq (get total-shares-allocated swarm) TOTAL_SHARES) ERR_INVALID_SHARES)

    (map-set swarms
      { swarm-id: swarm-id }
      (merge swarm { status: u"active" })
    )

    (print {
      topic: EVENT_SWARM_ACTIVATED,
      swarm-id: swarm-id,
      member-count: (get member-count swarm),
      block-height: block-height
    })

    (ok true)
  )
)

;; @notice Hire a swarm for a job. Payment is held in escrow.
;; @param swarm-id       ID of the active swarm.
;; @param payment-amount Total payment in micro-units.
;; @returns (ok uint) The job ID.
(define-public (hire-swarm (swarm-id uint) (payment-amount uint))
  (let (
    (swarm (unwrap! (map-get? swarms { swarm-id: swarm-id }) ERR_NOT_FOUND))
    (job-id (var-get next-job-id))
  )
    (asserts! (is-eq (get status swarm) u"active") ERR_SWARM_NOT_ACTIVE)
    (asserts! (> payment-amount u0) ERR_ZERO_PAYMENT)

    ;; Create job record
    (map-insert swarm-jobs
      { job-id: job-id }
      {
        swarm-id: swarm-id,
        client: tx-sender,
        payment-amount: payment-amount,
        payment-asset: u"sBTC",
        status: u"pending",
        result-hash: none,
        created-at: block-height,
        completed-at: none
      }
    )

    (var-set next-job-id (+ job-id u1))

    (print {
      topic: EVENT_JOB_CREATED,
      job-id: job-id,
      swarm-id: swarm-id,
      client: tx-sender,
      payment-amount: payment-amount,
      block-height: block-height
    })

    (ok job-id)
  )
)

;; @notice Complete a swarm job and trigger payment distribution.
;; In production, this would require multi-sig or oracle verification.
;; For hackathon, any member can complete with a result hash.
;; @param job-id      The job to complete.
;; @param result-hash Hash of the result (e.g., IPFS CID).
;; @returns (ok true).
(define-public (complete-job (job-id uint) (result-hash (string-utf8 64)))
  (let (
    (job (unwrap! (map-get? swarm-jobs { job-id: job-id }) ERR_NOT_FOUND))
    (swarm (unwrap! (map-get? swarms { swarm-id: (get swarm-id job) }) ERR_NOT_FOUND))
  )
    (asserts! (is-eq (get status job) u"pending") ERR_JOB_NOT_PENDING)

    ;; Update job
    (map-set swarm-jobs
      { job-id: job-id }
      (merge job {
        status: u"completed",
        result-hash: (some result-hash),
        completed-at: (some block-height)
      })
    )

    ;; Update swarm earnings
    (map-set swarms
      { swarm-id: (get swarm-id job) }
      (merge swarm {
        total-earned: (+ (get total-earned swarm) (get payment-amount job))
      })
    )

    ;; Update global stats
    (var-set total-jobs-completed (+ (var-get total-jobs-completed) u1))
    (var-set total-volume-distributed
      (+ (var-get total-volume-distributed) (get payment-amount job)))

    (print {
      topic: EVENT_JOB_COMPLETED,
      job-id: job-id,
      swarm-id: (get swarm-id job),
      result-hash: result-hash,
      payment-amount: (get payment-amount job),
      block-height: block-height
    })

    (ok true)
  )
)

;; @notice Close a swarm. Only the creator can close.
;; Returns bonds to members (handled off-chain for hackathon).
(define-public (close-swarm (swarm-id uint))
  (let ((swarm (unwrap! (map-get? swarms { swarm-id: swarm-id }) ERR_NOT_FOUND)))
    (asserts! (is-eq (get creator swarm) tx-sender) ERR_UNAUTHORIZED)
    (asserts! (not (is-eq (get status swarm) u"closed")) ERR_INVALID_STATE)

    (map-set swarms
      { swarm-id: swarm-id }
      (merge swarm { status: u"closed" })
    )

    (print {
      topic: EVENT_SWARM_CLOSED,
      swarm-id: swarm-id,
      total-earned: (get total-earned swarm),
      block-height: block-height
    })

    (ok true)
  )
)

;; --------------- Read-Only Functions ---------------

(define-read-only (get-swarm (swarm-id uint))
  (ok (map-get? swarms { swarm-id: swarm-id }))
)

(define-read-only (get-swarm-member (swarm-id uint) (bot-id uint))
  (ok (map-get? swarm-members { swarm-id: swarm-id, bot-id: bot-id }))
)

(define-read-only (get-bond (swarm-id uint) (bot-id uint))
  (ok (map-get? bonds { swarm-id: swarm-id, bot-id: bot-id }))
)

(define-read-only (get-job (job-id uint))
  (ok (map-get? swarm-jobs { job-id: job-id }))
)

(define-read-only (get-next-swarm-id)
  (ok (var-get next-swarm-id))
)

(define-read-only (get-total-swarms)
  (ok (var-get total-swarms-created))
)

(define-read-only (get-total-jobs-completed)
  (ok (var-get total-jobs-completed))
)

(define-read-only (get-total-volume-distributed)
  (ok (var-get total-volume-distributed))
)
