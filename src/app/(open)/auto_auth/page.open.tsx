"use client";

import { useEffect } from "react";
import { signIn } from "next-auth/react";
import { Loader } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AutoAuth() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const kadmap_api_url = searchParams.get("kadmap_api_url")
  // const vfs_base_url = searchParams.get('vfs_base_url')
  // const workspace_id = searchParams.get('workspace_id')
  const user_id = searchParams.get('user_id')
  const user_KID = searchParams.get('user_KID')



  // Safely construct the base URL
  const constructBaseUrl = () => {
    try {
      const decodedKadmapUrl = decodeURIComponent(kadmap_api_url as string);
      // Remove trailing slash if exists and add our path
      const cleanUrl = decodedKadmapUrl.replace(/\/$/, "");
      return `${cleanUrl}/directory/users/${user_id}`;
    } catch (error) {
      console.error("Error constructing URL:", error);
      throw new Error("Invalid API URL format");
    }
  };

  const fetchData = async () => {
    try {
      const baseUrl = constructBaseUrl();
      const response = await fetch(baseUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseData = await response.json();
      
      // Validate the response structure
      if (!responseData?.data) {
        throw new Error("Invalid response structure from kadmap API");
      }

      const userData = responseData.data;
      
      // Validate required user data fields
      if (!userData.userKID || !userData.userId || !userData.fullName) {
        throw new Error("Missing required user data fields");
      }
      console.log(userData)
      return userData;
    } catch (error) {
      console.error("Error fetching data from kadmap client:", error);
      throw error; // Re-throw to handle in the calling function
    }
  };

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const data = await fetchData();
        
        // Attempt initial login
        console.log("Attempting initial login");
        const loginResult = await signIn("credentials", {
          email: data.userKID,
          password: data.userId,
          redirect: false,
        });

        if (loginResult?.error) {
          console.log("Login failed, attempting user creation");
          
          // Create user account
          const createResponse = await fetch("/api/auth/register", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: data.fullName,
              email: data.userKID,
              password: data.userId,
              // role: guard === "admin" ? "ADMIN" : "USER",
              role: "ADMIN",
            }),
          });

          if (!createResponse.ok) {
            const errorData = await createResponse.json();
            throw new Error(errorData.error || "Failed to create user account");
          }

          // Wait for database to settle
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Try login again after account creation
          const finalLoginResult = await signIn("credentials", {
            email: data.userKID,
            password: data.userId,
            redirect: false,
          });

          if (finalLoginResult?.error) {
            throw new Error(finalLoginResult.error);
          }
        }

        // If we get here, either initial login succeeded or final login succeeded
        router.push("/calendar");
      } catch (error) {
        console.error("Authentication error:", error);
        // router.push("/error");
      }
    };

    handleAuth();
  }, [kadmap_api_url, user_id, user_KID, router, fetchData]);

  return (
    <div className="h-screen w-screen flex items-center justify-center">
      <Loader className="h-8 w-8 animate-spin" />
    </div>
  );
}
