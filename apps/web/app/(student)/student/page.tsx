'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Award,
  ArrowRight,
  Store,
  BarChart2,
  Star,
  PlayCircle,
  Download,
  Layers,
} from 'lucide-react';
import { getDashboard, getRequiredCourses } from '@/lib/student';
import { listStudentTrails } from '@/lib/trails';
import { listMyCertificates } from '@/lib/certificates';
import { formatDuration } from '@/lib/utils';

function getMandatoryTrailLabel(position?: string | null): string {
  const n = (position ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (n.includes('gerente') || n.includes('manager')) return 'Trilha de Lideran\u00e7a';
  if (n.includes('supervisor') || n.includes('coordenador')) return 'Trilha de Supervis\u00e3o';
  if (n.includes('vendedor') || n.includes('atendente') || n.includes('sales'))
    return 'Trilha Comercial';
  if (n.includes('tecnico') || n.includes('assistente')) return 'Trilha Operacional';
  return 'Trilha de Onboarding';
}

export default function StudentDashboardPage(): React.JSX.Element {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['student-dashboard'],
    queryFn: getDashboard,
  });

  const { data: trails = [] } = useQuery({
    queryKey: ['student-trails'],
    queryFn: listStudentTrails,
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ['student-certificates'],
    queryFn: listMyCertificates,
  });

  const { data: requiredCourses = [] } = useQuery({
    queryKey: ['student-required-courses'],
    queryFn: getRequiredCourses,
  });

  if (isLoading || !dashboard) {
    return <div className="text-sm text-muted-foreground">Carregando...</div>;
  }

  // Trilha principal: primeiro da lista ou placeholder
  const mainTrail = trails[0] ?? null;
  const trailLabel = mainTrail?.title ?? getMandatoryTrailLabel(null);
  const trailCompleted = mainTrail?.completedCourses ?? 0;
  const trailTotal = mainTrail?.courseCount ?? 12;
  const trailProgress = mainTrail?.progressPercentage ?? 0;
  const trailNextId = mainTrail?.nextCourseId ?? null;

  const recentCerts = certificates.slice(0, 5);

  const stats = [
    {
      label: 'Cursos em andamento',
      value: dashboard.stats.inProgress,
      icon: BookOpen,
      color: '#3B82F6',
      bg: '#EFF6FF',
    },
    {
      label: 'Cursos conclu\u00eddos',
      value: dashboard.stats.completed,
      icon: CheckCircle2,
      color: '#10B981',
      bg: '#ECFDF5',
    },
    {
      label: 'Horas estudadas',
      value: String(dashboard.stats.totalStudiedHours) + 'h',
      icon: Clock,
      color: '#F59E0B',
      bg: '#FFFBEB',
    },
    {
      label: 'Certificados',
      value: dashboard.stats.certificateCount,
      icon: Award,
      color: '#E31E24',
      bg: '#FEF2F2',
    },
  ] as const;

  return (
    <div className="space-y-6 pb-8">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-2xl">
        <Image
          src="/images/home-banner.jpg"
          alt="Shineray segue acelerando pelo Brasil"
          width={1200}
          height={340}
          className="h-[220px] w-full object-cover sm:h-[260px] lg:h-[300px]"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
        <div className="absolute inset-0 flex items-center px-6 lg:px-10">
          <div className="max-w-sm">
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-red-600/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-red-400">
              <Star className="h-3 w-3 fill-red-400" aria-hidden /> Novidade da Shineray
            </span>
            <h2 className="text-2xl font-bold leading-tight text-white lg:text-3xl">
              Shineray segue <span className="text-red-500">acelerando</span>
              <br />
              pelo Brasil!
            </h2>
            <p className="mt-2 text-sm text-neutral-300">
              Mais <span className="font-semibold text-red-400">12 concession\u00e1rias</span>{' '}
              inauguradas este ano.
            </p>
            <p className="mt-1 text-xs text-neutral-400">
              Nossa rede continua crescendo para oferecer mais atendimento, pe\u00e7as e
              servi\u00e7os em todo o pa\u00eds.
            </p>
            <Link
              href="#"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
            >
              Conhe\u00e7a essa expans\u00e3o <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <div className="ml-auto hidden flex-col gap-3 lg:flex">
            <div className="flex items-center gap-3 rounded-xl bg-black/50 px-4 py-3 backdrop-blur-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600/30">
                <Store className="h-4 w-4 text-red-400" aria-hidden />
              </div>
              <div>
                <p className="text-[11px] text-neutral-400">Novas lojas em 2024</p>
                <p className="text-xl font-bold text-red-500">+12</p>
                <p className="text-[11px] text-neutral-400">em todo o Brasil</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-black/50 px-4 py-3 backdrop-blur-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600/30">
                <BarChart2 className="h-4 w-4 text-red-400" aria-hidden />
              </div>
              <div>
                <p className="text-[11px] text-neutral-400">Nossa rede</p>
                <p className="text-xl font-bold text-red-500">+240</p>
                <p className="text-[11px] text-neutral-400">concession\u00e1rias</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div
              className="mb-3 inline-flex items-center justify-center rounded-lg p-2"
              style={{ backgroundColor: bg }}
            >
              <Icon className="h-5 w-5" style={{ color }} aria-hidden />
            </div>
            <p className="text-3xl font-bold leading-none text-neutral-900">{value}</p>
            <p className="mt-1.5 text-sm text-neutral-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Trilha obrigatoria + Certificados recentes */}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Trilha obrigatoria */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-neutral-900">Minha trilha obrigat\u00f3ria</h2>
              <p className="mt-0.5 text-sm text-neutral-500">
                {trailCompleted} de {trailTotal} cursos conclu\u00eddos
              </p>
            </div>
            <Link
              href={trailNextId ? '/student/courses/' + trailNextId + '/learn' : '/student/trails'}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
            >
              <PlayCircle className="h-4 w-4" aria-hidden /> Continuar
            </Link>
          </div>

          {/* Barra de progresso */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-neutral-500">{trailLabel}</span>
              <span className="text-sm font-bold text-neutral-900">{trailProgress}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-2.5 rounded-full bg-red-600 transition-all duration-500"
                style={{ width: trailProgress + '%' }}
              />
            </div>
          </div>

          {/* Indicadores de etapas */}
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: trailTotal }, (_, i) => {
              const done = i < trailCompleted;
              const current = i === trailCompleted;
              return (
                <div
                  key={i}
                  className={
                    'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ' +
                    (done
                      ? 'bg-red-600 text-white'
                      : current
                        ? 'border-2 border-red-600 bg-red-50 text-red-600'
                        : 'bg-neutral-100 text-neutral-400')
                  }
                  aria-label={'Curso ' + (i + 1) + (done ? ' concluido' : '')}
                >
                  {done ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : String(i + 1)}
                </div>
              );
            })}
          </div>
        </div>

        {/* Certificados recentes */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-semibold text-neutral-900">Certificados recentes</h2>
            <Link
              href="/student/certificates"
              className="inline-flex items-center gap-1 text-sm font-medium text-[#1E1E1E] hover:text-neutral-600"
            >
              Ver todos <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {recentCerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-neutral-200 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
                <Award className="h-6 w-6 text-neutral-400" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-700">Nenhum certificado ainda</p>
                <p className="mt-1 text-xs text-neutral-500">
                  Conclua um curso para receber seu certificado.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {recentCerts.map((cert) => (
                <div key={cert.id} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50">
                    <Award className="h-5 w-5 text-red-600" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-900">
                      {cert.courseName}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {new Date(cert.issuedAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  {cert.fileUrl && (
                    <a
                      href={cert.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
                      aria-label={'Baixar certificado ' + cert.courseName}
                    >
                      <Download className="h-4 w-4" aria-hidden />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Continue de onde parou — cards com imagem */}
      <CourseCardGrid courses={[...dashboard.inProgress, ...dashboard.requiredPending]} />

      {/* Cursos obrigatórios */}
      <RequiredCoursesGrid courses={requiredCourses} />

      {dashboard.stats.totalEnrollments === 0 && (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center">
          <Layers className="mx-auto mb-3 h-10 w-10 text-neutral-300" aria-hidden />
          <p className="text-sm text-neutral-500">
            Você ainda não está matriculado em nenhum curso.
          </p>
          <Link
            href="/student/catalog"
            className="mt-2 inline-block text-sm font-medium text-red-600 hover:text-red-700"
          >
            Explorar catálogo
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── CourseCardGrid ───────────────────────────────────────────────────────────

import type { StudentCourseDto } from '@/lib/student';
import { CourseAssignmentType, EnrollmentStatus } from '@compliance/shared';

function getRemainingLabel(totalMin: number, progressPct: number): string {
  const remaining = Math.max(0, Math.round(totalMin * (1 - progressPct / 100)));
  if (remaining === 0) return 'Concluído';
  if (remaining >= 60) {
    const h = Math.floor(remaining / 60);
    const m = remaining % 60;
    return m > 0 ? `${h}h ${m}min restantes` : `${h}h restantes`;
  }
  return `${remaining}min restantes`;
}

function CourseCardGrid({ courses }: { readonly courses: StudentCourseDto[] }): React.JSX.Element {
  const visible = courses.slice(0, 4);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-neutral-900">Continue de onde parou</h2>
        <Link
          href="/student/courses/in-progress"
          className="inline-flex items-center gap-1 text-sm font-medium text-[#1E1E1E] hover:text-neutral-600"
        >
          Ver todos <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-8 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-neutral-300" aria-hidden />
          <p className="text-sm text-neutral-500">Nenhum curso em andamento no momento.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {visible.map((course) => {
            const pct = course.enrollment?.progressPercentage ?? 0;
            const href = course.enrollment
              ? `/student/courses/${course.id}/learn`
              : `/student/courses/${course.id}`;
            const isRequired = course.assignmentType === CourseAssignmentType.REQUIRED;
            const remaining = getRemainingLabel(course.estimatedDurationMinutes, pct);

            return (
              <div
                key={course.id}
                className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm"
              >
                {/* Imagem do curso */}
                <div className="relative h-40 w-full overflow-hidden bg-neutral-100">
                  <Image
                    src={course.coverImageUrl ?? '/images/exemplo-curso.jpg'}
                    alt={course.title}
                    fill
                    className="object-cover transition-transform duration-300 hover:scale-105"
                    sizes="(max-width: 640px) 100vw, 50vw"
                  />
                  {/* Badge de categoria */}
                  {isRequired && (
                    <span className="absolute left-3 top-3 rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow">
                      Obrigatório
                    </span>
                  )}
                  {/* Tempo restante */}
                  <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                    <Clock className="h-3 w-3" aria-hidden />
                    {remaining}
                  </span>
                </div>

                {/* Corpo do card */}
                <div className="p-4">
                  <p className="line-clamp-2 text-sm font-semibold leading-snug text-neutral-900">
                    {course.title}
                  </p>
                  {course.shortDescription && (
                    <p className="mt-1 truncate text-xs text-neutral-500">
                      {course.shortDescription}
                    </p>
                  )}

                  {/* Barra de progresso */}
                  <div className="mt-3">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className="h-1.5 rounded-full bg-red-600 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-xs text-neutral-500">{pct}% concluído</span>
                    <Link
                      href={href}
                      className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700"
                    >
                      <PlayCircle className="h-3.5 w-3.5" aria-hidden /> Continuar
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ─── RequiredCoursesGrid ──────────────────────────────────────────────────────

function RequiredCoursesGrid({
  courses,
}: {
  readonly courses: StudentCourseDto[];
}): React.JSX.Element {
  if (courses.length === 0) return <></>;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-neutral-900">Cursos obrigatórios</h2>
        <Link
          href="/student/courses/required"
          className="inline-flex items-center gap-1 text-sm font-medium text-[#1E1E1E] hover:text-neutral-600"
        >
          Ver todos <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.slice(0, 6).map((course) => {
          const status = course.enrollment?.status ?? null;
          const pct = course.enrollment?.progressPercentage ?? 0;
          const isCompleted = status === EnrollmentStatus.COMPLETED;
          const isInProgress = status === EnrollmentStatus.IN_PROGRESS;

          const href =
            isCompleted || isInProgress
              ? `/student/courses/${course.id}/learn`
              : `/student/courses/${course.id}`;

          return (
            <div
              key={course.id}
              className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm"
            >
              {/* Imagem */}
              <div className="relative h-40 w-full overflow-hidden bg-neutral-100">
                <Image
                  src={course.coverImageUrl ?? '/images/exemplo-curso.jpg'}
                  alt={course.title}
                  fill
                  className="object-cover transition-transform duration-300 hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                {/* Badge Obrigatório */}
                <span className="absolute left-3 top-3 rounded-md bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  Obrigatório
                </span>
                {/* Badge concluído */}
                {isCompleted && (
                  <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-green-500 shadow">
                    <CheckCircle2 className="h-4 w-4 text-white" aria-hidden />
                  </span>
                )}
              </div>

              {/* Corpo */}
              <div className="p-4">
                <p className="line-clamp-2 text-sm font-semibold leading-snug text-neutral-900">
                  {course.title}
                </p>

                <div className="mt-2 flex items-center gap-3 text-xs text-neutral-500">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" aria-hidden />
                    {formatDuration(course.estimatedDurationMinutes)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" aria-hidden />
                    {course.moduleCount} módulo{course.moduleCount !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Barra de progresso apenas se em andamento */}
                {isInProgress && (
                  <div className="mt-3">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className="h-1.5 rounded-full bg-red-600 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between gap-2">
                  {/* Status badge */}
                  {isCompleted ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Concluído
                    </span>
                  ) : isInProgress ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600">
                      <PlayCircle className="h-3.5 w-3.5" aria-hidden /> Em andamento
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-neutral-200 px-2 py-0.5 text-xs text-neutral-500">
                      Não iniciado
                    </span>
                  )}

                  {/* Botão de ação */}
                  <Link
                    href={href}
                    className={
                      isCompleted
                        ? 'rounded-full border border-green-500 px-3 py-1.5 text-xs font-semibold text-green-600 transition-colors hover:bg-green-50'
                        : 'inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700'
                    }
                  >
                    {isCompleted ? (
                      'Revisar'
                    ) : isInProgress ? (
                      <>
                        <PlayCircle className="h-3.5 w-3.5" aria-hidden /> Continuar
                      </>
                    ) : (
                      'Iniciar'
                    )}
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
