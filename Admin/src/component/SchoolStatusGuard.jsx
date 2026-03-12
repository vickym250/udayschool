import { useEffect, useState } from "react";
import { checkSchoolStatus } from "../checkSchoolStatus";

export default function SchoolStatusGuard({ children }) {
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const init = async () => {
      const res = await checkSchoolStatus();

      if (!res.active) {
        setBlocked(true);
        setMsg(res.message);
      }
      setLoading(false);
    };
    init();
  }, []);

  if (loading) return <div>Checking school status…</div>;

  if (blocked)
    return (
      <div className="h-screen flex items-center justify-center text-center">
        <div>
          <h1 className="text-2xl font-bold text-red-600">
            School Inactive
          </h1>
          <p>{msg}</p>
        </div>
      </div>
    );

  return children;
}
