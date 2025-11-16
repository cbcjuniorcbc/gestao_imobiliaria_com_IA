import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, Phone, MapPin, Calendar, User, Edit, Trash2, Download } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useNavigate, useParams } from "react-router-dom";
import { Imovel, Inquilino, Proprietario } from '@/types';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const ImovelDetalhes = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const [imovel, setImovel] = useState<Imovel | null>(null);
  const [proprietario, setProprietario] = useState<Proprietario | null>(null);
  const [inquilinos, setInquilinos] = useState<Inquilino[]>([]);
  const [anexos, setAnexos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarAtivos, setMostrarAtivos] = useState(true);
  const [mostrarInativos, setMostrarInativos] = useState(true);
  const [fotoFullscreen, setFotoFullscreen] = useState<string | null>(null);

  useEffect(() => {
    console.log("[ImovelDetalhes] useEffect triggered, ID:", id);
    loadData();
  }, [id]);

  const loadData = async () => {
    console.log("[ImovelDetalhes] loadData called for ID:", id);
    setLoading(true); // Set loading to true at the start
    try {
      if (window.electronAPI) {
        console.log("[ImovelDetalhes] Calling getImovelById with ID:", id);
        const imovelResult = await (window.electronAPI as any).getImovelById(id);
        console.log("[ImovelDetalhes] Result from getImovelById:", imovelResult);
        if (imovelResult.success && imovelResult.data) {
          setImovel(imovelResult.data);
          
          const propResult = await (window.electronAPI as any).getProprietarios();
          if (propResult.success) {
            const prop = propResult.data.find((p: Proprietario) => p.id === imovelResult.data.proprietario_id);
            setProprietario(prop || null);
          }

          // Processar anexos que já vêm no objeto imovel
          if (imovelResult.data.anexos && imovelResult.data.anexos.length > 0) {
            const processedAnexos = await Promise.all(
              imovelResult.data.anexos.map(async (anexo: any) => {
                if (anexo.file_type === 'foto') {
                  const fotoResult = await (window.electronAPI as any).downloadImovelAnexo(anexo.id); // Use new handler
                  if (fotoResult.success) {
                    const base64 = btoa(String.fromCharCode(...new Uint8Array(fotoResult.data.buffer)));
                    let mimeType = 'application/octet-stream';
                    if (fotoResult.data.filename.endsWith('.png')) {
                      mimeType = 'image/png';
                    } else if (fotoResult.data.filename.endsWith('.jpg') || fotoResult.data.filename.endsWith('.jpeg')) {
                      mimeType = 'image/jpeg';
                    }
                    return { ...anexo, url: `data:${mimeType};base64,${base64}` };
                  }
                }
                return anexo;
              })
            );
            setAnexos(processedAnexos);
          } else {
            setAnexos([]);
          }
        } else {
          console.error("[ImovelDetalhes] Failed to load imovel or imovel data is null:", imovelResult.error);
        }

        console.log("[ImovelDetalhes] Calling getInquilinosByImovel with ID:", id);
        const inquilinosResult = await (window.electronAPI as any).getInquilinosByImovel(id);
        console.log("[ImovelDetalhes] Result from getInquilinosByImovel:", inquilinosResult);
        if (inquilinosResult.success) {
          setInquilinos(inquilinosResult.data);
        }
      } else {
        console.warn("[ImovelDetalhes] window.electronAPI is not available.");
      }
    } catch (error) {
      console.error("[ImovelDetalhes] Error in loadData:", error);
      toast.error("Erro ao carregar detalhes do imóvel.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (anexo: any) => {
    if (window.electronAPI) {
      const result = await (window.electronAPI as any).downloadImovelAnexo(anexo.id); // Use new handler
      if (result.success) {
        const blob = new Blob([new Uint8Array(result.data.buffer)]);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.data.filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      } else {
        toast.error(result.error || 'Erro ao baixar anexo');
      }
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

  const getBackPath = () => {
    if (imovel?.tipo === 'Locação') return '/imoveis/aluguel';
    if (imovel?.tipo === 'Venda') return '/imoveis/venda';
    if (imovel?.tipo === 'Ponto Comercial') return '/imoveis/ponto-comercial';
    return '/dashboard';
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><p className="text-muted-foreground">Carregando...</p></div>;
  }

  if (!imovel) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Imóvel não encontrado</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fotos = anexos.filter(a => a.file_type === 'foto');
  const documentos = anexos.filter(a => a.file_type === 'documento');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">Detalhes do Imóvel</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-2xl">{imovel.tipo}</span>
              <span className="text-xs text-muted-foreground mt-1">Código: {imovel.codigo}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-sm px-3 py-1 rounded ${getSituacaoColor(imovel.situacao)}`}>
                {imovel.situacao}
              </span>
              <Button variant="ghost" size="icon" onClick={() => navigate(`/imoveis/${id}/editar`)}>
                <Edit className="w-4 h-4" />
              </Button>
              {isAdmin && (
                <Button variant="ghost" size="icon" onClick={async () => {
                  if (window.electronAPI && user && window.confirm('Tem certeza que deseja remover este imóvel?')) {
                    const result = await (window.electronAPI as any).deleteImovel({ 
                      id: imovel.id, 
                      userId: user.id, 
                      userName: user.username 
                    });
                    if (result.success) {
                      toast.success('Imóvel removido com sucesso!');
                      navigate(getBackPath());
                    } else {
                      toast.error(result.error || 'Erro ao remover imóvel');
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
            {imovel.rua && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm text-muted-foreground">Rua/Avenida/Logradouro</p>
                  <p className="font-medium">{imovel.rua}</p>
                </div>
              </div>
            )}
            {imovel.numero && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm text-muted-foreground">Número</p>
                  <p className="font-medium">{imovel.numero}</p>
                </div>
              </div>
            )}
            {imovel.bairro && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm text-muted-foreground">Bairro</p>
                  <p className="font-medium">{imovel.bairro}</p>
                </div>
              </div>
            )}
            {imovel.cidade && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm text-muted-foreground">Cidade</p>
                  <p className="font-medium">{imovel.cidade}</p>
                </div>
              </div>
            )}
            {imovel.estado && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <p className="font-medium">{imovel.estado}</p>
                </div>
              </div>
            )}
            {imovel.cep && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm text-muted-foreground">CEP</p>
                  <p className="font-medium">{imovel.cep}</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <p className="text-sm text-muted-foreground">
                {imovel.tipo === 'Venda' ? 'Valor de Venda' : imovel.tipo === 'Locação' ? 'Valor do Aluguel' : 'Valor Mensal'}
              </p>
              <p className="font-bold text-2xl text-green-600">
                R$ {imovel.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            {proprietario && (
              <div>
                <p className="text-sm text-muted-foreground">Proprietário</p>
                <Button 
                  variant="link" 
                  className="p-0 h-auto font-semibold text-lg"
                  onClick={() => navigate(`/proprietarios/${proprietario.id}`)}
                >
                  {proprietario.nome}
                </Button>
              </div>
            )}
          </div>

          <div className="pt-4 border-t">
            <div>
              <p className="text-sm text-muted-foreground">Publicado na Internet</p>
              <p className="font-medium">{imovel.publicado_internet ? 'Sim' : 'Não'}</p>
            </div>
          </div>

          {imovel.observacoes && (
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground">Observações</p>
              <p className="mt-1">{imovel.observacoes}</p>
            </div>
          )}
          
          {fotos.length > 0 && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-3">Fotos do Imóvel</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {fotos.map((foto, index) => (
                  <div 
                    key={index}
                    className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setFotoFullscreen(foto.url)}
                  >
                    <img 
                      src={foto.url} 
                      alt={`Foto ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {documentos.length > 0 && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-3">Documentos do Imóvel</p>
              <div className="space-y-2">
                {documentos.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-2 border rounded-md">
                    <span className="truncate">{doc.file_name}</span>
                    <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <User className="h-6 w-6" />
            Inquilinos ({inquilinos.filter(i => (mostrarAtivos && i.status === 'Ativo') || (mostrarInativos && i.status === 'Inativo')).length})
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="mostrar-ativos" 
                  checked={mostrarAtivos}
                  onCheckedChange={(checked) => setMostrarAtivos(checked as boolean)}
                />
                <Label htmlFor="mostrar-ativos" className="cursor-pointer text-sm">Ativos</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="mostrar-inativos" 
                  checked={mostrarInativos}
                  onCheckedChange={(checked) => setMostrarInativos(checked as boolean)}
                />
                <Label htmlFor="mostrar-inativos" className="cursor-pointer text-sm">Inativos</Label>
              </div>
            </div>
            <Button onClick={() => navigate(`/imoveis/${id}/inquilinos/novo`)}>
              <User className="w-4 h-4 mr-2" />
              Adicionar Inquilino
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {inquilinos.filter(i => (mostrarAtivos && i.status === 'Ativo') || (mostrarInativos && i.status === 'Inativo')).map((inquilino) => {
            const getStatusColor = (status: string) => {
              return status === 'Ativo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
            };

            return (
            <Card 
              key={inquilino.id} 
              className="hover:shadow-lg transition-all"
            >
              <CardHeader>
                <CardTitle className="text-lg flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="cursor-pointer" onClick={() => navigate(`/inquilinos/${inquilino.id}`)}>{inquilino.nome}</span>
                    <span className={`text-xs px-2 py-1 rounded ${getStatusColor(inquilino.status)}`}>
                      {inquilino.status}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); navigate(`/inquilinos/${inquilino.id}/editar`); }}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    {isAdmin && (
                      <Button variant="ghost" size="icon" onClick={async (e) => {
                        e.stopPropagation();
                        if (window.electronAPI && user && window.confirm('Tem certeza que deseja remover este inquilino?')) {
                          const result = await (window.electronAPI as any).deleteInquilino({ 
                            id: inquilino.id, 
                            userId: user.id, 
                            userName: user.username 
                          });
                          if (result.success) {
                            toast.success('Inquilino removido com sucesso!');
                            loadData();
                          } else {
                            toast.error(result.error || 'Erro ao remover inquilino');
                          }
                        }
                      }}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 cursor-pointer" onClick={() => navigate(`/inquilinos/${inquilino.id}`)}>
                <div className="text-sm text-muted-foreground">CPF/CNPJ: {inquilino.cpf_cnpj}</div>
                {inquilino.dia_vencimento && (
                  <div className="text-sm text-muted-foreground">Vencimento: Dia {inquilino.dia_vencimento}</div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{inquilino.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{inquilino.telefone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm pt-2 border-t">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>Início: {new Date(inquilino.data_inicio).toLocaleDateString('pt-BR')}</span>
                </div>
                {inquilino.data_termino && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>Término: {new Date(inquilino.data_termino).toLocaleDateString('pt-BR')}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
          })}
        </div>

        {inquilinos.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Nenhum inquilino cadastrado para este imóvel</p>
          </Card>
        )}
      </div>
      
      {/* Modal Fullscreen para Fotos */}
      {fotoFullscreen && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setFotoFullscreen(null)}
        >
          <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <img 
              src={fotoFullscreen} 
              alt="Foto em tela cheia"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <Button
              variant="outline"
              size="icon"
              className="absolute top-4 right-4 bg-background/80 hover:bg-background"
              onClick={() => setFotoFullscreen(null)}
            >
              ✕
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImovelDetalhes;
