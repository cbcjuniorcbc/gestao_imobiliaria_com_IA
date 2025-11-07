import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, Phone, MapPin, Building2, Download, FileText, Edit, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Proprietario, Imovel } from '@/types';
import { mockProprietarios, mockImoveis } from '@/lib/mockData';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const ProprietarioDetalhes = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [proprietario, setProprietario] = useState<Proprietario | null>(null);
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (window.electronAPI?.getProprietarios && window.electronAPI?.getImoveisByProprietario && window.electronAPI?.getDocumentosByOwner) {
      const propResult = await window.electronAPI.getProprietarios();
      if (propResult.success) {
        const prop = propResult.data.find((p: Proprietario) => p.id === id);
        setProprietario(prop || null);
      }

      const imoveisResult = await window.electronAPI.getImoveisByProprietario(id);
      if (imoveisResult.success) {
        setImoveis(imoveisResult.data);
      }

      const docsResult = await window.electronAPI.getDocumentosByOwner({ ownerType: 'proprietario', ownerId: id || '' });
      if (docsResult.success) {
        setDocumentos(docsResult.data);
      }
    } else {
      // Fallback para mock
      const prop = mockProprietarios.find(p => p.id === id);
      setProprietario(prop || null);
      setImoveis(mockImoveis.filter(i => i.proprietario_id === id));
    }
    setLoading(false);
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
          toast.success('Download realizado com sucesso!');
        } else {
          toast.error(result.error || 'Erro ao fazer download');
        }
      }
    } catch (error) {
      console.error('Erro ao fazer download:', error);
      toast.error('Erro ao fazer download do documento');
    }
  };

  const getSituacaoColor = (situacao: string) => {
    switch (situacao) {
      case 'Locado': return 'bg-green-100 text-green-800';
      case 'Disponível': return 'bg-blue-100 text-blue-800';
      case 'Manutenção': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><p className="text-muted-foreground">Carregando...</p></div>;
  }

  if (!proprietario) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Proprietário não encontrado</p>
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
        <h1 className="text-3xl font-bold">Detalhes do Proprietário</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-start justify-between">
            <div className="flex flex-col gap-2">
              <span className="text-2xl">{proprietario.nome}</span>
              <div className="text-xs font-normal text-muted-foreground bg-primary/10 px-3 py-1 rounded w-fit">
                {proprietario.cpf_cnpj}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={() => navigate(`/proprietarios/${id}/editar`)}>
                <Edit className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={async () => {
                if (window.electronAPI && user && window.confirm('Tem certeza que deseja remover este proprietário?')) {
                  const result = await (window.electronAPI as any).deleteProprietario({ 
                    id: proprietario.id, 
                    userId: user.id, 
                    userName: user.username 
                  });
                  if (result.success) {
                    toast.success('Proprietário removido com sucesso!');
                    navigate('/proprietarios');
                  } else {
                    toast.error(result.error || 'Erro ao remover proprietário');
                  }
                }
              }}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{proprietario.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Telefone</p>
                <p className="font-medium">{proprietario.telefone}</p>
              </div>
            </div>
          </div>
          {proprietario.metodo_recebimento && (
            <div className="flex items-start gap-3 pt-2 border-t">
              <div className="w-full">
                <p className="text-sm text-muted-foreground">Método de Recebimento</p>
                <p className="font-medium">{proprietario.metodo_recebimento}</p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-3 pt-2 border-t">
            <MapPin className="w-5 h-5 text-muted-foreground mt-1" />
            <div>
              <p className="text-sm text-muted-foreground">Endereço</p>
              <p className="font-medium">{proprietario.endereco}</p>
            </div>
          </div>
          {proprietario.observacoes && (
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground">Observações</p>
              <p className="mt-1">{proprietario.observacoes}</p>
            </div>
          )}
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
                    <span className="text-sm">{doc.filename}</span>
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

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Imóveis ({imoveis.length})
          </h2>
          <Button onClick={() => navigate(`/proprietarios/${id}/imoveis/novo`)}>
            <Building2 className="w-4 h-4 mr-2" />
            Adicionar Imóvel
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {imoveis.map((imovel) => (
            <Card 
              key={imovel.id} 
              className="hover:shadow-lg transition-all"
            >
              <CardHeader>
                <CardTitle className="text-lg flex items-start justify-between">
                  <span className="cursor-pointer" onClick={() => navigate(`/imoveis/${imovel.id}`)}>{imovel.tipo}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${getSituacaoColor(imovel.situacao)}`}>
                      {imovel.situacao}
                    </span>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); navigate(`/imoveis/${imovel.id}/editar`); }}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={async (e) => {
                      e.stopPropagation();
                      if (window.electronAPI && user && window.confirm('Tem certeza que deseja remover este imóvel?')) {
                        const result = await (window.electronAPI as any).deleteImovel({ 
                          id: imovel.id, 
                          userId: user.id, 
                          userName: user.username 
                        });
                        if (result.success) {
                          toast.success('Imóvel removido com sucesso!');
                          loadData();
                        } else {
                          toast.error(result.error || 'Erro ao remover imóvel');
                        }
                      }
                    }}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 cursor-pointer" onClick={() => navigate(`/imoveis/${imovel.id}`)}>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{imovel.endereco}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-muted-foreground">
                    {imovel.tipo === 'Venda' ? 'Valor de Venda' : imovel.tipo === 'Locação' ? 'Valor do Aluguel' : 'Valor Mensal'}
                  </span>
                  <span className="font-bold text-lg text-green-600">
                    R$ {imovel.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {imovel.observacoes && (
                  <p className="text-xs text-muted-foreground">{imovel.observacoes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {imoveis.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Nenhum imóvel cadastrado para este proprietário</p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ProprietarioDetalhes;
