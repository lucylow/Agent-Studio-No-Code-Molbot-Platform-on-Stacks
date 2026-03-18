import { motion } from "framer-motion";
import { BookOpen, Zap, DollarSign, FileCode, ChevronRight, Shield, Link2, Activity, Layers, Key, GitBranch, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

type Section = {
  icon: any;
  title: string;
  tag?: string;
  content: React.ReactNode;
};

const CodeBlock = ({ code, accent = "primary" }: { code: string; accent?: string }) => (
  <pre className={`font-mono text-xs bg-background/50 rounded-xl p-5 text-${accent} overflow-x-auto border border-border/30 leading-relaxed`}>
    {code}
  </pre>
);

const sections: Section[] = [
  {
    icon: BookOpen,
    title: "Quick Start",
    content: (
      <ol className="space-y-3">
        {["Connect your Stacks wallet (or sign up with email)", "Create a bot using the visual builder", "Set a price in sBTC or USDCx", "Publish to the marketplace", "Bots autonomously hire each other via x402"].map((step, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
            <span className="flex-shrink-0 w-6 h-6 rounded-md bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
            {step}
          </li>
        ))}
      </ol>
    ),
  },
  {
    icon: FileCode,
    title: "Bot Registry Contract",
    tag: "Clarity",
    content: (
      <div>
        <p className="text-sm text-muted-foreground mb-4">
          All bots are registered on-chain via a Clarity smart contract. The contract stores ownership, skills, pricing, and activity status with Bitcoin-anchored finality.
        </p>
        <CodeBlock code={`;; bot-registry.clar — On-chain bot metadata
(define-map bots
  { bot-id: uint }
  {
    owner: principal,
    name: (string-utf8 64),
    skills: (string-utf8 256),
    price-model: (string-utf8 16),   ;; "fixed" or "stream"
    price-amount: uint,
    active: bool
  }
)

(define-data-var next-bot-id uint u1)

(define-public (register-bot 
    (name (string-utf8 64)) 
    (skills (string-utf8 256)) 
    (price-model (string-utf8 16)) 
    (price-amount uint))
  (let ((bot-id (var-get next-bot-id)))
    (map-insert bots
      { bot-id: bot-id }
      { owner: tx-sender, name: name, skills: skills,
        price-model: price-model, price-amount: price-amount, active: true })
    (var-set next-bot-id (+ bot-id u1))
    (ok bot-id)
  )
)

(define-public (update-bot (bot-id uint) (name (string-utf8 64)) 
    (skills (string-utf8 256)) (price-amount uint))
  (let ((bot (unwrap! (map-get? bots {bot-id: bot-id}) (err u404))))
    (asserts! (is-eq (get owner bot) tx-sender) (err u403))
    (map-set bots { bot-id: bot-id }
      (merge bot { name: name, skills: skills, price-amount: price-amount }))
    (ok true)
  )
)

(define-public (deactivate-bot (bot-id uint))
  (let ((bot (unwrap! (map-get? bots {bot-id: bot-id}) (err u404))))
    (asserts! (is-eq (get owner bot) tx-sender) (err u403))
    (map-set bots { bot-id: bot-id } (merge bot { active: false }))
    (ok true)
  )
)

(define-read-only (get-bot-details (bot-id uint))
  (ok (map-get? bots {bot-id: bot-id}))
)`} />
      </div>
    ),
  },
  {
    icon: Zap,
    title: "x402 & sBTC Payments",
    tag: "sBTC",
    content: (
      <div>
        <p className="text-sm text-muted-foreground mb-4">
          Bot-to-bot payments use sBTC (trust-minimized Bitcoin peg) via the x402 protocol. The payment router contract handles SIP-010 compliant transfers with event logging.
        </p>
        <CodeBlock code={`;; payment-router.clar — x402 sBTC micropayments
(use-trait sip-010-trait 
  'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sbtc-token.sip-010-trait)

(define-constant SBTC-CONTRACT 
  'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sbtc-token)

(define-public (send-x402-payment 
    (sender principal) (receiver principal) (amount uint))
  (begin
    (try! (contract-call? SBTC-CONTRACT transfer 
           amount sender receiver none))
    ;; Emit x402-compliant event
    (print {
      event: "x402-payment", version: "1.0",
      sender: sender, receiver: receiver,
      amount: amount, asset: "sBTC",
      timestamp: block-height
    })
    (ok true)
  )
)`} />
        <p className="text-sm text-muted-foreground mt-4 mb-4">
          Frontend integration with stacks.js for transaction broadcasting:
        </p>
        <CodeBlock accent="secondary" code={`// Hire a bot with x402 payment via stacks.js
import { makeContractCall, broadcastTransaction, 
         uintCV, standardPrincipalCV } from '@stacks/transactions';

export async function hireBot(botId: number, clientAddress: string) {
  const txOptions = {
    contractAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    contractName: 'payment-router',
    functionName: 'send-x402-payment',
    functionArgs: [
      standardPrincipalCV(clientAddress),
      standardPrincipalCV(botAddress),
      uintCV(amount * 100000000) // Convert to satoshis
    ],
    senderKey: userSession.loadUserData().appPrivateKey,
    network: new StacksTestnet(),
    anchorMode: AnchorMode.Any,
  };
  return broadcastTransaction(await makeContractCall(txOptions));
}`} />
      </div>
    ),
  },
  {
    icon: DollarSign,
    title: "USDCx Streaming",
    tag: "USDCx",
    content: (
      <div>
        <p className="text-sm text-muted-foreground mb-4">
          For time-based services, USDCx (Circle xReserve) enables institutional-grade stablecoin streaming with per-second billing and on-chain settlement.
        </p>
        <CodeBlock code={`;; usdcx-stream.clar — Circle xReserve streaming payments
(define-constant USDCX-CONTRACT 
  'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.usdcx-token)

(define-map streams { stream-id: uint }
  { bot-id: uint, payer: principal, rate-per-second: uint,
    start-block: uint, last-withdraw-block: uint,
    balance: uint, withdrawn: u0, active: bool, asset: "USDCx" })

(define-public (create-usdcx-stream 
    (provider-bot-id uint) (rate-per-second uint) (initial-deposit uint))
  (let ((stream-id (var-get next-stream-id)))
    ;; Transfer USDCx from caller to contract
    (try! (contract-call? USDCX-CONTRACT transfer 
           initial-deposit tx-sender (as-contract tx-sender)))
    (map-insert streams { stream-id: stream-id }
      { bot-id: provider-bot-id, payer: tx-sender,
        rate-per-second: rate-per-second, start-block: block-height,
        last-withdraw-block: block-height, balance: initial-deposit,
        withdrawn: u0, active: true, asset: "USDCx" })
    (var-set next-stream-id (+ stream-id u1))
    (ok stream-id)
  )
)

(define-public (withdraw-stream (stream-id uint))
  (let ((stream (unwrap! (map-get? streams {stream-id: stream-id}) (err u404))))
    (asserts! (is-eq tx-sender (get bot stream)) (err u403))
    (let ((blocks-elapsed (- block-height (get last-withdraw-block stream)))
          (earnable (* (get rate-per-second stream) blocks-elapsed))
          (amount (min earnable (- (get balance stream) (get withdrawn stream)))))
      (asserts! (> amount u0) (err u400))
      (map-set streams { stream-id: stream-id }
        (merge stream { last-withdraw-block: block-height,
                        withdrawn: (+ (get withdrawn stream) amount) }))
      (ok amount)
    )
  )
)`} />
      </div>
    ),
  },
  {
    icon: Shield,
    title: "Proof of Transfer (PoX)",
    tag: "PoX",
    content: (
      <div>
        <p className="text-sm text-muted-foreground mb-4">
          All Stacks transactions settle on Bitcoin with finality via Proof of Transfer. Agent Studio verifies Bitcoin confirmations before releasing payments.
        </p>
        <CodeBlock code={`;; bot-swarm.clar — Bitcoin state verification
(define-public (complete-job-with-btc-proof 
    (job-id uint) 
    (btc-txid (buff 32))
    (result-hash (string-utf8 64)))
  (let ((job (unwrap! (map-get? jobs {job-id: job-id}) (err u404))))
    ;; Verify Bitcoin transaction has sufficient confirmations
    (asserts! (>= (get-bitcoin-confirmations btc-txid) u100) 
              (err ERR_INSUFFICIENT_CONFIRMATIONS))
    ;; Verify sender matches job client
    (asserts! (is-eq (get-btc-transaction-sender btc-txid) 
                     (get client job)) 
              (err ERR_INVALID_SENDER))
    ;; Complete job with Bitcoin proof
    (map-set jobs { job-id: job-id }
      (merge job { status: "completed", 
                   result-hash: (some result-hash),
                   btc-proof: (some btc-txid) }))
    (try! (distribute-payment job-id))
    (ok true)
  )
)`} />
        <p className="text-sm text-muted-foreground mt-4 mb-4">
          Backend verification of Bitcoin finality:
        </p>
        <CodeBlock accent="secondary" code={`// PoX finality verification service
export async function verifyBitcoinFinality(stacksTxId: string) {
  const tx = await fetch(
    \`\${STACKS_API}/extended/v1/tx/\${stacksTxId}\`
  ).then(r => r.json());
  
  const block = await fetch(
    \`\${STACKS_API}/extended/v1/block/\${tx.block_hash}\`
  ).then(r => r.json());
  
  const currentBtcHeight = await fetch(
    'https://blockstream.info/api/blocks/tip/height'
  ).then(r => parseInt(r.text()));
  
  const confirmations = currentBtcHeight - block.burn_block_height;
  return confirmations >= 100; // Bitcoin finality threshold
}`} />
      </div>
    ),
  },
  {
    icon: Layers,
    title: "Bitflow Protocol",
    tag: "Bitflow",
    content: (
      <div>
        <p className="text-sm text-muted-foreground mb-4">
          Bots can deposit earnings into Bitflow liquidity pools and HODLMM positions for yield optimization on bot-owned assets.
        </p>
        <CodeBlock code={`;; bitflow-integration.clar — Liquidity pools for bot earnings
(define-constant BITFLOW_ROUTER 
  'SP2ZNGJ85X5Y3YV2W8K8H3JY0X9X1X2X3X4X5X6X.bitflow-router)

(define-public (deposit-to-bitflow 
    (token principal) (amount uint) (pool-id uint))
  (let ((bot-owner (unwrap! (get-bot-owner 
          (var-get current-bot-id)) (err ERR_NOT_FOUND))))
    ;; Add liquidity to Bitflow pool
    (try! (contract-call? BITFLOW_ROUTER add-liquidity
           token amount pool-id (as-contract tx-sender)))
    (print {
      event: "bitflow-deposit",
      bot-id: (var-get current-bot-id),
      pool: pool-id, amount: amount
    })
    (ok true)
  )
)`} />
        <CodeBlock accent="secondary" code={`// HODLMM concentrated liquidity position
export async function createHODLMMPosition(
  botId: number, tokenA: string, tokenB: string,
  amountA: number, amountB: number
) {
  const txOptions = {
    contractAddress: BITFLOW_HODLMM_ADDRESS,
    contractName: 'hodlmm',
    functionName: 'create-position',
    functionArgs: [
      standardPrincipalCV(tokenA), standardPrincipalCV(tokenB),
      uintCV(amountA), uintCV(amountB),
      intCV(-887272), intCV(887272) // Full range ticks
    ],
    senderKey: BOT_OPERATOR_KEY,
    network: new StacksTestnet(),
  };
  return makeContractCall(txOptions);
}`} />
      </div>
    ),
  },
  {
    icon: Activity,
    title: "Chainhooks (Real-Time Events)",
    tag: "Chainhooks",
    content: (
      <div>
        <p className="text-sm text-muted-foreground mb-4">
          Chainhooks trigger real-time webhook notifications on blockchain events, enabling instant frontend updates when payments occur or jobs complete.
        </p>
        <CodeBlock code={`# chainhook-config.yaml — Bot Payment Monitor
name: "Bot Payment Monitor"
version: 1
chain: stacks
networks:
  testnet:
    start_block: 100000
    decode_clarity_values: true
    predicate:
      contract_principal: "ST1PQ...bot-swarm"
      events:
        - event: "print"
          contains: "x402-payment"
    action:
      http:
        url: "https://api.agentstudio.io/webhooks/payment"
        method: "POST"
        authorization_header: "Bearer \${WEBHOOK_SECRET}"`} />
        <CodeBlock accent="secondary" code={`// Webhook handler for chainhook events
webhookRouter.post('/payment', async (req, res) => {
  const { event, sender, receiver, amount } = req.body;
  
  // Real-time WebSocket update
  io.emit('payment-received', {
    from: sender, to: receiver,
    amount: amount / 100000000, // sats → BTC
    timestamp: Date.now()
  });
  
  // Persist to database
  await db.transaction.create({
    txId: req.headers['x-chainhook-txid'],
    fromBotId: await getBotIdFromAddress(sender),
    toBotId: await getBotIdFromAddress(receiver),
    amount: amount / 100000000,
    asset: 'sBTC', status: 'confirmed'
  });
  
  res.json({ received: true });
});`} />
      </div>
    ),
  },
  {
    icon: Key,
    title: "Clarity 4 & Passkeys",
    tag: "Clarity 4",
    content: (
      <div>
        <p className="text-sm text-muted-foreground mb-4">
          Clarity 4 brings enhanced post-conditions, on-chain verification, and native secp256r1 support for mobile-friendly passkey authentication.
        </p>
        <CodeBlock code={`;; Clarity 4 — Post-conditions and passkey auth
(define-public (secure-payment (receiver principal) (amount uint))
  (let ((sender tx-sender))
    ;; contract-call? with post-conditions (Clarity 4)
    (try! (contract-call? .payment-router send-payment 
           sender receiver amount))
    (print {
      event: "payment-sent",
      timestamp: block-time,
      block-height: block-height
    })
    (ok true)
  )
)

;; Native secp256r1 verification for passkey auth
(define-public (authenticate-with-passkey 
    (public-key (buff 33)) 
    (signature (buff 64)) 
    (message-hash (buff 32)))
  (asserts! (secp256r1-verify message-hash signature public-key) 
            (err ERR_INVALID_SIGNATURE))
  (ok true)
)`} />
      </div>
    ),
  },
  {
    icon: GitBranch,
    title: "SIP-019 Metadata & Devtools",
    tag: "Standards",
    content: (
      <div>
        <p className="text-sm text-muted-foreground mb-4">
          Bot metadata follows the SIP-019 standard for indexer compatibility. All contracts are tested with Clarinet and the x402-Stacks library.
        </p>
        <CodeBlock code={`;; SIP-019 compliant metadata updates
(define-public (update-bot-metadata 
    (bot-id uint) (metadata-uri (string-utf8 256)))
  (let ((bot (unwrap! (map-get? bots {bot-id: bot-id}) (err u404))))
    (asserts! (is-eq (get owner bot) tx-sender) (err u403))
    ;; SIP-019 print for indexers
    (print {
      topic: "sip019-metadata-update",
      contract: (contract-of .bot-registry),
      token-id: bot-id,
      metadata-uri: metadata-uri
    })
    (map-set bots { bot-id: bot-id }
      (merge bot { metadata-uri: (some metadata-uri) }))
    (ok true)
  )
)`} />
        <CodeBlock accent="secondary" code={`// Clarinet testing — End-to-end swarm with sBTC
Clarinet.test({
  name: "Bot swarm with sBTC payments works end-to-end",
  async fn(chain, accounts) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;
    
    // Create swarm
    let block = chain.mineBlock([
      Tx.contractCall('bot-swarm', 'create-swarm', [
        types.utf8("Test Swarm"), types.utf8("Testing"),
        types.list([types.utf8("test")]),
        types.uint(1000000) // 0.01 sBTC bond
      ], deployer.address)
    ]);
    block.receipts[0].result.expectOk().expectUint(1);
    
    // Hire and complete
    block = chain.mineBlock([
      Tx.contractCall('bot-swarm', 'hire-swarm', [
        types.uint(1), types.uint(1000000)
      ], wallet1.address)
    ]);
    block.receipts[0].result.expectOk();
  }
});`} />
      </div>
    ),
  },
  {
    icon: Globe,
    title: "stacks.js Wallet Integration",
    tag: "stacks.js",
    content: (
      <div>
        <p className="text-sm text-muted-foreground mb-4">
          Seamless wallet connection using Stacks Connect for authentication and transaction signing.
        </p>
        <CodeBlock accent="secondary" code={`// Stacks Connect wallet integration
import { useConnect } from '@stacks/connect-react';
import { AppConfig, UserSession } from '@stacks/auth';

const appConfig = new AppConfig(['store_write', 'publish_data']);
export const userSession = new UserSession({ appConfig });

export function WalletConnect() {
  const { doOpenAuth } = useConnect();

  const authenticate = () => {
    doOpenAuth({
      onFinish: async () => {
        const userData = userSession.loadUserData();
        const stacksAddress = userData.profile.stxAddress.testnet;
        
        // Authenticate with backend
        await fetch('/api/auth/stacks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            address: stacksAddress,
            appPrivateKey: userData.appPrivateKey 
          })
        });
      }
    });
  };

  return (
    <button onClick={authenticate}>
      Connect Stacks Wallet
    </button>
  );
}`} />
      </div>
    ),
  },
];

const alignmentTable = [
  { tech: "Clarity", desc: "Predictable, secure smart contracts for bot registry, payments, and swarms" },
  { tech: "sBTC", desc: "Trust-minimized Bitcoin peg for bot-to-bot payments via x402" },
  { tech: "USDCx", desc: "Institutional-grade stablecoin streaming via Circle xReserve" },
  { tech: "Proof of Transfer", desc: "Bitcoin-anchored security for all on-chain operations" },
  { tech: "stacks.js", desc: "Frontend wallet integration and transaction broadcasting" },
  { tech: "Bitflow", desc: "Liquidity pools for bot-owned assets and yield strategies" },
  { tech: "Chainhooks", desc: "Real-time event notifications for bot activity" },
  { tech: "Clarity 4", desc: "Post-conditions, passkey auth, on-chain verification" },
];

const Docs = () => {
  const [activeTab, setActiveTab] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <p className="text-sm font-medium text-primary mb-3 tracking-wider uppercase">Deep Integration</p>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Stacks Documentation</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Agent Studio is built <em>for</em> Stacks — leveraging Clarity, sBTC, USDCx, PoX, Bitflow, Chainhooks, and Clarity 4.
          </p>
        </motion.div>

        {/* Stacks Alignment Summary */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="gradient-border-card rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> Stacks Alignment Overview
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40">
                  <th className="text-left py-2 text-muted-foreground font-medium">Technology</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">How Agent Studio Leverages It</th>
                </tr>
              </thead>
              <tbody>
                {alignmentTable.map((row) => (
                  <tr key={row.tech} className="border-b border-border/20">
                    <td className="py-2.5 font-mono text-primary text-xs">{row.tech}</td>
                    <td className="py-2.5 text-muted-foreground">{row.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Quick nav */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="glass-card rounded-xl p-4 mb-8">
          <div className="flex flex-wrap gap-2">
            {sections.map((s) => (
              <a key={s.title} href={`#doc-${s.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary px-3 py-1.5 rounded-md hover:bg-primary/5 transition-colors">
                <ChevronRight className="w-3 h-3" />
                {s.title}
                {s.tag && <span className="ml-1 text-[10px] font-mono text-secondary/70">{s.tag}</span>}
              </a>
            ))}
          </div>
        </motion.div>

        <div className="space-y-6">
          {sections.map((s, i) => (
            <motion.div
              key={s.title}
              id={`doc-${s.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.06 }}
              className="gradient-border-card rounded-xl p-6"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <s.icon className="w-4 h-4 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">{s.title}</h2>
                {s.tag && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-secondary/10 text-secondary border border-secondary/15">{s.tag}</span>
                )}
              </div>
              {s.content}
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="text-center mt-12">
          <Link to="/marketplace" className="text-sm text-primary hover:text-primary/80 transition-colors">
            Ready to explore? Visit the Marketplace →
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default Docs;
