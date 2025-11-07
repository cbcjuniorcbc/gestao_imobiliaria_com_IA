import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, MapPin, Building2, CheckCircle2 } from 'lucide-react';
import { Imovel } from '@/types';
import { mockImoveis } from '@/lib/mockData';

const ImoveisPontoComercial = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (window.electronAPI?.getImoveis) {
      const result = await window.electronAPI.getImoveis();
      if (result.success) {
        const filtered = result.data.filter((i: Imovel) => i.tipo === 'Ponto Comercial');
        setImoveis(filtered);
      }
    } else {
      const filtered = mockImoveis.filter(i => i.tipo === 'Ponto Comercial');
      setImoveis(filtered);
    }
    setLoading(false);
  };

  const filteredImoveis = imoveis.filter(i =>
    i.endereco.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.bairro?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.cidade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.estado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
              <h1 className="text-2xl font-bold text-foreground">Pontos Comerciais</h1>
              <p className="text-sm text-muted-foreground">Todos os pontos comerciais cadastrados</p>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por endereço, bairro, cidade, estado ou rua..."
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
                    <span>Ponto Comercial</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${getSituacaoColor(imovel.situacao)}`}>
                    {imovel.situacao}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium">{imovel.rua} {imovel.numero && `, ${imovel.numero}`}</p>
                    <p className="text-muted-foreground">
                      {imovel.bairro} - {imovel.cidade}/{imovel.estado}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Valor Mensal</span>
                  <span className="font-bold text-lg text-green-600">
                    R$ {imovel.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {imovel.publicado_internet === 1 && (
                  <div className="flex items-center gap-2 text-xs text-blue-600 pt-2 border-t">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Publicado na Internet</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredImoveis.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Nenhum ponto comercial encontrado</p>
          </Card>
        )}
      </main>
    </div>
  );
};

export default ImoveisPontoComercial;
