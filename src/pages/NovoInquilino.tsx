import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Upload, FileText } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const NovoInquilino = () => {
  const navigate = useNavigate();
  const { imovelId } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [documentos, setDocumentos] = useState<File[]>([]);
  
  const [formData, setFormData] = useState({
    nome: "",
    cpf: "",
    rg: "",
    cpf_cnpj: "",
    telefone: "",
    email: "",
    renda_aproximada: "",
    data_inicio: "",
    data_termino: "",
    observacoes: ""
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setDocumentos(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setDocumentos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.cpf_cnpj || !formData.telefone || !formData.email || !formData.data_inicio) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);
    
    try {
      if (window.electronAPI) {
        const result = await (window.electronAPI as any).createInquilino({
          ...formData,
          imovel_id: imovelId,
          renda_aproximada: formData.renda_aproximada ? parseFloat(formData.renda_aproximada) : null,
          user_id: user?.id,
          user_name: user?.username
        });

        if (result.success) {
          const inquilinoId = result.id;

          // Upload dos documentos se houver
          if (documentos.length > 0) {
            for (const file of documentos) {
              const fileData = await file.arrayBuffer();
              await (window.electronAPI as any).uploadDocumento({
                ownerType: 'inquilino',
                ownerId: inquilinoId,
                file: {
                  name: file.name,
                  data: Array.from(new Uint8Array(fileData))
                },
                userId: user?.id
              });
            }
          }

          toast.success("Inquilino cadastrado com sucesso!");
          navigate(`/imoveis/${imovelId}`);
        } else {
          toast.error(result.error || "Erro ao cadastrar inquilino");
        }
      } else {
        toast.error("Funcionalidade não disponível no modo web");
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao cadastrar inquilino");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-primary/5 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/imoveis/${imovelId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Novo Inquilino</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Dados do Inquilino</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    name="cpf"
                    value={formData.cpf}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rg">RG</Label>
                  <Input
                    id="rg"
                    name="rg"
                    value={formData.rg}
                    onChange={handleInputChange}
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
                <Label htmlFor="renda_aproximada">Renda Aproximada (R$)</Label>
                <Input
                  id="renda_aproximada"
                  name="renda_aproximada"
                  type="number"
                  step="0.01"
                  value={formData.renda_aproximada}
                  onChange={handleInputChange}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data_inicio">Data de Início *</Label>
                  <Input
                    id="data_inicio"
                    name="data_inicio"
                    type="date"
                    value={formData.data_inicio}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_termino">Data de Término</Label>
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

              <div className="space-y-2">
                <Label>Documentos</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Clique para selecionar documentos
                    </p>
                  </label>
                </div>
                {documentos.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {documentos.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-secondary/50 rounded">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          <span className="text-sm">{file.name}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          Remover
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/imoveis/${imovelId}`)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Cadastrando..." : "Cadastrar Inquilino"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
};

export default NovoInquilino;
