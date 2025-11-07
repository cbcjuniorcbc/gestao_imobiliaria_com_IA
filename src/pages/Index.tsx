import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, FileText, Calendar, Home as HomeIcon, Store } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  const mainFeatures = [
    {
      title: "Proprietários",
      description: "Gerencie todos os proprietários cadastrados",
      icon: Users,
      path: "/proprietarios",
      color: "text-blue-600"
    },
    {
      title: "Inquilinos",
      description: "Visualize e gerencie todos os inquilinos",
      icon: Users,
      path: "/inquilinos",
      color: "text-green-600"
    },
    {
      title: "Imóveis para Aluguel",
      description: "Todos os imóveis disponíveis para locação",
      icon: HomeIcon,
      path: "/imoveis/aluguel",
      color: "text-purple-600"
    },
    {
      title: "Imóveis à Venda",
      description: "Todos os imóveis disponíveis para venda",
      icon: Building2,
      path: "/imoveis/venda",
      color: "text-orange-600"
    },
    {
      title: "Pontos Comerciais",
      description: "Gerencie pontos comerciais",
      icon: Store,
      path: "/imoveis/ponto-comercial",
      color: "text-cyan-600"
    },
    {
      title: "Boletos",
      description: "Acompanhe todos os pagamentos",
      icon: FileText,
      path: "/boletos",
      color: "text-red-600"
    },
    {
      title: "Contratos Avulsos",
      description: "Registre contratos e transações avulsas",
      icon: Calendar,
      path: "/contratos-avulsos",
      color: "text-yellow-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-primary/5">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Sistema de Gestão Imobiliária
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Gerencie seus imóveis, proprietários e inquilinos de forma eficiente
          </p>
          <Button 
            size="lg" 
            onClick={() => navigate("/dashboard")}
            className="text-lg px-8"
          >
            <Building2 className="mr-2 h-5 w-5" />
            Acessar Dashboard
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {mainFeatures.map((feature) => (
            <Card 
              key={feature.path}
              className="hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02]"
              onClick={() => navigate(feature.path)}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <feature.icon className={`h-8 w-8 ${feature.color}`} />
                  <span>{feature.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
