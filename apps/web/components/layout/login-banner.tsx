import Image from 'next/image';

export function LoginBanner(): React.JSX.Element {
  return (
    <div className="relative hidden lg:flex lg:w-[45%] flex-col min-h-screen">
      <Image
        src="/images/shinereay-bike-login.png"
        alt="Portal de Treinamentos Shineray"
        fill
        className="object-cover"
        priority
      />
      <div className="absolute inset-0 bg-black/55" />

      <div className="relative z-10 flex flex-col h-full p-10 xl:p-14 text-white">
        <div className="flex-1 flex flex-col justify-center">
          <span className="inline-flex items-center gap-2 mb-8 w-fit rounded-full bg-[#C8151B] px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white">
            <span className="h-2 w-2 rounded-full bg-white" />
            Portal de Desenvolvimento
          </span>

          <h1 className="text-[2.5rem] font-bold leading-tight mb-4">
            Portal de
            <br />
            Treinamentos
          </h1>

          <p className="text-white/80 text-base leading-relaxed max-w-xs">
            Aprenda, evolua e acompanhe sua jornada de desenvolvimento dentro da rede Shineray.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Image
            src="/icons/shineray-icon.png"
            alt="Shineray"
            width={32}
            height={32}
            className="opacity-90"
          />
          <p className="text-white/60 text-sm">
            Capacitando profissionais em toda a rede credenciada Shineray.
          </p>
        </div>
      </div>
    </div>
  );
}
