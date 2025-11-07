import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, Mail, Phone, Edit, Trash2 } from 'lucide-react';
import { Inquilino } from '@/types';
import { mockInquilinos } from '@/lib/mockData';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';

const Inquilinos = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [inquilinos, setInquilinos] = useState<Inquilino[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [inquilinoToDelete, setInquilinoToDelete] = useState<string | null>(null);

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

  const handleDelete = async () => {
    if (!inquilinoToDelete || !user) return;
    
    try {
      if (window.electronAPI) {
        const result = await (window.electronAPI as any).deleteInquilino({ 
          id: inquilinoToDelete,
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
    } catch (error) {
      toast.error('Erro ao remover inquilino');
    } finally {
      setDeleteDialogOpen(false);
      setInquilinoToDelete(null);
    }
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
            <Button variant="outline" size="icon" onClick={() => navigate('/')}>
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
            <Card key={inquilino.id} className="hover:shadow-lg transition-all">
              <CardHeader>
                <CardTitle className="flex items-start justify-between">
                  <span className="text-lg cursor-pointer" onClick={() => navigate(`/inquilinos/${inquilino.id}`)}>{inquilino.nome}</span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); navigate(`/inquilinos/${inquilino.id}/editar`); }}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setInquilinoToDelete(inquilino.id); setDeleteDialogOpen(true); }}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este inquilino? Esta ação não pode ser desfeita.
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

export default Inquilinos;
