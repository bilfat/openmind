import { redirect } from "next/navigation";

export default function CheckTicketRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return redirect("/tiket?tab=check");
}
