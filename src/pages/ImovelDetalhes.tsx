import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, Phone, MapPin, Calendar, User, Edit, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Imovel, Inquilino, Proprietario } from '@/types';
import { mockImoveis, mockInquilinos, mockProprietarios } from '@/lib/mockData';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const ImovelDetalhes = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [imovel, setImovel] = useState<Imovel | null>(null);
  const [proprietario, setProprietario] = useState<Proprietario | null>(null);
  const [inquilinos, setInquilinos] = useState<Inquilino[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (window.electronAPI) {
      const imovelResult = await (window.electronAPI as any).getImovelById(id);
      if (imovelResult.success && imovelResult.data) {
        setImovel(imovelResult.data);
        
        const propResult = await (window.electronAPI as any).getProprietarios();
        if (propResult.success) {
          const prop = propResult.data.find((p: Proprietario) => p.id === imovelResult.data.proprietario_id);
          setProprietario(prop || null);
        }
      }

      const inquilinosResult = await (window.electronAPI as any).getInquilinosByImovel(id);
      if (inquilinosResult.success) {
        setInquilinos(inquilinosResult.data);
      }
    } else {
      // Fallback para mock
      const imovelData = mockImoveis.find(i => i.id === id);
      setImovel(imovelData || null);
      if (imovelData) {
        const propData = mockProprietarios.find(p => p.id === imovelData.proprietario_id);
        setProprietario(propData || null);
      }
      setInquilinos(mockInquilinos.filter(i => i.imovel_id === id));
    }
    setLoading(false);
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
            <span className="text-2xl">{imovel.tipo}</span>
            <div className="flex items-center gap-2">
              <span className={`text-sm px-3 py-1 rounded ${getSituacaoColor(imovel.situacao)}`}>
                {imovel.situacao}
              </span>
              <Button variant="ghost" size="icon" onClick={() => navigate(`/imoveis/${id}/editar`)}>
                <Edit className="w-4 h-4" />
              </Button>
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
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-muted-foreground mt-1" />
            <div>
              <p className="text-sm text-muted-foreground">Endereço</p>
              <p className="font-medium text-lg">{imovel.endereco}</p>
            </div>
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

          {imovel.observacoes && (
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground">Observações</p>
              <p className="mt-1">{imovel.observacoes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <User className="h-6 w-6" />
            Inquilinos ({inquilinos.length})
          </h2>
          <Button onClick={() => navigate(`/imoveis/${id}/inquilinos/novo`)}>
            <User className="w-4 h-4 mr-2" />
            Adicionar Inquilino
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {inquilinos.map((inquilino) => (
            <Card 
              key={inquilino.id} 
              className="hover:shadow-lg transition-all"
            >
              <CardHeader>
                <CardTitle className="text-lg flex items-start justify-between">
                  <span className="cursor-pointer" onClick={() => navigate(`/inquilinos/${inquilino.id}`)}>{inquilino.nome}</span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); navigate(`/inquilinos/${inquilino.id}/editar`); }}>
                      <Edit className="w-4 h-4" />
                    </Button>
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
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 cursor-pointer" onClick={() => navigate(`/inquilinos/${inquilino.id}`)}>
                <div className="text-sm text-muted-foreground">{inquilino.cpf_cnpj}</div>
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
          ))}
        </div>

        {inquilinos.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Nenhum inquilino cadastrado para este imóvel</p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ImovelDetalhes;
