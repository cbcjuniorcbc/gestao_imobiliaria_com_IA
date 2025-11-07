import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search } from 'lucide-react';
import { Imovel } from '@/types';
import { mockImoveis } from '@/lib/mockData';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ImovelCard } from '@/components/ImovelCard';
import { useAuth } from '@/contexts/AuthContext';

const ImoveisPontoComercial = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [imovelToDelete, setImovelToDelete] = useState<string | null>(null);

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

  const handleDelete = async () => {
    if (!imovelToDelete || !user) return;
    
    try {
      if (window.electronAPI) {
        const result = await (window.electronAPI as any).deleteImovel({ 
          id: imovelToDelete,
          userId: user.id,
          userName: user.username
        });
        if (result.success) {
          toast.success('Ponto comercial removido com sucesso!');
          loadData();
        } else {
          toast.error(result.error || 'Erro ao remover ponto comercial');
        }
      }
    } catch (error) {
      toast.error('Erro ao remover ponto comercial');
    } finally {
      setDeleteDialogOpen(false);
      setImovelToDelete(null);
    }
  };

  const openDeleteDialog = (id: string) => {
    setImovelToDelete(id);
    setDeleteDialogOpen(true);
  };

  const filteredImoveis = imoveis.filter(i =>
    i.endereco.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.bairro?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.cidade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.estado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.rua?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><p className="text-muted-foreground">Carregando...</p></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-primary/5">
      <header className="bg-card border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" size="icon" onClick={() => navigate('/')}>
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
            <ImovelCard key={imovel.id} imovel={imovel} onDelete={openDeleteDialog} isAdmin={isAdmin} />
          ))}
        </div>

        {filteredImoveis.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Nenhum ponto comercial encontrado</p>
          </Card>
        )}
      </main>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este ponto comercial? Esta ação não pode ser desfeita.
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

export default ImoveisPontoComercial;
