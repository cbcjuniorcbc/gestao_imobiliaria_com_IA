import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const NovoImovel = () => {
  const navigate = useNavigate();
  const { proprietarioId } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    endereco: "",
    rua: "",
    bairro: "",
    cidade: "",
    tipo: "",
    tipo_negocio: "Aluguel" as 'Aluguel' | 'Venda',
    valor_aluguel: "",
    publicado_internet: false,
    situacao: "Disponível" as const,
    observacoes: ""
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.endereco || !formData.tipo || !formData.valor_aluguel) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);
    
    try {
      if (window.electronAPI && 'createImovel' in window.electronAPI) {
        const result = await (window.electronAPI as any).createImovel({
          proprietario_id: proprietarioId,
          endereco: formData.endereco,
          rua: formData.rua,
          bairro: formData.bairro,
          cidade: formData.cidade,
          tipo: formData.tipo,
          tipo_negocio: formData.tipo_negocio,
          valor_aluguel: parseFloat(formData.valor_aluguel),
          publicado_internet: formData.publicado_internet ? 1 : 0,
          situacao: formData.situacao,
          observacoes: formData.observacoes,
          user_id: user?.id,
          user_name: user?.username
        });

        if (result.success) {
          toast.success("Imóvel cadastrado com sucesso!");
          navigate(`/proprietarios/${proprietarioId}`);
        } else {
          toast.error(result.error || "Erro ao cadastrar imóvel");
        }
      } else {
        toast.error("Funcionalidade não disponível no modo web");
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao cadastrar imóvel");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-primary/5 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/proprietarios/${proprietarioId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Novo Imóvel</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Dados do Imóvel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tipo_negocio">Tipo de Negócio *</Label>
                <Select
                  value={formData.tipo_negocio}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, tipo_negocio: value as 'Aluguel' | 'Venda' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aluguel">Aluguel</SelectItem>
                    <SelectItem value="Venda">Venda</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo de Imóvel *</Label>
                  <Input
                    id="tipo"
                    name="tipo"
                    placeholder="Ex: Casa, Apartamento, Comercial"
                    value={formData.tipo}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valor_aluguel">
                    {formData.tipo_negocio === 'Aluguel' ? 'Valor do Aluguel *' : 'Valor de Venda *'}
                  </Label>
                  <Input
                    id="valor_aluguel"
                    name="valor_aluguel"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.valor_aluguel}
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rua">Rua</Label>
                  <Input
                    id="rua"
                    name="rua"
                    value={formData.rua}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input
                    id="bairro"
                    name="bairro"
                    value={formData.bairro}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    name="cidade"
                    value={formData.cidade}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="situacao">Situação *</Label>
                <Select
                  value={formData.situacao}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, situacao: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Disponível">Disponível</SelectItem>
                    <SelectItem value="Locado">Locado</SelectItem>
                    <SelectItem value="Manutenção">Manutenção</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.tipo_negocio === 'Venda' && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="publicado_internet"
                    checked={formData.publicado_internet}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, publicado_internet: checked as boolean }))
                    }
                  />
                  <Label htmlFor="publicado_internet" className="cursor-pointer">
                    Publicado na Internet
                  </Label>
                </div>
              )}

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
                  onClick={() => navigate(`/proprietarios/${proprietarioId}`)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Cadastrando..." : "Cadastrar Imóvel"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
};

export default NovoImovel;
