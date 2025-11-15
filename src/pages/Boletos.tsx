import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, CheckCircle2, Clock, AlertCircle, ArrowLeft, Trash2, FileCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Boleto, Inquilino } from '@/types';
import { mockBoletos, mockInquilinos } from '@/lib/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Boletos = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [inquilinos, setInquilinos] = useState<Inquilino[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroSituacao, setFiltroSituacao] = useState<string>('todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('todos');
  const [mesSelecionado, setMesSelecionado] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [boletoToDelete, setBoletoToDelete] = useState<string | null>(null);
  const [boletoToMarkGerado, setBoletoToMarkGerado] = useState<string | null>(null);
  const [boletoToMarkPago, setBoletoToMarkPago] = useState<string | null>(null);
  const [dataGeracao, setDataGeracao] = useState('');
  const [dataPagamento, setDataPagamento] = useState('');

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

  const marcarComoPago = async () => {
    if (!window.electronAPI || !user || !boletoToMarkPago || !dataPagamento) return;

    const result = await (window.electronAPI as any).marcarBoletoPago({
      boletoId: boletoToMarkPago,
      dataPagamento,
      userId: user.id,
      userName: user.username
    });

    if (result.success) {
      toast({
        title: "Sucesso",
        description: "Boleto marcado como pago",
      });
      setBoletoToMarkPago(null);
      setDataPagamento('');
      loadData();
    } else {
      toast({
        title: "Erro",
        description: "Falha ao marcar boleto como pago",
        variant: "destructive"
      });
    }
  };

  const marcarComoGerado = async () => {
    if (!window.electronAPI || !user || !boletoToMarkGerado || !dataGeracao) return;

    const result = await (window.electronAPI as any).marcarBoletoGerado({
      boletoId: boletoToMarkGerado,
      dataGeracao,
      userId: user.id,
      userName: user.username
    });

    if (result.success) {
      toast({
        title: "Sucesso",
        description: "Boleto marcado como gerado",
      });
      setBoletoToMarkGerado(null);
      setDataGeracao('');
      loadData();
    } else {
      toast({
        title: "Erro",
        description: "Falha ao marcar boleto como gerado",
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

  const handleDelete = async (boletoId: string) => {
    if (!window.electronAPI || !user) return;

    const result = await (window.electronAPI as any).deleteBoleto({
      boletoId,
      userId: user.id,
      userName: user.username
    });

    if (result.success) {
      toast({
        title: "Sucesso",
        description: "Boleto excluído com sucesso",
      });
      setBoletoToDelete(null);
      loadData();
    } else {
      toast({
        title: "Erro",
        description: "Falha ao excluir boleto",
        variant: "destructive"
      });
    }
  };

  const filterByPeriod = (boleto: Boleto) => {
    if (filtroPeriodo === 'todos') return true;
    
    const dataBoleto = new Date(boleto.data_vencimento);
    const hoje = new Date();
    
    if (filtroPeriodo === 'dia') {
      return dataBoleto.toDateString() === hoje.toDateString();
    }
    
    if (filtroPeriodo === 'semana') {
      const inicioSemana = new Date(hoje);
      inicioSemana.setDate(hoje.getDate() - hoje.getDay());
      const fimSemana = new Date(inicioSemana);
      fimSemana.setDate(inicioSemana.getDate() + 6);
      return dataBoleto >= inicioSemana && dataBoleto <= fimSemana;
    }
    
    if (filtroPeriodo === 'mes') {
      return dataBoleto.getMonth() === hoje.getMonth() && 
             dataBoleto.getFullYear() === hoje.getFullYear();
    }
    
    if (filtroPeriodo === 'mes-especifico' && mesSelecionado) {
      const [ano, mes] = mesSelecionado.split('-');
      return dataBoleto.getMonth() === parseInt(mes) - 1 && 
             dataBoleto.getFullYear() === parseInt(ano);
    }
    
    return true;
  };

  const boletosFiltrados = boletos.filter(boleto => {
    const nomeInquilino = getNomeInquilino(boleto.inquilino_id).toLowerCase();
    const matchSearch = nomeInquilino.includes(searchTerm.toLowerCase()) ||
                       boleto.acao.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchPeriod = filterByPeriod(boleto);
    
    if (filtroSituacao === 'todos') return matchSearch && matchPeriod;
    if (filtroSituacao === 'a gerar') return matchSearch && matchPeriod && boleto.situacao === 'À gerar';
    if (filtroSituacao === 'atrasado') {
      const diasInfo = calcularDias(boleto.data_vencimento, boleto.situacao);
      return matchSearch && matchPeriod && diasInfo?.tipo === 'atrasado';
    }
    return matchSearch && matchPeriod && boleto.situacao.toLowerCase() === filtroSituacao.toLowerCase();
  });

  const totalEmAberto = boletosFiltrados
    .filter(b => b.situacao === 'Em aberto')
    .reduce((acc, b) => acc + b.valor_total, 0);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><p className="text-muted-foreground">Carregando...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Boletos e Pagamentos</h1>
        <p className="text-muted-foreground mt-1">Gestão e histórico de boletos</p>
      </div>

      <main className="space-y-6">
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
          <div className="flex flex-col gap-4">
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
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Situação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="a gerar">À Gerar</SelectItem>
                  <SelectItem value="em aberto">Em Aberto</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="atrasado">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Filtrar por período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Períodos</SelectItem>
                  <SelectItem value="dia">Hoje</SelectItem>
                  <SelectItem value="semana">Esta Semana</SelectItem>
                  <SelectItem value="mes">Este Mês</SelectItem>
                  <SelectItem value="mes-especifico">Mês Específico</SelectItem>
                </SelectContent>
              </Select>
              {filtroPeriodo === 'mes-especifico' && (
                <Input
                  type="month"
                  value={mesSelecionado}
                  onChange={(e) => setMesSelecionado(e.target.value)}
                  className="w-full md:w-[200px]"
                />
              )}
            </div>
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
                    <TableHead className="text-right">Ações</TableHead>
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
                        <TableCell>{new Date(boleto.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs ${
                            boleto.situacao === 'À gerar'
                              ? 'bg-gray-100 text-gray-800'
                              : boleto.situacao === 'Pago' 
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
                            `${new Date(boleto.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR')} - ${new Date(boleto.data_termino + 'T00:00:00').toLocaleDateString('pt-BR')}`
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {boleto.situacao === 'À gerar' && (
                              <Button 
                                size="sm"
                                variant="outline"
                                onClick={() => setBoletoToMarkGerado(boleto.id)}
                                className="gap-2"
                              >
                                <FileCheck className="w-4 h-4" />
                                Boleto Gerado
                              </Button>
                            )}
                            {boleto.situacao === 'Em aberto' && (
                              <Button 
                                size="sm" 
                                onClick={() => setBoletoToMarkPago(boleto.id)}
                                className="gap-2"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                Pagar
                              </Button>
                            )}
                            {boleto.situacao === 'Pago' && boleto.data_pagamento && (
                              <span className="text-xs text-muted-foreground">
                                Pago: {new Date(boleto.data_pagamento + 'T00:00:00').toLocaleDateString('pt-BR')}
                              </span>
                            )}
                            {boleto.data_geracao && boleto.situacao !== 'À gerar' && (
                              <span className="text-xs text-muted-foreground">
                                Gerado: {new Date(boleto.data_geracao + 'T00:00:00').toLocaleDateString('pt-BR')}
                              </span>
                            )}
                            {isAdmin && (
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => setBoletoToDelete(boleto.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
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

      <AlertDialog open={!!boletoToDelete} onOpenChange={() => setBoletoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este boleto? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => boletoToDelete && handleDelete(boletoToDelete)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!boletoToMarkGerado} onOpenChange={() => {
        setBoletoToMarkGerado(null);
        setDataGeracao('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar Boleto como Gerado</DialogTitle>
            <DialogDescription>
              Selecione a data em que o boleto foi gerado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="data-geracao">Data de Geração</Label>
            <Input
              id="data-geracao"
              type="date"
              value={dataGeracao}
              onChange={(e) => setDataGeracao(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setBoletoToMarkGerado(null);
              setDataGeracao('');
            }}>
              Cancelar
            </Button>
            <Button onClick={marcarComoGerado} disabled={!dataGeracao}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!boletoToMarkPago} onOpenChange={() => {
        setBoletoToMarkPago(null);
        setDataPagamento('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar Boleto como Pago</DialogTitle>
            <DialogDescription>
              Selecione a data em que o boleto foi pago.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="data-pagamento">Data de Pagamento</Label>
            <Input
              id="data-pagamento"
              type="date"
              value={dataPagamento}
              onChange={(e) => setDataPagamento(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setBoletoToMarkPago(null);
              setDataPagamento('');
            }}>
              Cancelar
            </Button>
            <Button onClick={marcarComoPago} disabled={!dataPagamento}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Boletos;
