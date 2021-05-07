import { useCallback, useContext } from "react";
import { usePaginatedAPI } from "./usePaginatedAPI";
import { fetchReticulumAuthenticated } from "../../utils/phoenix-utils";
import { AuthContext } from "../auth/AuthContext";

export function usePremiumScenes() {
  const auth = useContext(AuthContext); // Re-render when you log in/out.
  const getMoreScenes = useCallback(
    cursor => fetchReticulumAuthenticated(`/api/v1/media/search?filter=premium&source=scene_listings&cursor=${cursor}`),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [auth.isSignedIn]
  );
  return usePaginatedAPI(getMoreScenes);
}
