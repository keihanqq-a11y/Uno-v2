import { redirect } from "next/navigation";

/** Register removed — everyone plays as a guest automatically. */
export default function RegisterPage() {
  redirect("/play");
}
