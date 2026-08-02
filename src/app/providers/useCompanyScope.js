import useAuth from "./useAuth";

export default function useCompanyScope() {
  const { session, empresaId } = useAuth();
  return { empresaId, userId: session?.user?.id || null, userEmail: session?.user?.email || "", ready: Boolean(session?.user && empresaId) };
}
