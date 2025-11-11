import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Home, FileText, AlertCircle, DollarSign, FileSignature, Calendar, CalendarX } from 'lucide-react';
import { DashboardStats, Inquilino } from '@/types';
import { differenceInDays, parseISO, isBefore, addMonths } from 'date-fns';

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
  const [propertyStats, setPropertyStats] = useState({
    aluguel_disponivel: 0,
    aluguel_locado: 0,
    aluguel_manutencao: 0,
    venda_disponivel: 0,
    venda_vendido: 0,
    venda_manutencao: 0,
    ponto_disponivel: 0,
    ponto_locado: 0,
    ponto_manutencao: 0,
    boletos_nao_gerados_mes: 0,
    boletos_nao_gerados_semana: 0,
    boletos_gerados_mes: 0
  });
  const [expiringContracts, setExpiringContracts] = useState<Inquilino[]>([]);
  const [expiredContracts, setExpiredContracts] = useState<Inquilino[]>([]);
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

      // Load property stats
      const imoveisResult = await (window.electronAPI as any).getImoveis();
      if (imoveisResult.success) {
        const imoveis = imoveisResult.data;
        setPropertyStats({
          aluguel_disponivel: imoveis.filter((i: any) => i.tipo === 'Locação' && i.situacao === 'Disponível').length,
          aluguel_locado: imoveis.filter((i: any) => i.tipo === 'Locação' && i.situacao === 'Locado').length,
          aluguel_manutencao: imoveis.filter((i: any) => i.tipo === 'Locação' && i.situacao === 'Manutenção').length,
          venda_disponivel: imoveis.filter((i: any) => i.tipo === 'Venda' && i.situacao === 'Disponível').length,
          venda_vendido: imoveis.filter((i: any) => i.tipo === 'Venda' && i.situacao === 'Vendido').length,
          venda_manutencao: imoveis.filter((i: any) => i.tipo === 'Venda' && i.situacao === 'Manutenção').length,
          ponto_disponivel: imoveis.filter((i: any) => i.tipo === 'Ponto Comercial' && i.situacao === 'Disponível').length,
          ponto_locado: imoveis.filter((i: any) => i.tipo === 'Ponto Comercial' && i.situacao === 'Locado').length,
          ponto_manutencao: imoveis.filter((i: any) => i.tipo === 'Ponto Comercial' && i.situacao === 'Manutenção').length,
          boletos_nao_gerados_mes: 0,
          boletos_nao_gerados_semana: 0,
          boletos_gerados_mes: 0
        });
      }

      // Load boleto stats
      const boletosResult = await (window.electronAPI as any).getBoletos();
      if (boletosResult.success) {
        const boletos = boletosResult.data;
        const hoje = new Date();
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
        const inicioSemana = new Date(hoje);
        inicioSemana.setDate(hoje.getDate() - hoje.getDay());

        setPropertyStats(prev => ({
          ...prev,
          boletos_nao_gerados_mes: boletos.filter((b: any) => {
            const venc = new Date(b.data_vencimento);
            return b.situacao === 'À gerar' && venc >= inicioMes && venc <= fimMes;
          }).length,
          boletos_nao_gerados_semana: boletos.filter((b: any) => {
            const venc = new Date(b.data_vencimento);
            return b.situacao === 'À gerar' && venc >= inicioSemana && venc <= hoje;
          }).length,
          boletos_gerados_mes: boletos.filter((b: any) => {
            if (!b.data_geracao) return false;
            const geracao = new Date(b.data_geracao);
            return geracao >= inicioMes && geracao <= fimMes;
          }).length
        }));
      }

      // Load expiring contracts
      const inquilinosResult = await (window.electronAPI as any).getInquilinos();
      if (inquilinosResult.success) {
        const inquilinos = inquilinosResult.data;
        const hoje = new Date();
        const daquiTresMeses = addMonths(hoje, 3);

        const expiring = inquilinos.filter((inq: Inquilino) => {
          if (!inq.data_termino || inq.status !== 'Ativo') return false;
          const termino = parseISO(inq.data_termino);
          return termino > hoje && termino <= daquiTresMeses;
        });

        const expired = inquilinos.filter((inq: Inquilino) => {
          if (!inq.data_termino || inq.status !== 'Ativo') return false;
          const termino = parseISO(inq.data_termino);
          return isBefore(termino, hoje);
        });

        setExpiringContracts(expiring);
        setExpiredContracts(expired);
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Imóveis Locação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Disponível:</span>
              <span className="font-semibold">{propertyStats.aluguel_disponivel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Locado:</span>
              <span className="font-semibold text-green-600">{propertyStats.aluguel_locado}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Manutenção:</span>
              <span className="font-semibold text-yellow-600">{propertyStats.aluguel_manutencao}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Imóveis Venda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Disponível:</span>
              <span className="font-semibold">{propertyStats.venda_disponivel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vendido:</span>
              <span className="font-semibold text-purple-600">{propertyStats.venda_vendido}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Manutenção:</span>
              <span className="font-semibold text-yellow-600">{propertyStats.venda_manutencao}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Imóveis Ponto Comercial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Disponível:</span>
              <span className="font-semibold">{propertyStats.ponto_disponivel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Locado:</span>
              <span className="font-semibold text-green-600">{propertyStats.ponto_locado}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Manutenção:</span>
              <span className="font-semibold text-yellow-600">{propertyStats.ponto_manutencao}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Boletos Não Gerados (Mês)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{propertyStats.boletos_nao_gerados_mes}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Boletos Não Gerados (Semana)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">{propertyStats.boletos_nao_gerados_semana}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Boletos Gerados (Mês)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{propertyStats.boletos_gerados_mes}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-yellow-600" />
              Contratos a Expirar (3 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expiringContracts.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {expiringContracts.map((inq) => {
                  const diasRestantes = differenceInDays(parseISO(inq.data_termino!), new Date());
                  return (
                    <div key={inq.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors" onClick={() => navigate(`/inquilinos/${inq.id}`)}>
                      <div>
                        <p className="font-medium">{inq.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          Término: {new Date(inq.data_termino!).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-yellow-700">{diasRestantes}d</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Nenhum contrato expirando</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarX className="h-5 w-5 text-red-600" />
              Contratos Expirados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expiredContracts.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {expiredContracts.map((inq) => {
                  const diasExpirados = Math.abs(differenceInDays(parseISO(inq.data_termino!), new Date()));
                  return (
                    <div key={inq.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100 transition-colors" onClick={() => navigate(`/inquilinos/${inq.id}`)}>
                      <div>
                        <p className="font-medium">{inq.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          Término: {new Date(inq.data_termino!).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-red-700">{diasExpirados}d</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Nenhum contrato expirado</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
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
