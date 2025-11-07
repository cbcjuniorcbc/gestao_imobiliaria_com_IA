import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { mockImoveis } from '@/lib/mockData';
import { Imovel } from '@/types';
import { ArrowLeft, Search, MapPin, Building2, Globe } from 'lucide-react';

const ImoveisVenda = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (window.electronAPI && 'getImoveis' in window.electronAPI) {
      const result = await (window.electronAPI as any).getImoveis();
      if (result.success) {
        setImoveis(result.data.filter((i: Imovel) => i.tipo_negocio === 'Venda'));
      }
    } else {
      setImoveis(mockImoveis.filter(i => i.tipo_negocio === 'Venda'));
    }
    setLoading(false);
  };

  const filteredImoveis = imoveis.filter(i =>
    i.endereco.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.bairro?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.cidade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.rua?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-primary/5">
      <header className="bg-card border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Imóveis à Venda</h1>
              <p className="text-sm text-muted-foreground">Todos os imóveis disponíveis para venda</p>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por endereço, bairro, cidade ou rua..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredImoveis.map((imovel) => (
            <Card 
              key={imovel.id} 
              className="hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02]"
              onClick={() => navigate(`/imoveis/${imovel.id}`)}
            >
              <CardHeader>
                <CardTitle className="text-lg flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    <span>{imovel.tipo}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${getSituacaoColor(imovel.situacao)}`}>
                    {imovel.situacao}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{imovel.endereco}</span>
                </div>
                {(imovel.bairro || imovel.cidade) && (
                  <div className="text-xs text-muted-foreground">
                    {imovel.bairro && <span>Bairro: {imovel.bairro}</span>}
                    {imovel.bairro && imovel.cidade && <span> | </span>}
                    {imovel.cidade && <span>Cidade: {imovel.cidade}</span>}
                  </div>
                )}
                {imovel.publicado_internet === 1 && (
                  <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                    <Globe className="w-3 h-3" />
                    Publicado na Internet
                  </Badge>
                )}
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Valor de Venda</span>
                  <span className="font-bold text-lg text-green-600">
                    R$ {imovel.valor_aluguel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {imovel.observacoes && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{imovel.observacoes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredImoveis.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Nenhum imóvel encontrado</p>
          </Card>
        )}
      </main>
    </div>
  );
};

export default ImoveisVenda;
