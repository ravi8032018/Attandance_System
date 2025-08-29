import Link from "next/link";


export default function login(){
    return(
    <div>
        <div className="px-10">
            <Link href={"/login/student"}>Student</Link>
        </div>
        <div className="px-10">
            <Link href={"/login/faculty"}>Faculty</Link>
        </div>
        <div className="px-10">
            <Link href={"/login/admin"}>Admin</Link>
        </div>
    </div>
    );
}