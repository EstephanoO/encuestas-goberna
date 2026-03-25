import { CheckCircle2, BarChart2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export function VoteSuccessState() {
  return (
    <div className="flex flex-col items-center gap-6 py-12 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
        <CheckCircle2 className="h-10 w-10 text-green-600" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-foreground">¡Gracias por participar!</h2>
        <p className="mt-2 text-muted-foreground">
          Tu voto fue registrado correctamente y ya aparece en el mapa de resultados.
        </p>
      </div>
      <Link
        to="/resultados"
        className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground hover:opacity-90"
      >
        <BarChart2 className="h-5 w-5" />
        Ver resultados en tiempo real
      </Link>
    </div>
  );
}
