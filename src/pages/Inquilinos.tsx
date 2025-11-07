import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, Mail, Phone, User } from 'lucide-react';
import { Inquilino } from '@/types';
import { mockInquilinos } from '@/lib/mockData';

const Inquilinos = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [inquilinos, setInquilinos] = useState<Inquilino[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (window.electronAPI?.getInquilinos) {
      const result = await window.electronAPI.getInquilinos();
      if (result.success) {
        setInquilinos(result.data);
      }
    } else {
      setInquilinos(mockInquilinos);
    }
    setLoading(false);
  };

  const filteredInquilinos = inquilinos.filter(i =>
    i.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.cpf_cnpj.includes(searchTerm) ||
    i.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              <h1 className="text-2xl font-bold text-foreground">Inquilinos</h1>
              <p className="text-sm text-muted-foreground">Gerencie todos os inquilinos cadastrados</p>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CPF/CNPJ ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInquilinos.map((inquilino) => (
            <Card 
              key={inquilino.id} 
              className="hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02]"
              onClick={() => navigate(`/inquilinos/${inquilino.id}`)}
            >
              <CardHeader>
                <CardTitle className="flex items-start justify-between">
                  <span className="text-lg">{inquilino.nome}</span>
                  <div className="text-xs font-normal text-muted-foreground bg-primary/10 px-2 py-1 rounded">
                    {inquilino.cpf_cnpj}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{inquilino.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>{inquilino.telefone}</span>
                </div>
                {inquilino.renda_aproximada && (
                  <div className="text-sm pt-2 border-t">
                    <span className="text-muted-foreground">Renda: </span>
                    <span className="font-medium text-green-600">
                      R$ {inquilino.renda_aproximada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredInquilinos.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Nenhum inquilino encontrado</p>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Inquilinos;
