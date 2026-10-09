/** Papel exigido pelas telas/rotas que só o administrador pode usar. */
export function isAdmin(user: { role?: string } | null | undefined): boolean {
  return user?.role === 'admin';
}
