import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { WalletProvider } from "@/contexts/WalletContext";
import ParticleBackground from "@/components/ParticleBackground";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import Index from "./pages/Index.tsx";
import Marketplace from "./pages/Marketplace.tsx";
import BotDetail from "./pages/BotDetail.tsx";
import Docs from "./pages/Docs.tsx";
import BountiesPage from "./pages/BountiesPage.tsx";
import Auth from "./pages/Auth.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Studio from "./pages/Studio.tsx";
import Agents from "./pages/Agents.tsx";
import Swarms from "./pages/Swarms.tsx";
import NFTGallery from "./pages/NFTGallery.tsx";
import Impact from "./pages/Impact.tsx";
import Governance from "./pages/Governance.tsx";
import Architecture from "./pages/Architecture.tsx";
import Tokenomics from "./pages/Tokenomics.tsx";
import Roadmap from "./pages/Roadmap.tsx";
import WalletDemoPage from "./pages/demo-wallet.tsx";
import WalletDashboard from "./pages/WalletDashboard.tsx";

import ApiExplorer from "./pages/ApiExplorer.tsx";
import Simulator from "./pages/Simulator.tsx";
import X402Protocol from "./pages/X402Protocol.tsx";
import Deploy from "./pages/Deploy.tsx";
import Billing from "./pages/Billing.tsx";
import Settings from "./pages/Settings.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <WalletProvider>
          <div className="relative min-h-screen bg-background overflow-x-hidden">
            <a href="#main-content" className="skip-to-content">Skip to content</a>
            <ParticleBackground />
            <div className="relative z-10 flex flex-col min-h-screen">
              <Navbar />
              <main id="main-content" className="flex-1" role="main">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/marketplace" element={<Marketplace />} />
                  <Route path="/bots/:id" element={<BotDetail />} />
                  <Route path="/docs" element={<Docs />} />
                  <Route path="/bounties" element={<BountiesPage />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/dashboard" element={<Dashboard initialView="agents" />} />
                  <Route path="/studio" element={<Studio />} />
                  <Route path="/agents" element={<Agents />} />
                  <Route path="/swarms" element={<Swarms />} />
                  <Route path="/nfts" element={<NFTGallery />} />
                  <Route path="/impact" element={<Impact />} />
                  <Route path="/governance" element={<Governance />} />
                  <Route path="/architecture" element={<Architecture />} />
                  <Route path="/tokenomics" element={<Tokenomics />} />
                  <Route path="/roadmap" element={<Roadmap />} />

                  <Route path="/demo-wallet" element={<WalletDemoPage />} />
                  
                  <Route path="/deploy" element={<Deploy />} />
                  <Route path="/billing" element={<Billing />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/api" element={<ApiExplorer />} />
                  <Route path="/simulator" element={<Simulator />} />
                  <Route path="/x402" element={<X402Protocol />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <FooterSection />
            </div>
          </div>
          </WalletProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
