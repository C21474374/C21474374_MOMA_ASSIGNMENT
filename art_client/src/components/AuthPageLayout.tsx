import type { ReactNode } from 'react'

type AuthPageLayoutProps = {
  title: string
  subtitle: string
  children: ReactNode
}

// Provide a shared frame for the login and registration experiences.
function AuthPageLayout({ title, subtitle, children }: AuthPageLayoutProps) {
  return (
    <section className="auth-page">
      <div className="auth-panel">
        <div className="auth-header">
          <p className="auth-kicker">MoMA Account</p>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle auth-subtitle">{subtitle}</p>
        </div>
        {children}
      </div>
    </section>
  )
}

export default AuthPageLayout
