import { useActiveEdition } from "@/components/ui/PersEditionPin";
import { getTargetEditionPath } from "@/rules/route-helpers";

/// Кімнати однакові в обох редакціях; префікс лише тримає гравця в його редакції сайту.
export function useGamesHref(): (path: string) => string {
  const edition = useActiveEdition();
  return (path) => getTargetEditionPath(path, edition);
}
