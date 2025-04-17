"use client";

import { useEffect } from "react";
import { signIn } from "next-auth/react";
import { Loader } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AutoAuth() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get user details from query parameters
  const firstname = searchParams.get("firstname") || "";
  const lastname = searchParams.get("lastname") || "";
  const email = searchParams.get("email") || "";
//  const kid = searchParams.get("kid") || "";
  const uid = searchParams.get("uid") || "";
  const guard = searchParams.get("guard") || "";

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // First try to login
        console.log("Attempting initial login");
        const loginResult = await signIn("credentials", {
          email,
          password: uid,
          redirect: false,
        });

        console.log("Initial login result:", loginResult);

        // If login fails, try to create user directly
        if (loginResult?.error) {
          console.log("Login failed, attempting user creation");

          // Create user directly
          console.log("Creating user account");
          const createResponse = await fetch("/api/auth/register", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: `${firstname} ${lastname}`,
              email,
              password: uid,
              role: guard === "admin" ? "ADMIN" : "USER",
            }),
          });

          const userData = await createResponse.json();
          console.log("User creation response:", userData);

          if (!createResponse.ok) {
            throw new Error(userData.error || "Failed to create user account");
          }

          // Wait a moment for the database to settle
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Try login again after account creation
          console.log("Attempting login after account creation");
          const finalLoginResult = await signIn("credentials", {
            email,
            password: uid,
            redirect: false,
          });

          console.log("Final login result:", finalLoginResult);

          if (finalLoginResult?.error) {
            throw new Error(finalLoginResult.error);
          }

          router.push("/calendar");
        } else {
          // Initial login was successful
          router.push("/calendar");
        }
      } catch (error) {
        console.error("Authentication error:", error);
        router.push("/error");
      }
    };

    if (email && uid) {
      handleAuth();
    } else {
      router.push("/error");
    }
  }, [email, uid, firstname, lastname, guard, router]);

  return (
    <div className="h-screen w-screen flex items-center justify-center">
      <Loader className="h-8 w-8 animate-spin" />
    </div>
  );
}
