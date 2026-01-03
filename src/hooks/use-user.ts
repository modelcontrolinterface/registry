import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface UserProfile {
  id: string;
  email: string;
  display_name: string;
}

export function useUser() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const mapUser = (supabaseUser: any): UserProfile => ({
      id: supabaseUser.id,
      display_name:
        supabaseUser.user_metadata.display_name || supabaseUser.email,
      email: supabaseUser.email!,
    });

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUser(mapUser(user));
      setIsLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        if (session?.user) {
          setUser(mapUser(session.user));
        } else {
          setUser(null);
        }
        setIsLoading(false);
      },
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return { user, isLoading };
}
