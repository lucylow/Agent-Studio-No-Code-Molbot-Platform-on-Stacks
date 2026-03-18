import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ParticleBackground from "@/components/ParticleBackground";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import Index from "./pages/Index.tsx";
import Marketplace from "./pages/Marketplace.tsx";
import Docs from "./pages/Docs.tsx";
import BountiesPage from "./pages/BountiesPage.tsx";
import Auth from "./pages/Auth.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Swarms from "./pages/Swarms.tsx";
import NFTGallery from "./pages/NFTGallery.tsx";
import Impact from "./pages/Impact.tsx";
import Governance from "./pages/Governance.tsx";
import Architecture from "./pages/Architecture.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <div className="relative min-h-screen bg-background overflow-x-hidden">
            <a href="#main-content" className="skip-to-content">Skip to content</a>
            <ParticleBackground />
            <div className="relative z-10 flex flex-col min-h-screen">
              <Navbar />
              <main id="main-content" className="flex-1" role="main">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/marketplace" element={<Marketplace />} />
                  <Route path="/docs" element={<Docs />} />
                  <Route path="/bounties" element={<BountiesPage />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/swarms" element={<Swarms />} />
                  <Route path="/nfts" element={<NFTGallery />} />
                  <Route path="/impact" element={<Impact />} />
                  <Route path="/governance" element={<Governance />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <FooterSection />
            </div>
          </div>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
