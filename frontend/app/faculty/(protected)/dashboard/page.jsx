// app/faculty/dashboard/page.jsx
import {SemesterPie} from '@/src/_hooks/charts'

export default function FacultyDashboardPage() {
  // Placeholder data — swap with real API data later
  const semesters = [
    { id: "sem-5", name: "Semester 5", period: "Aug–Dec 2025", courses: 4, batches: 2 },
    { id: "sem-6", name: "Semester 6", period: "Jan–May 2026", courses: 5, batches: 3 },
  ];

  const batches = [
    { id: "CS-2023-A", program: "B.Tech CSE", year: "2023", size: 58 },
    { id: "CS-2022-B", program: "B.Tech CSE", year: "2022", size: 60 },
    { id: "IT-2023-A", program: "B.Tech IT", year: "2023", size: 55 },
  ];

  return (
    <main className="w-full h-full p-4 bg-slate-100 text-black font-mono">
      <header className="mb-6 ">
        <h1 className="text-2xl font-semibold">Faculty Dashboard</h1>
        <p className="text-slate-800 text-sm">Overview of semesters and batches assigned.</p>
      </header>

      {/* Semesters */}
      <section className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-medium">Semesters</h2>
          <a href="/dashboard/faculty/semesters" className="text-sm hover:text-indigo-700">
            View all
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-1">
          {semesters.map((s) => (
            <div className="justify-between grid grid-cols-[1fr_auto] gap-4">
            {/* left column: text */}
              <a
              key={s.id}
              href={`/dashboard/faculty/semesters/${s.id}`}
              className="group rounded-lg bg-[#ffffff] p-4 shadow-sm hover:drop-shadow-2xl"
            >
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-0">
                <div>
                  <h3 className="text-base font-semibold">{s.name}</h3>

                  <p className="text-sm ">
                    Courses: <span className="font-medium">{s.courses}</span>
                  </p>
                  <p className="text-sm ">
                    Batches: <span className="font-medium">{s.batches}</span>
                  </p>
                  <div className="mt-3">
                    <span className="inline-flex items-center text-sm hover:text-indigo-600">
                      Manage semester →
                    </span>
                  </div>
                </div>

                    {/*</div>*/}
                  <div className="">
                    <SemesterPie present={72} absent={28} h={15} w={15} />
                  </div>
            </div>
            </a>
            </div>
          ))}

        </div>
      </section>

      {/* Batches */}
      <section className={"mb-3"}>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-medium">Batches</h2>
          <a href="/dashboard/faculty/batches" className="text-sm text-slate-700 hover:text-indigo-600">
            View all
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {batches.map((b) => (
            <a
              key={b.id}
              href={`/dashboard/faculty/batches/${b.id}`}
              className="group rounded-lg bg-[#ffffff] p-4 shadow-sm hover:drop-shadow-2xl"
            >
              <div className="mb-1 flex items-center justify-between">
                <h3 className="text-base font-semibold">{b.id}</h3>
                <span className="rounded-2xl bg-slate-200 px-2.5 py-1 text-xs text-black">{b.year}</span>
              </div>
              <p className="text-sm ">{b.program}</p>
              <p className="text-sm ">
                Strength: <span className="font-medium">{b.size}</span>
              </p>
              <div className="mt-3">
                <span className="inline-flex items-center text-sm  group-hover:text-indigo-700">
                  Open batch →
                </span>
              </div>
            </a>
          ))}
        </div>
      </section>
      <p>
        What is Lorem Ipsum?
          Lorem Ipsum is simply dummy text of the printing and typesetting industry. <br></br>Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. <br></br>It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. <br></br>It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more<br></br> recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.<br></br>Why do we use it?<br></br>It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a <br></br>more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English.<br></br> Many desktop publishing packages and web page editors now use Lorem Ipsum as their default model text, and a search for <br></br>'lorem ipsum' will uncover many web sites still in their infancy. Various versions have evolved over the years, sometimes by accident, sometimes on purpose (injected humour and the like).  What is Lorem Ipsum?
          Lorem Ipsum is simply dummy text of the printing and typesetting industry. <br></br>Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. <br></br>It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. <br></br>It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more<br></br> recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.<br></br>Why do we use it?<br></br>It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a <br></br>more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English.<br></br> Many desktop publishing packages and web page editors now use Lorem Ipsum as their default model text, and a search for <br></br>'lorem ipsum' will uncover many web sites still in their infancy. Various versions have evolved over the years, sometimes by accident, sometimes on purpose (injected humour and the like).

    </p>
    </main>
  );
}
