// app/faculty/list_students/page.jsx
import StudentsClient from "./StudentClient";

export default async function Page({ searchParams }) {
  const sp = await searchParams; // unwrap once

  const q = {
    registration_no: sp.registration_no ?? "",
    email: sp.email ?? "",
    first_name: sp.first_name ?? "",
    last_name: sp.last_name ?? "",
    status: sp.status ?? "",
    sort_by: sp.sort_by ?? "created_at",
    sort_order: sp.sort_order ?? "desc",
    page: Math.max(1, parseInt(sp.page ?? "1", 10)),
    limit: Math.min(100, Math.max(5, parseInt(sp.limit ?? "10", 10))),
  };

  // optional: console.log on the server
  // console.log("SP:", q);

  return <StudentsClient initialQuery={q} />;
}
