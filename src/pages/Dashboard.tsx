import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { mockImoveis, mockBoletos, mockContratosAvulsos } from '@/lib/mockData';
import { 
  Building2, 
  Home, 
  FileText, 
  AlertCircle, 
  TrendingUp,
  DollarSign,
  LogOut,
  Users,
  Calendar
} from 'lucide-react';

const Dashboard = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Calcular estatísticas
  const totalImoveis = mockImoveis.length;
  const imoveisLocados = mockImoveis.filter(i => i.situacao === 'Locado').length;
  const boletosEmAberto = mockBoletos.filter(b => b.situacao === 'Em aberto').length;
  
  const hoje = new Date();
  const boletosAtrasados = mockBoletos.filter(b => {
    if (b.situacao === 'Pago') return false;
    const vencimento = new Date(b.data_vencimento);
    return vencimento < hoje;
  }).length;

  const contratosHoje = mockContratosAvulsos.filter(c => {
    const dataContrato = new Date(c.data);
    return dataContrato.toDateString() === hoje.toDateString();
  }).length;

  const valorTotalEmAberto = mockBoletos
    .filter(b => b.situacao === 'Em aberto')
    .reduce((acc, b) => acc + b.valor_total, 0);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const statCards = [
    {
      title: 'Total de Imóveis',
      value: totalImoveis,
      icon: Building2,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      title: 'Imóveis Locados',
      value: imoveisLocados,
      icon: Home,
      color: 'text-success',
      bgColor: 'bg-success/10'
    },
    {
      title: 'Boletos em Aberto',
      value: boletosEmAberto,
      icon: FileText,
      color: 'text-warning',
      bgColor: 'bg-warning/10'
    },
    {
      title: 'Boletos Atrasados',
      value: boletosAtrasados,
      icon: AlertCircle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10'
    },
    {
      title: 'Contratos Hoje',
      value: contratosHoje,
      icon: Calendar,
      color: 'text-info',
      bgColor: 'bg-info/10'
    },
    {
      title: 'Valor em Aberto',
      value: `R$ ${valorTotalEmAberto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'text-accent',
      bgColor: 'bg-accent/10'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-primary/5">
      {/* Header */}
      <header className="bg-card border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Gestão Imobiliária</h1>
              <p className="text-sm text-muted-foreground">
                {user?.role === 'admin' ? 'Administrador' : 'Recepção'} - {user?.username}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">Dashboard</h2>
          <p className="text-muted-foreground">Visão geral do sistema</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.bgColor} p-2 rounded-lg`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button 
            size="lg" 
            className="h-24 flex flex-col gap-2"
            onClick={() => navigate('/proprietarios')}
          >
            <Users className="w-6 h-6" />
            <span>Proprietários</span>
          </Button>
          <Button 
            size="lg" 
            className="h-24 flex flex-col gap-2"
            variant="secondary"
            onClick={() => navigate('/boletos')}
          >
            <FileText className="w-6 h-6" />
            <span>Boletos</span>
          </Button>
          <Button 
            size="lg" 
            className="h-24 flex flex-col gap-2"
            variant="outline"
            onClick={() => navigate('/contratos-avulsos')}
          >
            <Calendar className="w-6 h-6" />
            <span>Contratos Avulsos</span>
          </Button>
          {isAdmin && (
            <Button 
              size="lg" 
              className="h-24 flex flex-col gap-2"
              variant="outline"
              onClick={() => navigate('/admin')}
            >
              <TrendingUp className="w-6 h-6" />
              <span>Administração</span>
            </Button>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
