import { redirect } from "next/navigation";

/** Login removed — everyone plays as a guest automatically. */
export default function LoginPage() {
  redirect("/play");
}
