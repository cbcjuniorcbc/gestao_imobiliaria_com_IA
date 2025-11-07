import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { mockProprietarios } from '@/lib/mockData';
import { ArrowLeft, Search, Plus, Mail, Phone, MapPin, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';

const Proprietarios = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [proprietarios, setProprietarios] = useState(mockProprietarios);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [proprietarioToDelete, setProprietarioToDelete] = useState<string | null>(null);

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

  const handleDelete = async () => {
    if (!proprietarioToDelete || !user) return;
    
    try {
      if (window.electronAPI) {
        const result = await (window.electronAPI as any).deleteProprietario({ 
          id: proprietarioToDelete,
          userId: user.id,
          userName: user.username
        });
        if (result.success) {
          toast.success('Proprietário removido com sucesso!');
          loadProprietarios();
        } else {
          toast.error(result.error || 'Erro ao remover proprietário');
        }
      }
    } catch (error) {
      toast.error('Erro ao remover proprietário');
    } finally {
      setDeleteDialogOpen(false);
      setProprietarioToDelete(null);
    }
  };

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
              className="hover:shadow-lg transition-all cursor-pointer"
              onClick={() => navigate(`/proprietarios/${proprietario.id}`)}
            >
              <CardHeader>
                <CardTitle className="flex items-start justify-between">
                  <span className="text-lg">{proprietario.nome}</span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); navigate(`/proprietarios/${proprietario.id}/editar`); }}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setProprietarioToDelete(proprietario.id); setDeleteDialogOpen(true); }}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este proprietário? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Proprietarios;
