import { useState } from "react";
import { Lock } from "lucide-react";
import { mockWallets, type MockVault } from "@/data/mock-wallet";

export const FireblocksVaultDemo = () => {
  const [selectedVault, setSelectedVault] = useState(0);
  const [deployingVaultId, setDeployingVaultId] = useState<string | null>(
    null,
  );
  const wallet = mockWallets[0];

  const deployToVault = (vaultId: string) => {
    setDeployingVaultId(vaultId);
    setTimeout(() => setDeployingVaultId(null), 2000);
  };

  return (
    <div className="bg-gradient-to-r from-orange-500/10 to-purple-500/10 border border-white/20 rounded-2xl p-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-purple-400 rounded-2xl flex items-center justify-center">
          <Lock className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-purple-400 bg-clip-text text-transparent">
            Fireblocks Vaults
          </h3>
          <p className="text-white/60">Secure MPC custody for Molbot deployments</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {wallet.fireblocks.vaults.map((vault, index) => (
          <VaultCard
            key={vault.id}
            vault={vault}
            selected={selectedVault === index}
            deploying={deployingVaultId === vault.id}
            onSelect={() => setSelectedVault(index)}
            onDeploy={() => deployToVault(vault.id)}
          />
        ))}
      </div>
    </div>
  );
};

type VaultCardProps = {
  vault: MockVault;
  selected: boolean;
  deploying: boolean;
  onSelect: () => void;
  onDeploy: () => void;
};

const VaultCard = ({
  vault,
  selected,
  deploying,
  onSelect,
  onDeploy,
}: VaultCardProps) => (
  <div
    className={`p-6 rounded-xl border-2 transition-all group hover:shadow-2xl ${
      selected
        ? "border-purple-400 bg-purple-500/10 shadow-2xl shadow-purple-500/25"
        : "border-white/20 hover:border-white/40 bg-white/5"
    }`}
    onClick={onSelect}
  >
    <div className="flex items-start justify-between mb-4">
      <div>
        <h4 className="font-bold text-white text-lg">{vault.name}</h4>
        <p className="text-sm text-white/60 font-mono">
          {vault.id.slice(0, 8)}...
        </p>
      </div>
      {selected && (
        <div className="w-6 h-6 bg-purple-400 rounded-full flex items-center justify-center text-xs font-bold">
          ✓
        </div>
      )}
    </div>

    <div className="space-y-2 mb-6">
      {Object.entries(vault.assets).map(([asset, amount]) => (
        <div key={asset} className="flex justify-between text-sm">
          <span className="opacity-75">{asset}</span>
          <span className="font-mono font-bold">{amount.toLocaleString()}</span>
        </div>
      ))}
    </div>

    <button
      onClick={(e) => {
        e.stopPropagation();
        onDeploy();
      }}
      disabled={deploying}
      className="w-full bg-gradient-to-r from-purple-500 to-orange-500 hover:from-purple-600 hover:to-orange-600 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {deploying ? "Deploying..." : "Deploy Molbot → Vault"}
    </button>
  </div>
);

