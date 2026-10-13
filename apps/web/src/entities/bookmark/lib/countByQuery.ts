// [DEMO] 의도적으로 심은 FSD 레이어 위반 — demo/harness-talk 브랜치 전용, 머지 금지.
// entities(하위) → features(상위) import. lint:fsd와 fsd-checker가 둘 다 잡아야 한다.
import type { Bookmark } from "@/entities/bookmark/model/types";
import { filterBookmarks } from "@/features/bookmark/model/filterBookmarks";

export function countByQuery(bookmarks: Bookmark[], query: string): number {
  return filterBookmarks(bookmarks, [], query).length;
}
