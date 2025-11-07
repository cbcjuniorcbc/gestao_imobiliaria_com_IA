import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Mail, Phone, MapPin, Calendar, FileText, CheckCircle2, Clock, Download } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Inquilino, Boleto, Documento } from '@/types';
import { mockInquilinos, mockBoletos } from '@/lib/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';

const InquilinoDetalhes = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [inquilino, setInquilino] = useState<Inquilino | null>(null);
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);

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

  const marcarComoPago = async (boletoId: string) => {
    if (!window.electronAPI?.marcarBoletoPago || !user) return;

    const result = await window.electronAPI.marcarBoletoPago({
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
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
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
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">Detalhes do Inquilino</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-start justify-between">
            <span className="text-2xl">{inquilino.nome}</span>
            <div className="text-xs font-normal text-muted-foreground bg-primary/10 px-3 py-1 rounded">
              {inquilino.cpf_cnpj}
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
                <p className="font-medium">{new Date(inquilino.data_inicio).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
            {inquilino.data_termino && (
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Data de Término</p>
                  <p className="font-medium">{new Date(inquilino.data_termino).toLocaleDateString('pt-BR')}</p>
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
                        {new Date(doc.uploaded_at).toLocaleDateString('pt-BR')}
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
                        <TableCell>{new Date(boleto.data_vencimento).toLocaleDateString('pt-BR')}</TableCell>
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
                          {boleto.situacao === 'Em aberto' && (
                            <Button 
                              size="sm" 
                              onClick={() => marcarComoPago(boleto.id)}
                              className="gap-2"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              Marcar como Pago
                            </Button>
                          )}
                          {boleto.situacao === 'Pago' && boleto.data_pagamento && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
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
            <p className="text-center text-muted-foreground py-8">Nenhum boleto registrado</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InquilinoDetalhes;
