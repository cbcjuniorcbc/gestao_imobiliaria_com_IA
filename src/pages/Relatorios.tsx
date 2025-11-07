import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, FileText, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Log {
  id: string;
  user_id: string;
  user_name: string;
  acao: string;
  descricao: string;
  timestamp: string;
}

const Relatorios = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'hoje' | 'semana' | 'mes'>('hoje');

  useEffect(() => {
    if (!isAdmin) {
      toast.error('Acesso negado. Apenas administradores podem ver relatórios.');
      navigate('/dashboard');
      return;
    }
    loadLogs();
  }, [filter, isAdmin, navigate]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      if (window.electronAPI) {
        const today = new Date();
        let startDate = '';
        
        if (filter === 'hoje') {
          startDate = today.toISOString().split('T')[0];
        } else if (filter === 'semana') {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          startDate = weekAgo.toISOString().split('T')[0];
        } else if (filter === 'mes') {
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          startDate = monthAgo.toISOString().split('T')[0];
        }
        
        const endDate = today.toISOString().split('T')[0];
        const result = await (window.electronAPI as any).getLogsByDateRange(startDate, endDate);
        
        if (result.success) {
          setLogs(result.data);
        } else {
          toast.error('Erro ao carregar relatórios');
        }
      }
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
      toast.error('Erro ao carregar relatórios');
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAcaoColor = (acao: string) => {
    const colors: Record<string, string> = {
      'Criação': 'bg-green-100 text-green-800',
      'Edição': 'bg-blue-100 text-blue-800',
      'Exclusão': 'bg-red-100 text-red-800',
      'Boleto': 'bg-yellow-100 text-yellow-800',
      'Pagamento': 'bg-emerald-100 text-emerald-800',
      'Contrato Avulso': 'bg-purple-100 text-purple-800',
      'Upload': 'bg-indigo-100 text-indigo-800',
    };
    return colors[acao] || 'bg-gray-100 text-gray-800';
  };

  const countByAction = (action: string) => {
    return logs.filter(log => log.acao === action).length;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-primary/5">
      <header className="bg-card border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Relatórios de Ações</h1>
              <p className="text-sm text-muted-foreground">Visualize todas as ações realizadas no sistema</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <Tabs defaultValue="hoje" onValueChange={(v) => setFilter(v as any)}>
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="hoje">
              <Calendar className="w-4 h-4 mr-2" />
              Hoje
            </TabsTrigger>
            <TabsTrigger value="semana">
              <Calendar className="w-4 h-4 mr-2" />
              Semana
            </TabsTrigger>
            <TabsTrigger value="mes">
              <Calendar className="w-4 h-4 mr-2" />
              Mês
            </TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="space-y-6 mt-6">
            {/* Resumo de ações */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Criações</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-600">{countByAction('Criação')}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Edições</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-blue-600">{countByAction('Edição')}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Boletos</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-yellow-600">{countByAction('Boleto')}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Pagamentos</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-emerald-600">{countByAction('Pagamento')}</p>
                </CardContent>
              </Card>
            </div>

            {/* Tabela de logs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Histórico de Ações ({logs.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Carregando...</div>
                ) : logs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma ação registrada no período selecionado
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data/Hora</TableHead>
                          <TableHead>Usuário</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Descrição</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-medium whitespace-nowrap">
                              {formatTimestamp(log.timestamp)}
                            </TableCell>
                            <TableCell>{log.user_name}</TableCell>
                            <TableCell>
                              <span className={`text-xs px-2 py-1 rounded ${getAcaoColor(log.acao)}`}>
                                {log.acao}
                              </span>
                            </TableCell>
                            <TableCell className="max-w-md truncate">{log.descricao}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Relatorios;
