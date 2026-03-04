// app/dashboard/faculty/students/[registration_no]/page.jsx
import ProfileClient from "../ProfileClient";

export default async function Page({ params, searchParams }) {
  const { registration_no } = await params; // Next 15 dynamic API is async
  // console.log(params);
  // console.log(registration_no);
  // optional: read a tab from ?tab=attendance|courses
  const { tab = "overview" } = await searchParams;
  return <ProfileClient registrationNo={registration_no} initialTab={tab} />;
}
