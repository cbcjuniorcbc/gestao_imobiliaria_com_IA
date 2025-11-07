import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Proprietarios from "./pages/Proprietarios";
import ProprietarioDetalhes from "./pages/ProprietarioDetalhes";
import NovoProprietario from "./pages/NovoProprietario";
import NovoImovel from "./pages/NovoImovel";
import Inquilinos from "./pages/Inquilinos";
import NovoInquilino from "./pages/NovoInquilino";
import NovoBoleto from "./pages/NovoBoleto";
import ImoveisAluguel from "./pages/ImoveisAluguel";
import ImoveisVenda from "./pages/ImoveisVenda";
import ImoveisPontoComercial from "./pages/ImoveisPontoComercial";
import ImovelDetalhes from "./pages/ImovelDetalhes";
import InquilinoDetalhes from "./pages/InquilinoDetalhes";
import Boletos from "./pages/Boletos";
import ContratosAvulsos from "./pages/ContratosAvulsos";
import Relatorios from "./pages/Relatorios";
import Configuracoes from "./pages/Configuracoes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  const showSidebar = !["/", "/login"].includes(location.pathname);

  if (!showSidebar) {
    return (
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
            <div className="flex h-14 items-center px-4">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            </div>
          </div>
          <div className="p-6">
            <Routes>
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/proprietarios" element={<ProtectedRoute><Proprietarios /></ProtectedRoute>} />
              <Route path="/proprietarios/novo" element={<ProtectedRoute><NovoProprietario /></ProtectedRoute>} />
              <Route path="/proprietarios/:id" element={<ProtectedRoute><ProprietarioDetalhes /></ProtectedRoute>} />
              <Route path="/proprietarios/:proprietarioId/imoveis/novo" element={<ProtectedRoute><NovoImovel /></ProtectedRoute>} />
              <Route path="/imoveis/aluguel" element={<ProtectedRoute><ImoveisAluguel /></ProtectedRoute>} />
              <Route path="/imoveis/venda" element={<ProtectedRoute><ImoveisVenda /></ProtectedRoute>} />
              <Route path="/imoveis/ponto-comercial" element={<ProtectedRoute><ImoveisPontoComercial /></ProtectedRoute>} />
              <Route path="/imoveis/:id" element={<ProtectedRoute><ImovelDetalhes /></ProtectedRoute>} />
              <Route path="/imoveis/:imovelId/inquilinos/novo" element={<ProtectedRoute><NovoInquilino /></ProtectedRoute>} />
              <Route path="/inquilinos" element={<ProtectedRoute><Inquilinos /></ProtectedRoute>} />
              <Route path="/inquilinos/:id" element={<ProtectedRoute><InquilinoDetalhes /></ProtectedRoute>} />
              <Route path="/inquilinos/:inquilinoId/boleto/novo" element={<ProtectedRoute><NovoBoleto /></ProtectedRoute>} />
              <Route path="/boletos" element={<ProtectedRoute><Boletos /></ProtectedRoute>} />
              <Route path="/contratos-avulsos" element={<ProtectedRoute><ContratosAvulsos /></ProtectedRoute>} />
              <Route path="/relatorios" element={<ProtectedRoute adminOnly><Relatorios /></ProtectedRoute>} />
              <Route path="/configuracoes" element={<ProtectedRoute adminOnly><Configuracoes /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
