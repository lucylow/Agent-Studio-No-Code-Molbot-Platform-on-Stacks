;; ============================================================
;; usdcx-stream.clar  (v2 — Enhanced)
;; ============================================================
;; Agent Studio — USDCx Streaming Payment Manager
;;
;; v2 enhancements:
;;   • Top-up function for adding funds to active streams
;;   • Pause/resume stream capability
;;   • Safe math helpers
;;   • Standardized event topics
;;   • Stream statistics (total streams, total volume)
;;   • Comprehensive inline documentation
;; ============================================================

;; --------------- Error Constants ---------------
(define-constant ERR_NO_EARNINGS    (err u400))
(define-constant ERR_NOT_AUTHORIZED (err u403))
(define-constant ERR_NOT_FOUND      (err u404))
(define-constant ERR_STREAM_CLOSED  (err u410))
(define-constant ERR_ZERO_RATE      (err u411))
(define-constant ERR_ZERO_DEPOSIT   (err u412))
(define-constant ERR_STREAM_PAUSED  (err u413))
(define-constant ERR_NOT_PAUSED     (err u414))
(define-constant ERR_OVERFLOW       (err u1000))

;; --------------- Event Topic Constants ---------------
(define-constant EVENT_STREAM_CREATED   "stream-created")
(define-constant EVENT_STREAM_TOPPED_UP "stream-topped-up")
(define-constant EVENT_STREAM_WITHDRAW  "stream-withdraw")
(define-constant EVENT_STREAM_PAUSED    "stream-paused")
(define-constant EVENT_STREAM_RESUMED   "stream-resumed")
(define-constant EVENT_STREAM_CLOSED    "stream-closed")

;; --------------- Data Variables ---------------
(define-data-var next-stream-id uint u1)
(define-data-var total-streams-created uint u0)
(define-data-var total-volume-streamed uint u0)

;; --------------- Maps ---------------
(define-map streams
  { stream-id: uint }
  {
    payer: principal,
    bot: principal,
    rate-per-second: uint,
    start-block: uint,
    last-withdraw-block: uint,
    balance: uint,
    withdrawn: uint,
    active: bool,
    paused: bool
  }
)

;; --------------- Private Helpers ---------------

;; @notice Returns the minimum of two uints.
(define-private (min-uint (a uint) (b uint))
  (if (<= a b) a b)
)

;; @notice Safe addition with overflow guard.
(define-private (safe-add (a uint) (b uint))
  (let ((sum (+ a b)))
    (asserts! (>= sum a) ERR_OVERFLOW)
    (ok sum)
  )
)

;; @notice Assert caller is the payer of a stream. Returns stream data.
(define-private (assert-payer (stream-id uint))
  (let ((stream (unwrap! (map-get? streams { stream-id: stream-id }) ERR_NOT_FOUND)))
    (asserts! (is-eq (get payer stream) tx-sender) ERR_NOT_AUTHORIZED)
    (ok stream)
  )
)

;; --------------- Public Functions ---------------

;; @notice Create a new USDCx payment stream.
;; @param bot             Principal of the receiving bot.
;; @param rate-per-second  USDCx micro-units earned per Stacks block (~10s).
;; @param initial-deposit  Total USDCx deposited for this stream.
;; @returns (ok uint) The newly assigned stream-id.
;; @errors u411 zero rate, u412 zero deposit.
(define-public (create-stream
    (bot principal)
    (rate-per-second uint)
    (initial-deposit uint))
  (let (
    (stream-id (var-get next-stream-id))
    (caller tx-sender)
  )
    ;; Input validation
    (asserts! (> rate-per-second u0) ERR_ZERO_RATE)
    (asserts! (> initial-deposit u0) ERR_ZERO_DEPOSIT)

    ;; Insert stream record
    (map-insert streams
      { stream-id: stream-id }
      {
        payer: caller,
        bot: bot,
        rate-per-second: rate-per-second,
        start-block: block-height,
        last-withdraw-block: block-height,
        balance: initial-deposit,
        withdrawn: u0,
        active: true,
        paused: false
      }
    )

    ;; Increment counters
    (var-set next-stream-id (+ stream-id u1))
    (var-set total-streams-created (+ (var-get total-streams-created) u1))
    (var-set total-volume-streamed (+ (var-get total-volume-streamed) initial-deposit))

    ;; Emit event
    (print {
      topic: EVENT_STREAM_CREATED,
      stream-id: stream-id,
      payer: caller,
      bot: bot,
      rate-per-second: rate-per-second,
      initial-deposit: initial-deposit,
      block-height: block-height
    })

    (ok stream-id)
  )
)

;; @notice Top up an existing stream with additional USDCx.
;; Only the original payer may add funds.
;; @param stream-id  ID of the stream to top up.
;; @param amount     Additional USDCx to deposit.
;; @returns (ok true).
;; @errors u403 not payer, u404 not found, u410 closed, u412 zero amount.
(define-public (top-up-stream (stream-id uint) (amount uint))
  (let ((stream (try! (assert-payer stream-id))))
    (asserts! (get active stream) ERR_STREAM_CLOSED)
    (asserts! (> amount u0) ERR_ZERO_DEPOSIT)

    (let ((new-balance (unwrap! (safe-add (get balance stream) amount) ERR_OVERFLOW)))
      (map-set streams
        { stream-id: stream-id }
        (merge stream { balance: new-balance })
      )

      (var-set total-volume-streamed (+ (var-get total-volume-streamed) amount))

      (print {
        topic: EVENT_STREAM_TOPPED_UP,
        stream-id: stream-id,
        amount: amount,
        new-balance: new-balance,
        block-height: block-height
      })

      (ok true)
    )
  )
)

