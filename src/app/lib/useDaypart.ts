import { useEffect, useState } from "react";
import { getDaypart, type Daypart } from "./format";

/**
 * Live shell daypart (ochtend/middag/avond), re-derived once a minute so the
 * background wash and bottom-nav fade don't stay stuck on the previous
 * daypart if the app is left open across a boundary — same re-tick pattern
 * as Vandaag's own `nuDagdeel` (VandaagPage.tsx).
 */
export function useDaypart(): Daypart {
  const [daypart, setDaypart] = useState(() => getDaypart());
  useEffect(() => {
    const id = setInterval(() => setDaypart(getDaypart()), 60_000);
    return () => clearInterval(id);
  }, []);
  return daypart;
}
