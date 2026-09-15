import Link from 'next/link';
import { BarChart3, Users, Store, AlertCircle, BookOpen, Award, FileText } from 'lucide-react';

const REPORTS = [
  { href: '/admin/reports/courses', label: 'Cursos', desc: 'Desempenho e conclusão por curso', icon: BookOpen },
  { href: '/admin/reports/students', label: 'Alunos', desc: 'Progresso e pendências por aluno', icon: Users },
  { href: '/admin/reports/stores', label: 'Lojas', desc: 'Comparativo entre lojas', icon: Store },
  { href: '/admin/reports/pending', label: 'Pendências obrigatórias', desc: 'Cursos obrigatórios não concluídos', icon: AlertCircle },
  { href: '/admin/reports/quiz-results', label: 'Resultados de testes', desc: 'Notas e tentativas', icon: BarChart3 },
  { href: '/admin/reports/certificates', label: 'Certificados', desc: 'Certificados emitidos e status', icon: Award },
];

export default function ReportsHubPage(): React.JSX.Element {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-sm text-muted-foreground">Análise e exportação de dados da plataforma</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="group flex items-start gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
          >
            <r.icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground group-hover:text-foreground" />
            <div>
              <p className="font-medium">{r.label}</p>
              <p className="text-sm text-muted-foreground">{r.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
