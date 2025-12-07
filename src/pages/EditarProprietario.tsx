import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Upload, FileText, Trash2, Download } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Proprietario, Documento } from "@/types";

const EditarProprietario = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
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

  const [existingDocumentos, setExistingDocumentos] = useState<Documento[]>([]);
  const [selectedNewDocumentos, setSelectedNewDocumentos] = useState<File[]>([]);

  useEffect(() => {
    loadProprietario();
  }, [id]);

  const loadProprietario = async () => {
    if (window.electronAPI) {
      const result = await (window.electronAPI as any).getProprietarioById(id);
      if (result.success && result.data) {
        const prop = result.data;
        setFormData({
          nome: prop.nome,
          cpf_cnpj: prop.cpf_cnpj,
          telefone: prop.telefone,
          email: prop.email,
          endereco: prop.endereco,
          metodo_recebimento: prop.metodo_recebimento || "",
          observacoes: prop.observacoes || ""
        });
        setExistingDocumentos(prop.documentos || []);
      } else {
        toast.error(result.error || "Erro ao carregar proprietário");
      }
    } else {
      toast.error("Funcionalidade não disponível no modo web");
    }
    setLoadingData(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNewFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedNewDocumentos(prev => [...prev, ...newFiles]);
    }
  };

  const removeNewFile = (index: number) => {
    setSelectedNewDocumentos(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteExistingDocument = async (documentoId: string, filename: string) => {
    if (!window.electronAPI || !window.confirm(`Tem certeza que deseja deletar o documento "${filename}"?`)) return;

    try {
      const result = await (window.electronAPI as any).deleteDocumento(documentoId);
      if (result.success) {
        toast.success(`Documento "${filename}" deletado com sucesso!`);
        setExistingDocumentos(prev => prev.filter(doc => doc.id !== documentoId));
      } else {
        toast.error(result.error || 'Erro ao deletar documento');
      }
    } catch (error) {
      console.error('Erro ao deletar documento:', error);
      toast.error('Erro ao deletar documento');
    }
  };

  const handleDownloadDocument = async (documentoId: string, filename: string) => {
    try {
      if (window.electronAPI) {
        const result = await (window.electronAPI as any).downloadDocumento(documentoId);
        if (result.success) {
          const blob = new Blob([new Uint8Array(result.data.buffer)]);
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          toast.success('Download realizado com sucesso!');
        } else {
          toast.error(result.error || 'Erro ao fazer download');
        }
      }
    } catch (error) {
      console.error('Erro ao fazer download:', error);
      toast.error('Erro ao fazer download do documento');
    }
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
        const anexosToUpload = [];

        for (const file of selectedNewDocumentos) {
          const arrayBuffer = await file.arrayBuffer();
          anexosToUpload.push({
            name: file.name,
            data: Array.from(new Uint8Array(arrayBuffer)),
            type: 'documento'
          });
        }

        const result = await (window.electronAPI as any).updateProprietario({
          id,
          ...formData,
          user_id: user?.id,
          user_name: user?.username,
          anexos: anexosToUpload
        });

        if (result.success) {
          toast.success(result.message || "Proprietário atualizado com sucesso!");
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
              
              <div className="space-y-2">
                <Label>Documentos Atuais</Label>
                <div className="space-y-2">
                  {existingDocumentos.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-2 border rounded-md">
                      <span className="truncate">{doc.filename}</span>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleDownloadDocument(doc.id, doc.filename)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteExistingDocument(doc.id, doc.filename)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {existingDocumentos.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhum documento encontrado.</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Adicionar Novos Documentos</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    multiple
                    onChange={handleNewFileSelect}
                    className="hidden"
                    id="new-file-upload"
                  />
                  <label htmlFor="new-file-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Clique para selecionar novos documentos
                    </p>
                  </label>
                </div>
                {selectedNewDocumentos.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {selectedNewDocumentos.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-secondary/50 rounded">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          <span className="text-sm">{file.name}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeNewFile(index)}
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
