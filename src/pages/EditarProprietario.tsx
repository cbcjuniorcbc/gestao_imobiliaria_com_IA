import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Proprietario } from "@/types";

const EditarProprietario = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  
  const [formData, setFormData] = useState({
    nome: "",
    cpf_cnpj: "",
    telefone: "",
    email: "",
    endereco: "",
    metodo_recebimento: "",
    observacoes: ""
  });

  useEffect(() => {
    loadProprietario();
  }, [id]);

  const loadProprietario = async () => {
    if (window.electronAPI?.getProprietarios) {
      const result = await window.electronAPI.getProprietarios();
      if (result.success) {
        const prop = result.data.find((p: Proprietario) => p.id === id);
        if (prop) {
          setFormData({
            nome: prop.nome,
            cpf_cnpj: prop.cpf_cnpj,
            telefone: prop.telefone,
            email: prop.email,
            endereco: prop.endereco,
            metodo_recebimento: prop.metodo_recebimento || "",
            observacoes: prop.observacoes || ""
          });
        }
      }
    }
    setLoadingData(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.cpf_cnpj || !formData.telefone || !formData.email || !formData.endereco) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);
    
    try {
      if (window.electronAPI) {
        const result = await (window.electronAPI as any).updateProprietario({
          id,
          ...formData,
          userId: user?.id,
          userName: user?.username
        });

        if (result.success) {
          toast.success("Proprietário atualizado com sucesso!");
          navigate(`/proprietarios/${id}`);
        } else {
          toast.error(result.error || "Erro ao atualizar proprietário");
        }
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao atualizar proprietário");
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-primary/5 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Editar Proprietário</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Dados do Proprietário</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Completo *</Label>
                  <Input
                    id="nome"
                    name="nome"
                    value={formData.nome}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpf_cnpj">CPF/CNPJ *</Label>
                  <Input
                    id="cpf_cnpj"
                    name="cpf_cnpj"
                    value={formData.cpf_cnpj}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone *</Label>
                  <Input
                    id="telefone"
                    name="telefone"
                    value={formData.telefone}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endereco">Endereço Completo *</Label>
                <Input
                  id="endereco"
                  name="endereco"
                  value={formData.endereco}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="metodo_recebimento">Método de Recebimento</Label>
                <Input
                  id="metodo_recebimento"
                  name="metodo_recebimento"
                  value={formData.metodo_recebimento}
                  onChange={handleInputChange}
                  placeholder="Ex: PIX, Transferência bancária..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  name="observacoes"
                  value={formData.observacoes}
                  onChange={handleInputChange}
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/proprietarios/${id}`)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
};

export default EditarProprietario;
