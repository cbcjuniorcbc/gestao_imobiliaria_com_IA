import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, Phone, MapPin, Calendar, FileText, CheckCircle2, Clock, Download, Edit, Trash2, FileCheck } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Inquilino, Boleto, Documento } from '@/types';
import { mockInquilinos, mockBoletos } from '@/lib/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';

const InquilinoDetalhes = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const [inquilino, setInquilino] = useState<Inquilino | null>(null);
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [boletoToMarkGerado, setBoletoToMarkGerado] = useState<string | null>(null);
  const [boletoToMarkPago, setBoletoToMarkPago] = useState<string | null>(null);
  const [dataGeracao, setDataGeracao] = useState('');
  const [dataPagamento, setDataPagamento] = useState('');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (window.electronAPI) {
      const inquilinoResult = await (window.electronAPI as any).getInquilinoById(id);
      if (inquilinoResult.success && inquilinoResult.data) {
        setInquilino(inquilinoResult.data);
      }

      const boletosResult = await (window.electronAPI as any).getBoletosByInquilino(id);
      if (boletosResult.success) {
        setBoletos(boletosResult.data);
      }

      const docsResult = await (window.electronAPI as any).getDocumentosByOwner({ ownerType: 'inquilino', ownerId: id });
      if (docsResult.success) {
        setDocumentos(docsResult.data);
      }
    } else {
      // Fallback para mock
      const inquilinoData = mockInquilinos.find(i => i.id === id);
      setInquilino(inquilinoData || null);
      setBoletos(mockBoletos.filter(b => b.inquilino_id === id));
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

  const criarBoletosInquilino = async () => {
    if (!window.electronAPI || !user || !id) return;

    const result = await (window.electronAPI as any).criarBoletosInquilino({
      inquilinoId: id,
      userId: user.id,
      userName: user.username
    });

    if (result.success) {
      toast({
        title: "Sucesso",
        description: `${result.boletosGerados} boletos criados com sucesso!`,
      });
      loadData();
    } else {
      toast({
        title: "Erro",
        description: result.error || "Falha ao criar boletos",
        variant: "destructive"
      });
    }
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

  const handleDownloadDocument = async (documentoId: string, filename: string) => {
    try {
      if (window.electronAPI) {
        const result = await (window.electronAPI as any).downloadDocumento(documentoId);
        if (result.success) {
          const blob = new Blob([new Uint8Array(result.data.buffer)]);
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          sonnerToast.success('Download realizado com sucesso!');
        } else {
          sonnerToast.error(result.error || 'Erro ao fazer download');
        }
      }
    } catch (error) {
      console.error('Erro ao fazer download:', error);
      sonnerToast.error('Erro ao fazer download do documento');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><p className="text-muted-foreground">Carregando...</p></div>;
  }

  if (!inquilino) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Inquilino não encontrado</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">Detalhes do Inquilino</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-start justify-between">
            <div className="flex flex-col gap-2">
              <span className="text-2xl">{inquilino.nome}</span>
              <div className="text-xs font-normal text-muted-foreground bg-primary/10 px-3 py-1 rounded w-fit">
                {inquilino.cpf_cnpj}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={() => navigate(`/inquilinos/${id}/editar`)}>
                <Edit className="w-4 h-4" />
              </Button>
              {isAdmin && (
                <Button variant="ghost" size="icon" onClick={async () => {
                  if (window.electronAPI && user && window.confirm('Tem certeza que deseja remover este inquilino?')) {
                    const result = await (window.electronAPI as any).deleteInquilino({ 
                      id: inquilino.id, 
                      userId: user.id, 
                      userName: user.username 
                    });
                    if (result.success) {
                      sonnerToast.success('Inquilino removido com sucesso!');
                      navigate('/inquilinos');
                    } else {
                      sonnerToast.error(result.error || 'Erro ao remover inquilino');
                    }
                  }
                }}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{inquilino.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Telefone</p>
                <p className="font-medium">{inquilino.telefone}</p>
              </div>
            </div>
            {inquilino.cpf && (
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">CPF</p>
                  <p className="font-medium">{inquilino.cpf}</p>
                </div>
              </div>
            )}
            {inquilino.rg && (
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">RG</p>
                  <p className="font-medium">{inquilino.rg}</p>
                </div>
              </div>
            )}
            {inquilino.renda_aproximada && (
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Renda Aproximada</p>
                  <p className="font-medium text-green-600">
                    R$ {inquilino.renda_aproximada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Data de Início</p>
                <p className="font-medium">{new Date(inquilino.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
            {inquilino.data_termino && (
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Data de Término</p>
                  <p className="font-medium">{new Date(inquilino.data_termino + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
            )}
          </div>
          {inquilino.observacoes && (
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground">Observações</p>
              <p className="mt-1">{inquilino.observacoes}</p>
            </div>
          )}
          <div className="flex gap-3 pt-4 border-t">
            <Button onClick={() => navigate(`/inquilinos/${id}/boleto/novo`)} className="flex-1">
              <FileText className="w-4 h-4 mr-2" />
              Registrar Boleto
            </Button>
            <Button onClick={criarBoletosInquilino} variant="outline" className="flex-1">
              <FileCheck className="w-4 h-4 mr-2" />
              Criar boletos Inquilino
            </Button>
          </div>
        </CardContent>
      </Card>

      {documentos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documentos ({documentos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {documentos.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <div>
                      <span className="font-medium block">{doc.filename}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(doc.uploaded_at + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadDocument(doc.id, doc.filename)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Histórico de Pagamentos ({boletos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {boletos.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ação</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dias</TableHead>
                    <TableHead>Forma Pagamento</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {boletos.map((boleto) => {
                    const diasInfo = calcularDias(boleto.data_vencimento, boleto.situacao);
                    return (
                      <TableRow key={boleto.id}>
                        <TableCell className="font-medium">{boleto.acao}</TableCell>
                        <TableCell className="text-green-600 font-semibold">
                          R$ {boleto.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>{new Date(boleto.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs ${
                            boleto.situacao === 'Pago' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {boleto.situacao}
                          </span>
                        </TableCell>
                        <TableCell>
                          {diasInfo && (
                            <span className={`text-sm ${diasInfo.tipo === 'atrasado' ? 'text-red-600 font-semibold' : 'text-blue-600'}`}>
                              {diasInfo.tipo === 'atrasado' ? `${diasInfo.dias} dias atrasado` : `${diasInfo.dias} dias`}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{boleto.forma_pagamento}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
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
                            {boleto.data_geracao && (
                              <span className="text-xs text-muted-foreground">
                                Gerado: {new Date(boleto.data_geracao + 'T00:00:00').toLocaleDateString('pt-BR')}
                              </span>
                            )}
                            {boleto.situacao === 'Pago' && boleto.data_pagamento && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Pago: {new Date(boleto.data_pagamento + 'T00:00:00').toLocaleDateString('pt-BR')}
                              </span>
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
            <p className="text-center text-muted-foreground py-8">Nenhum boleto registrado</p>
          )}
        </CardContent>
      </Card>

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

export default InquilinoDetalhes;
