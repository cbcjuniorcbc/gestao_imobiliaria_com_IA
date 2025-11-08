import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileSignature, Trash2 } from "lucide-react";
import { ContratoAvulso } from '@/types';
import { mockContratosAvulsos } from '@/lib/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ContratosAvulsos = () => {
  const { user, isAdmin } = useAuth();
  const [contratos, setContratos] = useState<ContratoAvulso[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [contratoToDelete, setContratoToDelete] = useState<string | null>(null);
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('todos');
  const [mesSelecionado, setMesSelecionado] = useState<string>('');
  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    descricao: '',
    valor: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (window.electronAPI) {
      const result = await (window.electronAPI as any).getContratosAvulsos();
      if (result.success) {
        setContratos(result.data);
      }
    } else {
      // Fallback para mock
      setContratos(mockContratosAvulsos);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.descricao || !formData.valor) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    if (!window.electronAPI || !user) {
      toast({
        title: "Erro",
        description: "Funcionalidade não disponível",
        variant: "destructive"
      });
      return;
    }

    const result = await (window.electronAPI as any).createContratoAvulso({
      data: formData.data,
      descricao: formData.descricao,
      valor: parseFloat(formData.valor),
      userId: user.id,
      userName: user.username
    });

    if (result.success) {
      toast({
        title: "Sucesso",
        description: "Contrato avulso registrado com sucesso",
      });
      setDialogOpen(false);
      setFormData({
        data: new Date().toISOString().split('T')[0],
        descricao: '',
        valor: ''
      });
      loadData();
    } else {
      toast({
        title: "Erro",
        description: "Falha ao registrar contrato avulso",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (contratoId: string) => {
    if (!window.electronAPI || !user) return;

    const result = await (window.electronAPI as any).deleteContratoAvulso({
      contratoId,
      userId: user.id,
      userName: user.username
    });

    if (result.success) {
      toast({
        title: "Sucesso",
        description: "Contrato avulso excluído com sucesso",
      });
      setContratoToDelete(null);
      loadData();
    } else {
      toast({
        title: "Erro",
        description: "Falha ao excluir contrato avulso",
        variant: "destructive"
      });
    }
  };

  const filterByPeriod = (contrato: ContratoAvulso) => {
    if (filtroPeriodo === 'todos') return true;
    
    const dataContrato = new Date(contrato.data);
    const hoje = new Date();
    
    if (filtroPeriodo === 'dia') {
      return dataContrato.toDateString() === hoje.toDateString();
    }
    
    if (filtroPeriodo === 'semana') {
      const inicioSemana = new Date(hoje);
      inicioSemana.setDate(hoje.getDate() - hoje.getDay());
      const fimSemana = new Date(inicioSemana);
      fimSemana.setDate(inicioSemana.getDate() + 6);
      return dataContrato >= inicioSemana && dataContrato <= fimSemana;
    }
    
    if (filtroPeriodo === 'mes') {
      return dataContrato.getMonth() === hoje.getMonth() && 
             dataContrato.getFullYear() === hoje.getFullYear();
    }
    
    if (filtroPeriodo === 'mes-especifico' && mesSelecionado) {
      const [ano, mes] = mesSelecionado.split('-');
      return dataContrato.getMonth() === parseInt(mes) - 1 && 
             dataContrato.getFullYear() === parseInt(ano);
    }
    
    return true;
  };

  const contratosFiltrados = contratos.filter(filterByPeriod);
  const contratosHoje = contratosFiltrados.filter(c => c.data === new Date().toISOString().split('T')[0]);
  const totalHoje = contratosHoje.reduce((acc, c) => acc + c.valor, 0);
  const totalGeral = contratosFiltrados.reduce((acc, c) => acc + c.valor, 0);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><p className="text-muted-foreground">Carregando...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contratos Avulsos</h1>
          <p className="text-muted-foreground mt-1">Registro de contratos e serviços avulsos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Contrato
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Contrato Avulso</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Data</label>
                <Input
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Descrição</label>
                <Textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descreva o contrato ou serviço..."
                  required
                  rows={4}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Valor (R$)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Registrar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileSignature className="w-4 h-4 text-blue-600" />
              Contratos Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{contratosHoje.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileSignature className="w-4 h-4 text-green-600" />
              Valor Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              R$ {totalHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileSignature className="w-4 h-4 text-purple-600" />
              Total Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-600">
              R$ {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <CardTitle>Histórico de Contratos</CardTitle>
            <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
              <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Filtrar por período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Períodos</SelectItem>
                  <SelectItem value="dia">Hoje</SelectItem>
                  <SelectItem value="semana">Esta Semana</SelectItem>
                  <SelectItem value="mes">Este Mês</SelectItem>
                  <SelectItem value="mes-especifico">Mês Específico</SelectItem>
                </SelectContent>
              </Select>
              {filtroPeriodo === 'mes-especifico' && (
                <Input
                  type="month"
                  value={mesSelecionado}
                  onChange={(e) => setMesSelecionado(e.target.value)}
                  className="w-full md:w-[200px]"
                />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {contratosFiltrados.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Registrado Por</TableHead>
                    {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contratosFiltrados.map((contrato) => (
                    <TableRow key={contrato.id}>
                      <TableCell className="font-medium">
                        {new Date(contrato.data).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>{contrato.descricao}</TableCell>
                      <TableCell className="text-green-600 font-semibold">
                        R$ {contrato.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>{contrato.registrado_por}</TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => setContratoToDelete(contrato.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Nenhum contrato avulso encontrado para o período selecionado</p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!contratoToDelete} onOpenChange={() => setContratoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este contrato avulso? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => contratoToDelete && handleDelete(contratoToDelete)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ContratosAvulsos;
