import { AuthLayout } from '#/components/auth/auth-layout'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/auth')({
  component: AuthLayout,
})
