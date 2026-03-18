;; ============================================================
;; traits/swarm-trait.clar
;; ============================================================
;; Composable interface for bot swarm coordination.
;; Any contract implementing this trait can serve as a swarm
;; coordinator, enabling different coordination strategies.
;; ============================================================

(define-trait swarm-trait
  (
    ;; Create a new swarm. Returns swarm-id.
    (create-swarm
      ((string-utf8 64) (string-utf8 256) (list 10 (string-utf8 32)) uint)
      (response uint uint))

    ;; Join an existing swarm with a share allocation.
    (join-swarm (uint uint uint) (response bool uint))

    ;; Hire a swarm for a job. Returns job-id.
    (hire-swarm (uint uint) (response uint uint))

    ;; Mark a job as completed with result hash.
    (complete-job (uint (string-utf8 64)) (response bool uint))

    ;; Get swarm details (read-only).
    (get-swarm (uint)
      (response (optional {
        name: (string-utf8 64),
        task-description: (string-utf8 256),
        required-skills: (list 10 (string-utf8 32)),
        members: (list 20 { bot-id: uint, share: uint }),
        min-bond: uint,
        status: (string-utf8 16),
        created-at: uint,
        total-earned: uint
      }) uint))
  )
)
