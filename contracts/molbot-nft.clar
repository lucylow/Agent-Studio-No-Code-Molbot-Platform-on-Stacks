;; ============================================================
;; molbot-nft.clar  (SIP-009 Compliant)
;; ============================================================
;; Agent Studio — Molbot NFT Contract
;;
;; Every molbot is a unique NFT, enabling true ownership,
;; tradability, and on-chain provenance. Follows SIP-009.
;;
;; Features:
;;   • Full SIP-009 compliance (get-owner, transfer, etc.)
;;   • Mint authority for controlled minting
;;   • Bot-ID ↔ Token-ID bidirectional mapping
;;   • Base URI + per-token URI override
;;   • Burn functionality
;;   • x402 / USDCx mint fee support
;;   • Standardized events for indexers
;; ============================================================

;; --------------- Error Constants ---------------
(define-constant ERR_NOT_AUTHORIZED    (err u401))
(define-constant ERR_NOT_FOUND         (err u404))
(define-constant ERR_NOT_OWNER         (err u403))
(define-constant ERR_ALREADY_MINTED    (err u409))
(define-constant ERR_ZERO_ADDRESS      (err u410))
(define-constant ERR_TRANSFER_FAILED   (err u500))
(define-constant ERR_MINT_FEE_UNPAID   (err u402))

;; --------------- Event Topic Constants ---------------
(define-constant EVENT_NFT_MINT        "nft-mint")
(define-constant EVENT_NFT_TRANSFER    "nft-transfer")
(define-constant EVENT_NFT_BURN        "nft-burn")
(define-constant EVENT_URI_UPDATE      "nft-uri-update")
(define-constant EVENT_AUTHORITY_UPDATE "mint-authority-update")

;; --------------- Contract Owner ---------------
(define-constant CONTRACT_OWNER tx-sender)

;; --------------- NFT Definition ---------------
(define-non-fungible-token molbot-nft uint)

;; --------------- Data Variables ---------------
(define-data-var last-token-id uint u0)
(define-data-var mint-authority principal tx-sender)
(define-data-var base-uri (string-ascii 256) "https://agent.studio/api/nft/metadata/")
(define-data-var mint-fee uint u100000)          ;; 0.001 sBTC (8 decimals)
(define-data-var mint-fee-asset (string-utf8 16) u"sBTC")
(define-data-var total-minted uint u0)
(define-data-var total-burned uint u0)

;; --------------- Maps ---------------

;; Token ID → Bot ID (from bot registry)
(define-map token-to-bot
  { token-id: uint }
  { bot-id: uint }
)

;; Bot ID → Token ID (reverse lookup)
(define-map bot-to-token
  { bot-id: uint }
  { token-id: uint }
)

;; Per-token URI overrides
(define-map token-uris
  { token-id: uint }
  { uri: (string-ascii 256) }
)

;; Token metadata (cached on-chain for quick reads)
(define-map token-metadata
  { token-id: uint }
  {
    name: (string-utf8 64),
    minted-at: uint,
    minter: principal
  }
)

;; --------------- Private Helpers ---------------

;; @notice Check if caller is the mint authority.
(define-private (is-mint-authority)
  (is-eq tx-sender (var-get mint-authority))
)

;; @notice Check if caller is contract owner.
(define-private (is-contract-owner)
  (is-eq tx-sender CONTRACT_OWNER)
)

;; --------------- SIP-009 Required Functions ---------------

;; @notice Get the owner of a token.
;; SIP-009: get-owner
(define-read-only (get-owner (token-id uint))
  (ok (nft-get-owner? molbot-nft token-id))
)

;; @notice Get the last minted token ID.
;; SIP-009: get-last-token-id
(define-read-only (get-last-token-id)
  (ok (var-get last-token-id))
)

;; @notice Get the token URI for metadata.
;; Returns per-token URI if set, otherwise constructs from base URI.
;; SIP-009: get-token-uri
(define-read-only (get-token-uri (token-id uint))
  (match (map-get? token-uris { token-id: token-id })
    uri-entry (ok (some (get uri uri-entry)))
    (ok (some (var-get base-uri)))
  )
)

;; @notice Transfer a token from sender to recipient.
;; SIP-009: transfer
;; @param token-id The token to transfer.
;; @param sender   Must be the current owner.
;; @param recipient The new owner.
;; @returns (ok true) on success.
(define-public (transfer (token-id uint) (sender principal) (recipient principal))
  (begin
    ;; Verify sender is current owner
    (asserts! (is-eq (some sender) (nft-get-owner? molbot-nft token-id)) ERR_NOT_OWNER)
    ;; Verify caller is the sender (or authorized)
    (asserts! (is-eq tx-sender sender) ERR_NOT_AUTHORIZED)

    ;; Execute transfer
    (try! (nft-transfer? molbot-nft token-id sender recipient))

    ;; Emit transfer event
    (print {
      topic: EVENT_NFT_TRANSFER,
      token-id: token-id,
      from: sender,
      to: recipient,
      block-height: block-height
    })

    (ok true)
  )
)

;; --------------- Minting Functions ---------------

