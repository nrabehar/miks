import MiksLogo from '#/assets/miks.svg'
import { RegisterForm } from '#/components/page/auth/register-form'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/auth/register')({
  component: RouteComponent,
})

function RouteComponent() {

  return <div className="min-h-screen flex bg-background">
  <div className="hidden lg:flex w-6/12 bg-linear-to-br from-primary/10 via-accent/5 to-background relative overflow-hidden items-center justify-center">
    <div className="absolute inset-0 bg-[radial-gradient(at_50%_30%,rgba(59,130,246,0.15),transparent_50%)]" />
    <div className="relative z-10 max-w-md px-10 text-center">
      <div className="flex justify-center items-center mb-6 space-x-2">
        <img
          src={MiksLogo}
          alt="Miks Logo"
          className="w-5 h-5"
        />
        <span className="font-semibold font-sans leading-0">Miks</span>
      </div>
      <h1 className="text-4xl font-semibold tracking-tighter mb-6 text-foreground">
        Begin your cooperative investment
      </h1>
      <p className="text-lg text-muted-foreground leading-relaxed">
        Create an account and start collaborating with your team on your next big project
      </p>
      
    </div>
    <div className="absolute bottom-10 right-10 opacity-10">
      <img src={MiksLogo} alt="Miks Logo" className="w-96 h-96" />
    </div>
  </div>
  <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
    <div className="w-full max-w-md">
      <div className="mb-10 flex flex-col items-center">
        <img
          src={MiksLogo}
          alt="Miks Logo"
          className="w-12 h-12 mb-6 lg:hidden"
        />
        <h2 className="text-2xl lg:text-3xl font-semibold tracking-tight">
          Create your account
        </h2>
        <p className="text-muted-foreground mt-2">
          Fill every information to complete account creation
        </p>
      </div>
      <RegisterForm />
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          to="/auth/login"
          className="text-primary hover:underline font-medium"
        >
          Log in
        </Link>
        .
      </p>
    </div>
  </div>
</div>
}
