import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Users, Lock, Database, Trash2 } from 'lucide-react';

interface Usuario {
  id: string;
  username: string;
  role: string;
  created_at: string;
}

const Configuracoes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);

  // Formulário novo usuário
  const [novoUsername, setNovoUsername] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [novoRole, setNovoRole] = useState('recepcao');

  // Formulário alterar senha
  const [senhaUsuarioId, setSenhaUsuarioId] = useState<string | null>(null);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [senhaNova, setSenhaNova] = useState('');
  const [senhaConfirma, setSenhaConfirma] = useState('');

  // Configuração do banco de dados
  const [dbPath, setDbPath] = useState<string>('');

  useEffect(() => {
    carregarUsuarios();
    carregarDbPath();
  }, []);

  const carregarDbPath = async () => {
    if (window.electronAPI && 'getDbPath' in window.electronAPI) {
      const path = await (window.electronAPI as any).getDbPath();
      setDbPath(path);
    }
  };

  const carregarUsuarios = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.getUsuarios();
      if (result.success && result.users) {
        setUsuarios(result.users);
      }
    }
  };

  const handleCriarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.createUsuario({
          username: novoUsername,
          password: novaSenha,
          role: novoRole
        });

        if (result.success) {
          toast({
            title: 'Usuário criado',
            description: `Usuário ${novoUsername} criado com sucesso!`,
          });
          setNovoUsername('');
          setNovaSenha('');
          setNovoRole('recepcao');
          carregarUsuarios();
        } else {
          toast({
            title: 'Erro',
            description: result.message || 'Erro ao criar usuário',
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao criar usuário',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAlterarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (senhaNova !== senhaConfirma) {
      toast({
        title: 'Erro',
        description: 'As senhas não coincidem',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      if (window.electronAPI && senhaUsuarioId) {
        const result = await window.electronAPI.updatePassword({
          userId: senhaUsuarioId,
          newPassword: senhaNova
        });

        if (result.success) {
          toast({
            title: 'Senha alterada',
            description: 'Senha alterada com sucesso!',
          });
          setSenhaUsuarioId(null);
          setSenhaAtual('');
          setSenhaNova('');
          setSenhaConfirma('');
        } else {
          toast({
            title: 'Erro',
            description: result.message || 'Erro ao alterar senha',
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao alterar senha',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelecionarPasta = async () => {
    if (window.electronAPI && 'selectDbFolder' in window.electronAPI) {
      const result = await (window.electronAPI as any).selectDbFolder();
      if (result.success) {
        toast({
          title: 'Pasta selecionada',
          description: 'O aplicativo será reiniciado para aplicar as mudanças.',
        });
      } else {
        toast({
          title: 'Erro',
          description: result.error || 'Erro ao selecionar pasta',
          variant: 'destructive',
        });
      }
    }
  };

  if (!user?.role || user.role !== 'admin') {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>Apenas administradores podem acessar as configurações.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="w-8 h-8" />
          Configurações do Sistema
        </h1>
        <p className="text-muted-foreground mt-2">
          Gerencie usuários e configurações do sistema
        </p>
      </div>

      <Tabs defaultValue="usuarios" className="space-y-4">
        <TabsList>
          <TabsTrigger value="usuarios">
            <Users className="w-4 h-4 mr-2" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="senha">
            <Lock className="w-4 h-4 mr-2" />
            Alterar Senha
          </TabsTrigger>
          <TabsTrigger value="database">
            <Database className="w-4 h-4 mr-2" />
            Banco de Dados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Criar Novo Usuário</CardTitle>
                <CardDescription>
                  Adicione novos usuários ao sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCriarUsuario} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="novo-username">Nome de Usuário</Label>
                    <Input
                      id="novo-username"
                      value={novoUsername}
                      onChange={(e) => setNovoUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nova-senha">Senha (opcional)</Label>
                    <Input
                      id="nova-senha"
                      type="password"
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      placeholder="Deixe em branco para sem senha"
                    />
                    <p className="text-sm text-muted-foreground">
                      Se deixar em branco, o usuário poderá fazer login sem senha
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="novo-role">Função</Label>
                    <Select value={novoRole} onValueChange={setNovoRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="recepcao">Recepção</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Criando...' : 'Criar Usuário'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Usuários Cadastrados</CardTitle>
                <CardDescription>
                  Lista de todos os usuários do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {usuarios.map((usuario) => (
                    <div
                      key={usuario.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-semibold">{usuario.username}</p>
                        <p className="text-sm text-muted-foreground">
                          {usuario.role === 'admin' ? 'Administrador' : 'Recepção'}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          if (usuario.id === user?.id) {
                            toast({
                              title: 'Erro',
                              description: 'Você não pode deletar seu próprio usuário',
                              variant: 'destructive',
                            });
                            return;
                          }
                          
                          if (window.confirm(`Tem certeza que deseja excluir o usuário ${usuario.username}?`)) {
                            const result = await (window.electronAPI as any).deleteUsuario({ userId: usuario.id });
                            if (result.success) {
                              toast({
                                title: 'Sucesso',
                                description: 'Usuário excluído com sucesso!',
                              });
                              carregarUsuarios();
                            } else {
                              toast({
                                title: 'Erro',
                                description: result.message || 'Erro ao excluir usuário',
                                variant: 'destructive',
                              });
                            }
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="senha" className="space-y-4">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Alterar Senha</CardTitle>
              <CardDescription>
                Altere a senha de qualquer usuário
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAlterarSenha} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="usuario-senha">Usuário</Label>
                  <Select
                    value={senhaUsuarioId || ''}
                    onValueChange={(value) => setSenhaUsuarioId(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      {usuarios.map((usuario) => (
                        <SelectItem key={usuario.id} value={usuario.id}>
                          {usuario.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senha-nova">Nova Senha</Label>
                  <Input
                    id="senha-nova"
                    type="password"
                    value={senhaNova}
                    onChange={(e) => setSenhaNova(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senha-confirma">Confirmar Nova Senha</Label>
                  <Input
                    id="senha-confirma"
                    type="password"
                    value={senhaConfirma}
                    onChange={(e) => setSenhaConfirma(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading || !senhaUsuarioId}>
                  {loading ? 'Alterando...' : 'Alterar Senha'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Local do Banco de Dados</CardTitle>
              <CardDescription>
                Configure onde os dados serão salvos. Você pode apontar para uma pasta do Google Drive ou qualquer outro local no seu computador.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Pasta atual</Label>
                <div className="p-3 bg-secondary/20 rounded-md">
                  <p className="text-sm font-mono break-all">{dbPath || 'Carregando...'}</p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <Button onClick={handleSelecionarPasta} variant="default">
                  Selecionar Nova Pasta
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Após selecionar, o aplicativo será reiniciado automaticamente.
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md p-4 mt-4">
                <h4 className="font-semibold text-sm mb-2">💡 Dica: Google Drive</h4>
                <p className="text-sm text-muted-foreground">
                  Se você instalou o Google Drive no seu computador, pode selecionar uma pasta dentro dele. 
                  Assim seus dados ficam sincronizados na nuvem automaticamente!
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Configuracoes;
