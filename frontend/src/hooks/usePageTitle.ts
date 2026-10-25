import { useEffect } from "react";

/** Sets the browser tab title, e.g. "My Books · BookLeaf". */
export function usePageTitle(title: string | undefined) {
  useEffect(() => {
    document.title = title ? `${title} · BookLeaf` : "BookLeaf Author Support";
  }, [title]);
}