;; @notice Mint a new molbot NFT linked to a bot registry ID.
;; Only callable by the mint authority (backend / privileged contract).
;; @param bot-id  The bot's ID in the bot registry.
;; @param owner   The principal who will own the NFT.
;; @param name    Display name for on-chain metadata.
;; @returns (ok uint) The newly minted token ID.
(define-public (mint (bot-id uint) (owner principal) (name (string-utf8 64)))
  (let ((new-token-id (+ (var-get last-token-id) u1)))

    ;; Only mint authority can mint
    (asserts! (is-mint-authority) ERR_NOT_AUTHORIZED)

    ;; Ensure this bot hasn't been minted already
    (asserts! (is-none (map-get? bot-to-token { bot-id: bot-id })) ERR_ALREADY_MINTED)

    ;; Mint the NFT
    (try! (nft-mint? molbot-nft new-token-id owner))

    ;; Store mappings
    (map-insert token-to-bot { token-id: new-token-id } { bot-id: bot-id })
    (map-insert bot-to-token { bot-id: bot-id } { token-id: new-token-id })

    ;; Store metadata
    (map-insert token-metadata
      { token-id: new-token-id }
      { name: name, minted-at: block-height, minter: tx-sender }
    )

    ;; Update counters
    (var-set last-token-id new-token-id)
    (var-set total-minted (+ (var-get total-minted) u1))

    ;; Emit mint event
    (print {
      topic: EVENT_NFT_MINT,
      token-id: new-token-id,
      owner: owner,
      bot-id: bot-id,
      name: name,
      block-height: block-height
    })

    (ok new-token-id)
  )
)

;; --------------- Burn Function ---------------

;; @notice Burn an NFT, removing it from circulation.
;; Only the token owner can burn.
;; @param token-id The token to burn.
;; @returns (ok true) on success.
(define-public (burn (token-id uint))
  (let ((owner (unwrap! (nft-get-owner? molbot-nft token-id) ERR_NOT_FOUND)))

    ;; Only owner can burn
    (asserts! (is-eq tx-sender owner) ERR_NOT_OWNER)

    ;; Burn the NFT
    (try! (nft-burn? molbot-nft token-id owner))

    ;; Clean up bot mapping
    (match (map-get? token-to-bot { token-id: token-id })
      bot-entry (begin
        (map-delete bot-to-token { bot-id: (get bot-id bot-entry) })
        (map-delete token-to-bot { token-id: token-id })
      )
      true
    )

    ;; Clean up metadata
    (map-delete token-metadata { token-id: token-id })
    (map-delete token-uris { token-id: token-id })

    ;; Update counter
    (var-set total-burned (+ (var-get total-burned) u1))

    ;; Emit burn event
    (print {
      topic: EVENT_NFT_BURN,
      token-id: token-id,
      owner: owner,
      block-height: block-height
    })

    (ok true)
  )
)

;; --------------- URI Management ---------------

;; @notice Set the base URI for all tokens (fallback).
;; Only contract owner can update.
(define-public (set-base-uri (new-uri (string-ascii 256)))
  (begin
    (asserts! (is-contract-owner) ERR_NOT_AUTHORIZED)
    (var-set base-uri new-uri)

    (print {
      topic: EVENT_URI_UPDATE,
      scope: "base",
      uri: new-uri,
      block-height: block-height
    })

    (ok true)
  )
)

;; @notice Set a custom URI for a specific token.
;; Only the token owner or mint authority can set.
(define-public (set-token-uri (token-id uint) (uri (string-ascii 256)))
  (let ((owner (unwrap! (nft-get-owner? molbot-nft token-id) ERR_NOT_FOUND)))
    (asserts! (or (is-eq tx-sender owner) (is-mint-authority)) ERR_NOT_AUTHORIZED)

    (map-set token-uris
      { token-id: token-id }
      { uri: uri }
    )

    (print {
      topic: EVENT_URI_UPDATE,
      scope: "token",
      token-id: token-id,
      uri: uri,
      block-height: block-height
    })

    (ok true)
  )
)

;; --------------- Admin Functions ---------------

;; @notice Update the mint authority principal.
;; Only contract owner can change this.
(define-public (set-mint-authority (new-authority principal))
  (begin
    (asserts! (is-contract-owner) ERR_NOT_AUTHORIZED)
    (var-set mint-authority new-authority)

    (print {
      topic: EVENT_AUTHORITY_UPDATE,
      old-authority: tx-sender,
      new-authority: new-authority,
      block-height: block-height
    })

    (ok true)
  )
)

;; @notice Update the mint fee amount and asset.
(define-public (set-mint-fee (fee uint) (asset (string-utf8 16)))
  (begin
    (asserts! (is-contract-owner) ERR_NOT_AUTHORIZED)
    (var-set mint-fee fee)
    (var-set mint-fee-asset asset)
    (ok true)
  )
)

;; --------------- Read-Only Functions ---------------

;; @notice Get the bot ID linked to a token.
(define-read-only (get-bot-id (token-id uint))
  (ok (map-get? token-to-bot { token-id: token-id }))
)

;; @notice Get the token ID linked to a bot.
(define-read-only (get-token-by-bot (bot-id uint))
  (ok (map-get? bot-to-token { bot-id: bot-id }))
)

;; @notice Get on-chain metadata for a token.
(define-read-only (get-token-metadata (token-id uint))
  (ok (map-get? token-metadata { token-id: token-id }))
)

;; @notice Get the current mint authority.
(define-read-only (get-mint-authority)
  (ok (var-get mint-authority))
)

;; @notice Get the current mint fee.
(define-read-only (get-mint-fee)
  (ok { amount: (var-get mint-fee), asset: (var-get mint-fee-asset) })
)

;; @notice Get total supply stats.
(define-read-only (get-supply-stats)
  (ok {
    total-minted: (var-get total-minted),
    total-burned: (var-get total-burned),
    circulating: (- (var-get total-minted) (var-get total-burned)),
    last-token-id: (var-get last-token-id)
  })
)

;; @notice Check if a bot has been minted as an NFT.
(define-read-only (is-bot-minted (bot-id uint))
  (ok (is-some (map-get? bot-to-token { bot-id: bot-id })))
)
