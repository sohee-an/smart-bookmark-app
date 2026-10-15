# Graph Report - smart-bookmark-graph  (2026-10-14)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1280 nodes · 2547 edges · 80 communities (65 shown, 15 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.85)
- Token cost: 41,168 input · 1,061 output

## Graph Freshness
- Built from commit: `fcd6cee7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Crawl and Bulk Import API
- Extension Bookmark Manager
- ESLint Configuration
- QA Findings Library
- Root Package Dependencies
- Nightly QA Runner
- Web Dev Dependencies
- Web Package Config
- Collection Repository Interface
- Web Runtime Dependencies
- Collection API Routes
- Bookmark Repository Interface
- Bookmark Card Component
- Overlay Event Emitter
- Bookmark Chat Hook
- E2E Bookmark Tests
- Bookmark Queries and Page
- Guest Local Storage Tests
- Turbo Build Pipeline
- Next.js Config and Pages
- AI Embedding and Search APIs
- Filter and Tag Stories
- Git Hook Scripts
- UI Package Config
- Bookmark Filtering and Listing
- Home Page and Store
- Supabase Bookmark Repository
- Search and Filter UI
- Avatar Component
- Web NPM Scripts
- Collection Detail and Queries
- Login and Auth UI
- Next.js TypeScript Config
- Extension Package Config
- Tag Primitive Components
- Demo Virtual Bookmark Grid
- Local Guest Repository
- Bookmark Error Codes
- Add to Collection and Toasts
- Live App Check Script
- Extension TypeScript Config
- Semantic Search Evaluation
- Collection Pages and Skeletons
- Semantic Similarity Utilities
- Web TypeScript Config
- QA Test Author Guard
- Base TypeScript Config
- Chat API and Middleware
- Root Layout and Providers
- Bookmark List Component
- Input Primitive Components
- Doc Path Checker
- Extension Dev Dependencies
- Error Pages and Monitoring
- Chat Page and Realtime Sync
- Collections List and Creation
- Supabase Collection Repository
- Bookmark Service
- Storybook Setup
- Bookmark Card Stories
- Search Bar and Input
- Input Stories
- TypeScript Config Package
- Extension Auth Pages
- Extension Storage Wrapper
- Extension Build Scripts
- Auth Callback Page
- Vitest Configuration
- Extension Runtime Dependencies
- Golden Set Data
- API Response Types
- UI TypeScript Config
- Route Test Mocks
- PostCSS Config
- Ship Script

## God Nodes (most connected - your core abstractions)
1. `Bookmark` - 59 edges
2. `next` - 47 edges
3. `createSupabaseServerClient()` - 33 edges
4. `lucide-react` - 29 edges
5. `vitest` - 25 edges
6. `LocalRepository` - 23 edges
7. `SupabaseBookmarkRepository` - 20 edges
8. `BookmarksContent()` - 19 edges
9. `BookmarkError` - 16 edges
10. `BookmarkErrorCode` - 16 edges

## Surprising Connections (you probably didn't know these)
- `Header()` --calls--> `LogOutIcon()`  [EXTRACTED]
  apps/web/src/widgets/layout/Header.tsx → packages/ui/src/icons/icons.tsx
- `Header()` --calls--> `PlusIcon()`  [EXTRACTED]
  apps/web/src/widgets/layout/Header.tsx → packages/ui/src/icons/icons.tsx
- `BookmarkListProps` --references--> `Bookmark`  [EXTRACTED]
  apps/web/src/features/bookmark/ui/BookmarkList.tsx → apps/web/src/entities/bookmark/model/types.ts
- `VirtualBookmarkGridProps` --references--> `Bookmark`  [EXTRACTED]
  apps/web/src/features/bookmark/ui/VirtualBookmarkGrid.tsx → apps/web/src/entities/bookmark/model/types.ts
- `MobileSearchOverlay()` --calls--> `SearchIcon()`  [EXTRACTED]
  apps/web/src/features/bookmark/ui/MobileSearchOverlay.tsx → packages/ui/src/icons/icons.tsx

## Import Cycles
- None detected.

## Communities (80 total, 15 thin omitted)

### Community 0 - "Crawl and Bulk Import API"
Cohesion: 0.06
Nodes (41): POST(), BulkImportItem, POST(), CORS_HEADERS, getUserFromBearer(), genAI, PIPELINE_TIMEOUT_MS, runPipeline() (+33 more)

### Community 1 - "Extension Bookmark Manager"
Cohesion: 0.06
Nodes (49): ALLOWED_PROTOCOLS, BookmarkManager(), buildDuplicateMap(), traverse(), buildUrlToIds(), traverse(), DragPreview(), DroppableFolder() (+41 more)

### Community 2 - "ESLint Configuration"
Cohesion: 0.06
Nodes (36): eslint, eslint-config-prettier, config, fsdConfig, higher, nextJsConfig, devDependencies, eslint (+28 more)

### Community 3 - "QA Findings Library"
Cohesion: 0.10
Nodes (30): currentFindings(), defHash(), fingerprint(), gitInfo(), KDIR, linkRef(), linkScenario(), listFiles() (+22 more)

### Community 4 - "Root Package Dependencies"
Cohesion: 0.06
Nodes (35): dependencies, @tanstack/react-query-devtools, devDependencies, husky, lint-staged, prettier, prettier-plugin-tailwindcss, secretlint (+27 more)

### Community 5 - "Nightly QA Runner"
Cohesion: 0.06
Nodes (34): needsRecheck(), after, args, before, broken, byId, carriedFailing, cfg (+26 more)

### Community 6 - "Web Dev Dependencies"
Cohesion: 0.06
Nodes (33): devDependencies, babel-plugin-react-compiler, @chromatic-com/storybook, eslint, eslint-config-prettier, eslint-plugin-storybook, jsdom, playwright (+25 more)

### Community 7 - "Web Package Config"
Cohesion: 0.06
Nodes (30): react, lint-staged, *.{js,jsx,ts,tsx}, name, private, version, babel-plugin-react-compiler, @chromatic-com/storybook (+22 more)

### Community 8 - "Collection Repository Interface"
Cohesion: 0.11
Nodes (11): CollectionRepository, CreateCollectionInput, CollectionBookmarkRow, CollectionMemberRow, MemberRow, Collection, CollectionDetail, CollectionMember (+3 more)

### Community 9 - "Web Runtime Dependencies"
Cohesion: 0.07
Nodes (27): dependencies, cheerio, dotenv, @google/generative-ai, @hookform/resolvers, lucide-react, next, openai (+19 more)

### Community 10 - "Collection API Routes"
Cohesion: 0.13
Nodes (18): GET(), assertEditorOrAbove(), CollectionBookmarkRow, DELETE(), GET(), POST(), DELETE(), PATCH() (+10 more)

### Community 11 - "Bookmark Repository Interface"
Cohesion: 0.18
Nodes (11): BookmarkRepository, UpdateBookmarkData, BookmarkDbRow, BookmarkFilter, BookmarkRow, CreateBookmarkRequest, SupabaseDbRow, toBookmark() (+3 more)

### Community 12 - "Bookmark Card Component"
Cohesion: 0.15
Nodes (18): SemanticBookmark, Bookmark, BookmarkCard(), BookmarkCardProps, domainHue(), ThumbnailFallback(), BookmarkDetailPanelProps, MobileSearchOverlayProps (+10 more)

### Community 13 - "Overlay Event Emitter"
Cohesion: 0.16
Nodes (14): EmitterListener, overlayEmitter, OverlayEventEmitter, OverlayEventKey, OverlayEventMap, overlay, initialState, overlayReducer() (+6 more)

### Community 14 - "Bookmark Chat Hook"
Cohesion: 0.17
Nodes (15): useBookmarks(), getGuestChatRemaining(), GUEST_CHAT_DAILY_LIMIT, read(), recordGuestChat(), today(), ChatMessage, ChatSource (+7 more)

### Community 15 - "E2E Bookmark Tests"
Cohesion: 0.20
Nodes (12): addBookmarkButton(), addBookmarkModalTitle(), bookmarkUrlInput(), loginAsGuest(), retryButton(), saveBookmarkButton(), submitBookmark(), encodedWithSimilarity() (+4 more)

### Community 16 - "Bookmark Queries and Page"
Cohesion: 0.18
Nodes (10): BookmarksPage(), metadata, fetchBookmarksServer(), bookmarkKeys, mockService, useBookmarkPipeline(), AddBookmarkOverlay(), AddBookmarkOverlayProps (+2 more)

### Community 17 - "Guest Local Storage Tests"
Cohesion: 0.19
Nodes (9): DateProvider, GUEST_BOOKMARK_LIMIT, StorageProvider, FakeStorage, makeRepo(), UUIDProvider, getGuestId(), GUEST_ID_KEY (+1 more)

### Community 18 - "Turbo Build Pipeline"
Cohesion: 0.10
Nodes (20): dependsOn, env, inputs, outputs, dependsOn, cache, persistent, globalEnv (+12 more)

### Community 19 - "Next.js Config and Pages"
Cohesion: 0.12
Nodes (7): nextConfig, runtime, metadata, LandingActions(), LandingPage(), metadata, next

### Community 20 - "AI Embedding and Search APIs"
Cohesion: 0.22
Nodes (15): POST(), POST(), genAI, POST(), BookmarkTagRow, embedQuery(), genAI, POST() (+7 more)

### Community 21 - "Filter and Tag Stories"
Cohesion: 0.11
Nodes (17): AllTags, meta, NoSelection, Story, WithSelection, Default, meta, MultipleTags (+9 more)

### Community 22 - "Git Hook Scripts"
Cohesion: 0.12
Nodes (13): requireFromFile, baseFor(), cfg, changed, exclude, files, git(), hits (+5 more)

### Community 23 - "UI Package Config"
Cohesion: 0.11
Nodes (18): @smart-bookmark/typescript-config, @types/react, typescript, devDependencies, @smart-bookmark/typescript-config, @types/react, typescript, exports (+10 more)

### Community 24 - "Bookmark Filtering and Listing"
Cohesion: 0.20
Nodes (12): BookmarksContent(), buildBookmarksUrl(), filterBookmarks(), base, bookmarks, getGuestSemanticRemaining(), GUEST_SEMANTIC_DAILY_LIMIT, read() (+4 more)

### Community 25 - "Home Page and Store"
Cohesion: 0.22
Nodes (10): HomePage(), metadata, BookmarkStore, useBookmarkStore, BookmarkDetailPanel(), useDeleteBookmark(), TagGroup(), TagGroupProps (+2 more)

### Community 27 - "Search and Filter UI"
Cohesion: 0.24
Nodes (11): FilterBar(), FilterBarProps, Tab, defaultProps, MobileSearchOverlay(), SearchDropdown(), load(), useRecentSearches() (+3 more)

### Community 28 - "Avatar Component"
Cohesion: 0.16
Nodes (12): Avatar(), AvatarProps, sizeClasses, Default, meta, Sizes, Story, WithImage (+4 more)

### Community 29 - "Web NPM Scripts"
Cohesion: 0.12
Nodes (16): scripts, ai, build, build-storybook, dev, lint, lint:fsd, start (+8 more)

### Community 30 - "Collection Detail and Queries"
Cohesion: 0.26
Nodes (13): CollectionDetailContent(), Props, useUpdateBookmark(), collectionKeys, useCollection(), useDeleteCollection(), useInviteMember(), useRemoveMember() (+5 more)

### Community 31 - "Login and Auth UI"
Cohesion: 0.23
Nodes (11): LoginClient(), LoginPage(), AuthFormData, authSchema, LoginLoadingSkeleton(), IconProps, LockIcon(), LogOutIcon() (+3 more)

### Community 32 - "Next.js TypeScript Config"
Cohesion: 0.12
Nodes (14): compilerOptions, allowJs, jsx, module, moduleResolution, noEmit, plugins, extends (+6 more)

### Community 33 - "Extension Package Config"
Cohesion: 0.13
Nodes (13): react, name, private, type, version, react-dom, @supabase/supabase-js, tailwindcss (+5 more)

### Community 34 - "Tag Primitive Components"
Cohesion: 0.18
Nodes (11): TagAddButton(), TagContext, TagContextValue, TagInput(), TagItem(), TagItemProps, TagPrimitive, TagRemoveButton() (+3 more)

### Community 35 - "Demo Virtual Bookmark Grid"
Cohesion: 0.22
Nodes (10): COUNT_PRESETS, DemoContent(), DemoPage(), metadata, makeFakeBookmarks(), TAG_POOL, TITLES, columnsForWidth() (+2 more)

### Community 37 - "Bookmark Error Codes"
Cohesion: 0.14
Nodes (13): BookmarkErrorCode, BOOKMARK_NOT_FOUND, DB_DELETE_FAILED, DB_INSERT_FAILED, DB_QUERY_FAILED, DB_UPDATE_FAILED, EMBEDDING_SAVE_FAILED, GUEST_LIMIT_EXCEEDED (+5 more)

### Community 38 - "Add to Collection and Toasts"
Cohesion: 0.21
Nodes (11): useAddBookmarkToCollection(), useCollectionBookmarks(), useRemoveBookmarkFromCollection(), AddToCollectionButton(), CollectionItem(), Props, listeners, toast (+3 more)

### Community 39 - "Live App Check Script"
Cohesion: 0.23
Nodes (11): ROOT, appDir, cfg, check(), checks, j(), log(), main() (+3 more)

### Community 40 - "Extension TypeScript Config"
Cohesion: 0.17
Nodes (11): compilerOptions, jsx, lib, module, moduleResolution, paths, target, exclude (+3 more)

### Community 41 - "Semantic Search Evaluation"
Cohesion: 0.24
Nodes (11): __dirname, embedQuery(), env(), fmt(), GoldenCase, GoldenSet, main(), MatchRow (+3 more)

### Community 42 - "Collection Pages and Skeletons"
Cohesion: 0.30
Nodes (8): CollectionDetailPage(), metadata, CollectionsPage(), metadata, FEATURES, CardSkeleton(), HeaderSkeleton(), PageLoadingSkeleton()

### Community 43 - "Semantic Similarity Utilities"
Cohesion: 0.29
Nodes (8): cosineSimilarity(), decodeEmbedding(), encodeEmbedding(), rankBySimilarity(), SEMANTIC_EXACT_THRESHOLD, SEMANTIC_MATCH_COUNT, SEMANTIC_MATCH_THRESHOLD, SemanticBookmark

### Community 44 - "Web TypeScript Config"
Cohesion: 0.17
Nodes (11): compilerOptions, paths, types, exclude, extends, include, @entities/*, @features/* (+3 more)

### Community 45 - "QA Test Author Guard"
Cohesion: 0.29
Nodes (11): ALLOWED_FILES, BASH_ALLOWED, checkBash(), checkDiff(), checkFileTool(), fileAllowed(), rel(), resultingText() (+3 more)

### Community 46 - "Base TypeScript Config"
Cohesion: 0.17
Nodes (11): compilerOptions, allowJs, esModuleInterop, isolatedModules, lib, module, moduleResolution, resolveJsonModule (+3 more)

### Community 47 - "Chat API and Middleware"
Cohesion: 0.22
Nodes (6): ChatSource, genAI, GuestBookmark, MatchRow, config, GUEST_COOKIE

### Community 48 - "Root Layout and Providers"
Cohesion: 0.24
Nodes (8): metadata, RootLayout(), viewport, QueryProvider(), Toaster(), pretendard, @vercel/analytics, @vercel/speed-insights

### Community 49 - "Bookmark List Component"
Cohesion: 0.22
Nodes (6): BookmarkList(), BookmarkListProps, Empty, meta, Story, WithBookmarks

### Community 50 - "Input Primitive Components"
Cohesion: 0.24
Nodes (8): InputContext, InputContextValue, InputError(), InputField, InputLabel(), InputLabelProps, InputRootProps, useInputContext()

### Community 51 - "Doc Path Checker"
Cohesion: 0.20
Nodes (8): docs, exists(), existsExact(), jsonIdx, problems, SKIP_DOCS, tracked, trackedSet

### Community 52 - "Extension Dev Dependencies"
Cohesion: 0.20
Nodes (10): devDependencies, autoprefixer, postcss, @smart-bookmark/typescript-config, tailwindcss, @types/react, @types/react-dom, typescript (+2 more)

### Community 53 - "Error Pages and Monitoring"
Cohesion: 0.44
Nodes (5): Error(), GlobalError(), MainError(), captureError(), ErrorState()

### Community 54 - "Chat Page and Realtime Sync"
Cohesion: 0.36
Nodes (6): ChatPage(), metadata, MainLayout(), useBookmarkRealtime(), BookmarkRealtimeSync(), getAuthState

### Community 55 - "Collections List and Creation"
Cohesion: 0.33
Nodes (7): CollectionsContent(), CollectionCard(), ROLE_BADGE, useCollections(), useCreateCollection(), CreateCollectionModal(), Props

### Community 58 - "Storybook Setup"
Cohesion: 0.20
Nodes (4): config, preview, annotations, @storybook/nextjs-vite

### Community 59 - "Bookmark Card Stories"
Cohesion: 0.22
Nodes (8): baseBookmark, Completed, Crawling, Failed, meta, Processing, Story, Unread

### Community 60 - "Search Bar and Input"
Cohesion: 0.31
Nodes (6): SearchBar(), SearchBarProps, Input, InputProps, sizeClasses, InputPrimitive

### Community 61 - "Input Stories"
Cohesion: 0.22
Nodes (8): Default, Disabled, ErrorState, meta, SearchInput, Sizes, Story, WithIcon

### Community 62 - "TypeScript Config Package"
Cohesion: 0.22
Nodes (8): exports, ./base.json, ./nextjs.json, ./react-library.json, license, name, private, version

### Community 65 - "Extension Build Scripts"
Cohesion: 0.29
Nodes (7): scripts, build, build:dev, build:firefox, dev, postinstall, zip

### Community 67 - "Vitest Configuration"
Cohesion: 0.33
Nodes (3): @storybook/addon-vitest, @vitejs/plugin-react, @vitest/browser-playwright

### Community 68 - "Extension Runtime Dependencies"
Cohesion: 0.40
Nodes (5): dependencies, @dnd-kit/core, react, react-dom, @supabase/supabase-js

### Community 69 - "Golden Set Data"
Cohesion: 0.40
Nodes (4): cases, description, evalUserId, $schema

### Community 70 - "API Response Types"
Cohesion: 0.40
Nodes (3): ApiError, ApiResponse, ErrorCode

### Community 71 - "UI TypeScript Config"
Cohesion: 0.40
Nodes (4): exclude, extends, include, @smart-bookmark/typescript-config/react-library.json

## Knowledge Gaps
- **46 isolated node(s):** `react`, `react`, `autoprefixer`, `postcss`, `@wxt-dev/module-react` (+41 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 583 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `Next.js Config and Pages` to `Crawl and Bulk Import API`, `Web Package Config`, `Collection API Routes`, `Bookmark Card Component`, `Bookmark Chat Hook`, `Bookmark Queries and Page`, `AI Embedding and Search APIs`, `Bookmark Filtering and Listing`, `Home Page and Store`, `Search and Filter UI`, `Collection Detail and Queries`, `Login and Auth UI`, `Demo Virtual Bookmark Grid`, `Collection Pages and Skeletons`, `Chat API and Middleware`, `Root Layout and Providers`, `Chat Page and Realtime Sync`, `Collections List and Creation`, `Extension Auth Pages`, `Auth Callback Page`?**
  _High betweenness centrality (0.153) - this node is a cross-community bridge._
- **What connects `react`, `react`, `autoprefixer` to the rest of the system?**
  _46 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Crawl and Bulk Import API` be split into smaller, more focused modules?**
  _Cohesion score 0.05789235639981909 - nodes in this community are weakly interconnected._
- **Why does `@google/generative-ai` connect `Crawl and Bulk Import API` to `Semantic Search Evaluation`, `AI Embedding and Search APIs`, `Chat API and Middleware`, `Web Package Config`?**
  _High betweenness centrality (0.113) - this node is a cross-community bridge._
- **Should `Extension Bookmark Manager` be split into smaller, more focused modules?**
  _Cohesion score 0.05683060109289618 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `Search and Filter UI` to `Add to Collection and Toasts`, `Web Package Config`, `Bookmark Card Component`, `Bookmark Chat Hook`, `Bookmark Queries and Page`, `Bookmark List Component`, `Next.js Config and Pages`, `Error Pages and Monitoring`, `Collections List and Creation`, `Bookmark Filtering and Listing`, `Home Page and Store`, `Search Bar and Input`, `Input Stories`, `Collection Detail and Queries`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Should `ESLint Configuration` be split into smaller, more focused modules?**
  _Cohesion score 0.06475485661424607 - nodes in this community are weakly interconnected._