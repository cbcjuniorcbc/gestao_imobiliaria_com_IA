import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Building2, Edit, Trash2 } from 'lucide-react';
import { Imovel } from '@/types';

interface ImovelCardProps {
  imovel: Imovel;
  onDelete: (id: string) => void;
}

export const ImovelCard = ({ imovel, onDelete }: ImovelCardProps) => {
  const navigate = useNavigate();

  const getSituacaoColor = (situacao: string) => {
    switch (situacao) {
      case 'Locado': return 'bg-green-100 text-green-800';
      case 'Disponível': return 'bg-blue-100 text-blue-800';
      case 'Manutenção': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getValorLabel = () => {
    if (imovel.tipo === 'Venda') return 'Valor de Venda';
    if (imovel.tipo === 'Locação') return 'Valor do Aluguel';
    return 'Valor Mensal';
  };

  return (
    <Card className="hover:shadow-lg transition-all">
      <CardHeader>
        <CardTitle className="text-lg flex items-start justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(`/imoveis/${imovel.id}`)}>
            <Building2 className="w-5 h-5" />
            <span>{imovel.tipo}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded ${getSituacaoColor(imovel.situacao)}`}>
              {imovel.situacao}
            </span>
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); navigate(`/imoveis/${imovel.id}/editar`); }}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(imovel.id); }}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-2 cursor-pointer" onClick={() => navigate(`/imoveis/${imovel.id}`)}>
          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <span className="text-sm">{imovel.endereco}</span>
        </div>
        {(imovel.bairro || imovel.cidade) && (
          <div className="text-xs text-muted-foreground">
            {imovel.bairro && <span>Bairro: {imovel.bairro}</span>}
            {imovel.bairro && imovel.cidade && <span> | </span>}
            {imovel.cidade && <span>Cidade: {imovel.cidade}</span>}
          </div>
        )}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm text-muted-foreground">{getValorLabel()}</span>
          <span className="font-bold text-lg text-green-600">
            R$ {imovel.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
        {imovel.observacoes && (
          <p className="text-xs text-muted-foreground line-clamp-2">{imovel.observacoes}</p>
        )}
      </CardContent>
    </Card>
  );
};
