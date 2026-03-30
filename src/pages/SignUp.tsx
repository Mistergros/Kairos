import { SignUp } from "@clerk/clerk-react";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white px-6 py-12">
      <div className="mx-auto grid w-full max-w-5xl items-center gap-10 md:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">KAIJOS DUERP</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">
            Demarrez votre DUERP
            <br /> avec un accompagnement guide.
          </h1>
          <p className="mt-4 text-base text-slate-300">
            Creez votre compte pour activer votre abonnement et lancer votre premier DUERP.
          </p>
          <div className="mt-6">
            <a href="/landing" className="text-sm text-slate-300 underline hover:text-white">
              Retour au site
            </a>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-2xl">
          <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" afterSignUpUrl="/" />
        </div>
      </div>
    </div>
  );
}
