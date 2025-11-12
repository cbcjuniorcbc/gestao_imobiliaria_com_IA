import { useState, useEffect } from "react";
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
import { Imovel } from "@/types";

const EditarImovel = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  
  const [formData, setFormData] = useState({
    rua: "",
    numero: "",
    bairro: "",
    cidade: "",
    estado: "",
    cep: "",
    tipo: "Locação" as 'Venda' | 'Locação' | 'Ponto Comercial',
    valor: "",
    publicado_internet: false,
    situacao: "Disponível" as const,
    observacoes: ""
  });
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    loadImovel();
  }, [id]);

  const loadImovel = async () => {
    if (window.electronAPI) {
      const result = await (window.electronAPI as any).getImovelById(id);
      if (result.success && result.data) {
        const imovel = result.data;
        setFormData({
          rua: imovel.rua || "",
          numero: imovel.numero || "",
          bairro: imovel.bairro || "",
          cidade: imovel.cidade || "",
          estado: imovel.estado || "",
          cep: imovel.cep || "",
          tipo: imovel.tipo,
          valor: imovel.valor.toString(),
          publicado_internet: imovel.publicado_internet === 1,
          situacao: imovel.situacao,
          observacoes: imovel.observacoes || ""
        });
      }
    }
    setLoadingData(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.rua || !formData.numero || !formData.tipo || !formData.valor) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);
    
    try {
      if (window.electronAPI) {
        const result = await (window.electronAPI as any).updateImovel({
          id,
          endereco: `${formData.rua}, ${formData.numero} - ${formData.bairro} - ${formData.cidade}/${formData.estado}`,
          rua: formData.rua,
          numero: formData.numero,
          bairro: formData.bairro,
          cidade: formData.cidade,
          estado: formData.estado,
          cep: formData.cep,
          tipo: formData.tipo,
          valor: parseFloat(formData.valor),
          publicado_internet: formData.publicado_internet ? 1 : 0,
          situacao: formData.situacao,
          observacoes: formData.observacoes,
          user_id: user?.id,
          user_name: user?.username
        });

        if (result.success) {
          // Upload de novas fotos se houver
          if (selectedFiles.length > 0 && window.electronAPI && 'uploadFotosImovel' in window.electronAPI) {
            const filesData = await Promise.all(
              selectedFiles.map(async (file) => {
                const arrayBuffer = await file.arrayBuffer();
                return {
                  name: file.name,
                  data: Array.from(new Uint8Array(arrayBuffer))
                };
              })
            );
            
            await (window.electronAPI as any).uploadFotosImovel({
              imovelId: id,
              files: filesData
            });
          }
          
          toast.success("Imóvel atualizado com sucesso!");
          navigate(`/imoveis/${id}`);
        } else {
          toast.error(result.error || "Erro ao atualizar imóvel");
        }
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao atualizar imóvel");
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
          <h1 className="text-3xl font-bold">Editar Imóvel</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Dados do Imóvel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Imóvel *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, tipo: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Locação">Locação</SelectItem>
                    <SelectItem value="Venda">Venda</SelectItem>
                    <SelectItem value="Ponto Comercial">Ponto Comercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rua">Rua/Avenida/Logradouro *</Label>
                  <Input
                    id="rua"
                    name="rua"
                    value={formData.rua}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numero">Número *</Label>
                  <Input
                    id="numero"
                    name="numero"
                    value={formData.numero}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bairro">Bairro *</Label>
                  <Input
                    id="bairro"
                    name="bairro"
                    value={formData.bairro}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade *</Label>
                  <Input
                    id="cidade"
                    name="cidade"
                    value={formData.cidade}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estado">Estado *</Label>
                  <Input
                    id="estado"
                    name="estado"
                    maxLength={2}
                    placeholder="Ex: SP"
                    value={formData.estado}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    name="cep"
                    placeholder="00000-000"
                    value={formData.cep}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="valor">
                  {formData.tipo === 'Venda' ? 'Valor de Venda *' : 'Valor do Aluguel/Mensal *'}
                </Label>
                <Input
                  id="valor"
                  name="valor"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.valor}
                  onChange={handleInputChange}
                  required
                />
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
                    <SelectItem value="Vendido">Vendido</SelectItem>
                    <SelectItem value="Manutenção">Manutenção</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.tipo === 'Venda' && (
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
              
              <div className="space-y-2">
                <Label htmlFor="fotos">Adicionar Novas Fotos</Label>
                <Input
                  id="fotos"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                />
                {selectedFiles.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {selectedFiles.length} foto(s) selecionada(s)
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/")}
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

export default EditarImovel;