;; @notice Pause an active stream. Earnings stop accruing.
;; Only the payer can pause.
(define-public (pause-stream (stream-id uint))
  (let ((stream (try! (assert-payer stream-id))))
    (asserts! (get active stream) ERR_STREAM_CLOSED)
    (asserts! (not (get paused stream)) ERR_STREAM_PAUSED)

    (map-set streams
      { stream-id: stream-id }
      (merge stream { paused: true, last-withdraw-block: block-height })
    )

    (print {
      topic: EVENT_STREAM_PAUSED,
      stream-id: stream-id,
      paused-by: tx-sender,
      block-height: block-height
    })

    (ok true)
  )
)

;; @notice Resume a paused stream. Earnings resume from current block.
;; Only the payer can resume.
(define-public (resume-stream (stream-id uint))
  (let ((stream (try! (assert-payer stream-id))))
    (asserts! (get active stream) ERR_STREAM_CLOSED)
    (asserts! (get paused stream) ERR_NOT_PAUSED)

    (map-set streams
      { stream-id: stream-id }
      (merge stream { paused: false, last-withdraw-block: block-height })
    )

    (print {
      topic: EVENT_STREAM_RESUMED,
      stream-id: stream-id,
      resumed-by: tx-sender,
      block-height: block-height
    })

    (ok true)
  )
)

;; @notice Withdraw accrued earnings from a stream.
;; Only the bot (receiver) can withdraw.
;; @returns (ok uint) The amount withdrawn.
;; @errors u400 no earnings, u403 not bot, u404 not found, u413 paused.
(define-public (withdraw-stream (stream-id uint))
  (let (
    (stream (unwrap! (map-get? streams { stream-id: stream-id }) ERR_NOT_FOUND))
    (blocks-elapsed (- block-height (get last-withdraw-block stream)))
    (earnable (* (get rate-per-second stream) blocks-elapsed))
    (remaining (- (get balance stream) (get withdrawn stream)))
    (withdraw-amount (min-uint earnable remaining))
  )
    ;; Access control
    (asserts! (is-eq tx-sender (get bot stream)) ERR_NOT_AUTHORIZED)
    ;; Cannot withdraw from paused stream
    (asserts! (not (get paused stream)) ERR_STREAM_PAUSED)
    ;; Must have earnings
    (asserts! (> withdraw-amount u0) ERR_NO_EARNINGS)

    ;; Update state
    (map-set streams
      { stream-id: stream-id }
      (merge stream {
        last-withdraw-block: block-height,
        withdrawn: (+ (get withdrawn stream) withdraw-amount)
      })
    )

    ;; Emit event (off-chain token transfer triggered by chainhook)
    (print {
      topic: EVENT_STREAM_WITHDRAW,
      stream-id: stream-id,
      bot: tx-sender,
      amount: withdraw-amount,
      total-withdrawn: (+ (get withdrawn stream) withdraw-amount),
      remaining: (- remaining withdraw-amount),
      block-height: block-height
    })

    (ok withdraw-amount)
  )
)

;; @notice Close a stream. Can be called by either payer or bot.
;; Remaining unearned balance is logically refunded to payer.
;; @returns (ok true).
;; @errors u403 not authorized, u404 not found, u410 already closed.
(define-public (close-stream (stream-id uint))
  (let (
    (stream (unwrap! (map-get? streams { stream-id: stream-id }) ERR_NOT_FOUND))
    (remaining (- (get balance stream) (get withdrawn stream)))
  )
    ;; Only payer or bot can close
    (asserts! (or (is-eq tx-sender (get payer stream))
                  (is-eq tx-sender (get bot stream)))
              ERR_NOT_AUTHORIZED)
    (asserts! (get active stream) ERR_STREAM_CLOSED)

    ;; Mark inactive
    (map-set streams
      { stream-id: stream-id }
      (merge stream { active: false })
    )

    ;; Emit event with refund info
    (print {
      topic: EVENT_STREAM_CLOSED,
      stream-id: stream-id,
      closed-by: tx-sender,
      refund-to-payer: remaining,
      total-withdrawn: (get withdrawn stream),
      block-height: block-height
    })

    (ok true)
  )
)

;; --------------- Read-Only Functions ---------------

;; @notice Get full details of a stream.
(define-read-only (get-stream-details (stream-id uint))
  (ok (map-get? streams { stream-id: stream-id }))
)

;; @notice Calculate current earnable amount without modifying state.
(define-read-only (calculate-earned (stream-id uint))
  (let (
    (stream (unwrap! (map-get? streams { stream-id: stream-id }) ERR_NOT_FOUND))
  )
    (if (get paused stream)
      (ok u0)
      (let (
        (blocks-elapsed (- block-height (get last-withdraw-block stream)))
        (earnable (* (get rate-per-second stream) blocks-elapsed))
        (remaining (- (get balance stream) (get withdrawn stream)))
      )
        (ok (min-uint earnable remaining))
      )
    )
  )
)

;; @notice Get the next stream-id.
(define-read-only (get-next-stream-id)
  (ok (var-get next-stream-id))
)

;; @notice Total number of streams ever created.
(define-read-only (get-total-streams)
  (ok (var-get total-streams-created))
)

;; @notice Total USDCx volume deposited across all streams.
(define-read-only (get-total-volume)
  (ok (var-get total-volume-streamed))
)
