import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, CheckCircle2, Clock, AlertCircle, ArrowLeft } from "lucide-react";
import { Boleto, Inquilino } from '@/types';
import { mockBoletos, mockInquilinos } from '@/lib/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

const Boletos = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [inquilinos, setInquilinos] = useState<Inquilino[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroSituacao, setFiltroSituacao] = useState<string>('todos');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (window.electronAPI) {
      const boletosResult = await (window.electronAPI as any).getBoletos();
      if (boletosResult.success) {
        setBoletos(boletosResult.data);
      }

      const inquilinosResult = await (window.electronAPI as any).getInquilinos();
      if (inquilinosResult.success) {
        setInquilinos(inquilinosResult.data);
      }
    } else {
      // Fallback para mock
      setBoletos(mockBoletos);
      setInquilinos(mockInquilinos);
    }
    setLoading(false);
  };

  const marcarComoPago = async (boletoId: string) => {
    if (!window.electronAPI || !user) return;

    const result = await (window.electronAPI as any).marcarBoletoPago({
      boletoId,
      userId: user.id,
      userName: user.username
    });

    if (result.success) {
      toast({
        title: "Sucesso",
        description: "Boleto marcado como pago",
      });
      loadData();
    } else {
      toast({
        title: "Erro",
        description: "Falha ao marcar boleto como pago",
        variant: "destructive"
      });
    }
  };

  const getNomeInquilino = (inquilinoId: string) => {
    const inquilino = inquilinos.find(i => i.id === inquilinoId);
    return inquilino?.nome || 'N/A';
  };

  const calcularDias = (dataVencimento: string, situacao: string) => {
    if (situacao === 'Pago') return null;
    
    const hoje = new Date();
    const vencimento = new Date(dataVencimento);
    const diff = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diff < 0) {
      return { tipo: 'atrasado', dias: Math.abs(diff) };
    } else {
      return { tipo: 'avencer', dias: diff };
    }
  };

  const boletosFiltrados = boletos.filter(boleto => {
    const nomeInquilino = getNomeInquilino(boleto.inquilino_id).toLowerCase();
    const matchSearch = nomeInquilino.includes(searchTerm.toLowerCase()) ||
                       boleto.acao.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filtroSituacao === 'todos') return matchSearch;
    if (filtroSituacao === 'atrasado') {
      const diasInfo = calcularDias(boleto.data_vencimento, boleto.situacao);
      return matchSearch && diasInfo?.tipo === 'atrasado';
    }
    return matchSearch && boleto.situacao.toLowerCase() === filtroSituacao.toLowerCase();
  });

  const totalEmAberto = boletosFiltrados
    .filter(b => b.situacao === 'Em aberto')
    .reduce((acc, b) => acc + b.valor_total, 0);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><p className="text-muted-foreground">Carregando...</p></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-primary/5">
      <header className="bg-card border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Boletos e Pagamentos</h1>
              <p className="text-sm text-muted-foreground">Gestão e histórico de boletos</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-600" />
              Em Aberto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {boletosFiltrados.filter(b => b.situacao === 'Em aberto').length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              Atrasados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {boletosFiltrados.filter(b => {
                const diasInfo = calcularDias(b.data_vencimento, b.situacao);
                return diasInfo?.tipo === 'atrasado';
              }).length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Valor em Aberto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              R$ {totalEmAberto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por inquilino ou ação..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filtroSituacao} onValueChange={setFiltroSituacao}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filtrar por situação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="em aberto">Em Aberto</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="atrasado">Atrasado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {boletosFiltrados.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dias</TableHead>
                    <TableHead>Forma Pagamento</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {boletosFiltrados.map((boleto) => {
                    const diasInfo = calcularDias(boleto.data_vencimento, boleto.situacao);
                    return (
                      <TableRow key={boleto.id}>
                        <TableCell className="font-medium">{getNomeInquilino(boleto.inquilino_id)}</TableCell>
                        <TableCell>{boleto.acao}</TableCell>
                        <TableCell className="text-green-600 font-semibold">
                          R$ {boleto.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>{new Date(boleto.data_vencimento).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs ${
                            boleto.situacao === 'Pago' 
                              ? 'bg-green-100 text-green-800' 
                              : diasInfo?.tipo === 'atrasado'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {boleto.situacao}
                          </span>
                        </TableCell>
                        <TableCell>
                          {diasInfo && (
                            <span className={`text-sm font-semibold ${diasInfo.tipo === 'atrasado' ? 'text-red-600' : 'text-blue-600'}`}>
                              {diasInfo.tipo === 'atrasado' ? `${diasInfo.dias}d atraso` : `${diasInfo.dias}d`}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{boleto.forma_pagamento}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {boleto.data_inicio && boleto.data_termino && (
                            `${new Date(boleto.data_inicio).toLocaleDateString('pt-BR')} - ${new Date(boleto.data_termino).toLocaleDateString('pt-BR')}`
                          )}
                        </TableCell>
                        <TableCell>
                          {boleto.situacao === 'Em aberto' && (
                            <Button 
                              size="sm" 
                              onClick={() => marcarComoPago(boleto.id)}
                              className="gap-2"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              Pagar
                            </Button>
                          )}
                          {boleto.situacao === 'Pago' && boleto.data_pagamento && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(boleto.data_pagamento).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Nenhum boleto encontrado</p>
          )}
        </CardContent>
      </Card>
      </main>
    </div>
  );
};

export default Boletos;
