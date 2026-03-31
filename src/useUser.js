import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function useUser() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);
      setLoadingUser(false);
    }

    getUser();
  }, []);

  return { user, loadingUser };
}