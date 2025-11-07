import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Boletos = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Boletos</h1>

      <Card>
        <CardHeader>
          <CardTitle>Gestão de Boletos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Página de boletos em desenvolvimento.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Boletos;
