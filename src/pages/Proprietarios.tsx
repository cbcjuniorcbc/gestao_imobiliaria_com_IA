import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { mockProprietarios } from '@/lib/mockData';
import { ArrowLeft, Search, Plus, Mail, Phone, MapPin } from 'lucide-react';

const Proprietarios = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [proprietarios, setProprietarios] = useState(mockProprietarios);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProprietarios();
  }, []);

  const loadProprietarios = async () => {
    if (window.electronAPI?.getProprietarios) {
      const result = await window.electronAPI.getProprietarios();
      if (result.success) {
        setProprietarios(result.data);
      }
    } else {
      setProprietarios(mockProprietarios);
    }
    setLoading(false);
  };

  const filteredProprietarios = proprietarios.filter(p =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.cpf_cnpj.includes(searchTerm) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-primary/5">
      <header className="bg-card border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Proprietários</h1>
              <p className="text-sm text-muted-foreground">Gerencie os proprietários cadastrados</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CPF/CNPJ ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => navigate('/proprietarios/novo')}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Proprietário
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Carregando proprietários...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProprietarios.map((proprietario) => (
            <Card 
              key={proprietario.id} 
              className="hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02]"
              onClick={() => navigate(`/proprietarios/${proprietario.id}`)}
            >
              <CardHeader>
                <CardTitle className="flex items-start justify-between">
                  <span className="text-lg">{proprietario.nome}</span>
                  <div className="text-xs font-normal text-muted-foreground bg-primary/10 px-2 py-1 rounded">
                    {proprietario.cpf_cnpj}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{proprietario.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>{proprietario.telefone}</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2">{proprietario.endereco}</span>
                </div>
              </CardContent>
            </Card>
          ))}
          </div>
        )}

        {!loading && filteredProprietarios.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Nenhum proprietário encontrado</p>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Proprietarios;
