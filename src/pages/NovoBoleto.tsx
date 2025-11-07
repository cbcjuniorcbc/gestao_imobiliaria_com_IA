import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const NovoBoleto = () => {
  const navigate = useNavigate();
  const { inquilinoId } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    acao: "Aluguel",
    valor_total: "",
    forma_pagamento: "Boleto",
    data_vencimento: "",
    data_inicio: "",
    data_termino: "",
    observacoes: ""
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.acao || !formData.valor_total || !formData.data_vencimento) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);
    
    try {
      if (window.electronAPI) {
        const result = await (window.electronAPI as any).createBoleto({
          inquilino_id: inquilinoId,
          ...formData,
          valor_total: parseFloat(formData.valor_total),
          user_id: user?.id,
          user_name: user?.username
        });

        if (result.success) {
          toast.success("Boleto registrado com sucesso!");
          navigate(`/inquilinos/${inquilinoId}`);
        } else {
          toast.error(result.error || "Erro ao registrar boleto");
        }
      } else {
        toast.error("Funcionalidade não disponível no modo web");
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao registrar boleto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-primary/5 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/inquilinos/${inquilinoId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Registrar Boleto</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Dados do Boleto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="acao">Descrição *</Label>
                <Input
                  id="acao"
                  name="acao"
                  value={formData.acao}
                  onChange={handleInputChange}
                  placeholder="Ex: Aluguel, Condomínio, IPTU..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valor_total">Valor Total (R$) *</Label>
                  <Input
                    id="valor_total"
                    name="valor_total"
                    type="number"
                    step="0.01"
                    value={formData.valor_total}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="forma_pagamento">Forma de Pagamento *</Label>
                  <Select
                    value={formData.forma_pagamento}
                    onValueChange={(value) => handleSelectChange('forma_pagamento', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Boleto">Boleto</SelectItem>
                      <SelectItem value="PIX">PIX</SelectItem>
                      <SelectItem value="Transferência">Transferência</SelectItem>
                      <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="Cartão">Cartão</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_vencimento">Data de Vencimento *</Label>
                <Input
                  id="data_vencimento"
                  name="data_vencimento"
                  type="date"
                  value={formData.data_vencimento}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data_inicio">Período Início</Label>
                  <Input
                    id="data_inicio"
                    name="data_inicio"
                    type="date"
                    value={formData.data_inicio}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_termino">Período Fim</Label>
                  <Input
                    id="data_termino"
                    name="data_termino"
                    type="date"
                    value={formData.data_termino}
                    onChange={handleInputChange}
                  />
                </div>
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
                  onClick={() => navigate(`/inquilinos/${inquilinoId}`)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Registrando..." : "Registrar Boleto"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
};

export default NovoBoleto;
