"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function UserPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard if not authenticated
    if (status === "unauthenticated") {
      router.push("/dashboard/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return <p>Loading...</p>;
  }

  if (status === "authenticated") {
    return (
      <div style={{ padding: "20px" }}>
        <h1>User Profile</h1>
        <p>
          <strong>Name:</strong> {session.user.name}
        </p>
        <p>
          <strong>Email:</strong> {session.user.email}
        </p>
        <p>
          <strong>Premium:</strong> {session.user.isPro ? "Yes" : "No"}
        </p>
      </div>
    );
  }

  return <p>Please log in</p>;
}
