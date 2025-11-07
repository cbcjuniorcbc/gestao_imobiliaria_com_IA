import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Home, FileText, AlertCircle, DollarSign, FileSignature } from 'lucide-react';
import { DashboardStats } from '@/types';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    total_imoveis: 0,
    imoveis_locados: 0,
    boletos_em_aberto: 0,
    boletos_atrasados: 0,
    contratos_avulsos_hoje: 0,
    valor_total_em_aberto: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    if (window.electronAPI?.getDashboardStats) {
      const result = await window.electronAPI.getDashboardStats();
      if (result.success) {
        setStats(result.data);
      }
    }
    setLoading(false);
  };

  const statCards = [
    {
      title: 'Total de Imóveis',
      value: stats.total_imoveis,
      icon: Building2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Imóveis Locados',
      value: stats.imoveis_locados,
      icon: Home,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Boletos em Aberto',
      value: stats.boletos_em_aberto,
      icon: FileText,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: 'Boletos Atrasados',
      value: stats.boletos_atrasados,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: 'Valor em Aberto',
      value: `R$ ${stats.valor_total_em_aberto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Contratos Avulsos Hoje',
      value: stats.contratos_avulsos_hoje,
      icon: FileSignature,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Visão geral do sistema de gestão imobiliária</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate('/proprietarios')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Proprietários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Gerencie proprietários, imóveis e inquilinos
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate('/boletos')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Boletos e Pagamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Controle de boletos e histórico de pagamentos
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate('/contratos-avulsos')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5" />
              Contratos Avulsos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Registro de contratos e serviços avulsos
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate('/configuracoes')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Configurações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Gerenciar usuários e configurações do sistema
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
