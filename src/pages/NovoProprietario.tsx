import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const NovoProprietario = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/proprietarios")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">Novo Proprietário</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cadastrar Proprietário</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Formulário de cadastro em desenvolvimento.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default NovoProprietario;
