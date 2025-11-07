import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

const ProprietarioDetalhes = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/proprietarios")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">Detalhes do Proprietário</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Proprietário ID: {id}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Página de detalhes em desenvolvimento.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProprietarioDetalhes;
