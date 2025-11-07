import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ContratosAvulsos = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Contratos Avulsos</h1>

      <Card>
        <CardHeader>
          <CardTitle>Gestão de Contratos Avulsos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Página de contratos avulsos em desenvolvimento.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContratosAvulsos;
