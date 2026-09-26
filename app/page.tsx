import { redirect } from "next/navigation";

/** The app opens on Today — it is where the PG starts every clinic day. */
export default function Home() {
  redirect("/today");
}
