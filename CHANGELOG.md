# Changelog

## 1.0.0 (2026-02-20)


### Features

* add admin authentication with Argon2 and session management ([8080f5e](https://github.com/Xerrion/xerrion-io/commit/8080f5e865c16d14420d134b9b02e0405bf8a964))
* add gallery category CRUD management ([c34a7fd](https://github.com/Xerrion/xerrion-io/commit/c34a7fda0702b3c38e7329ba41b7aa7866b1e63d))
* add image upload pipeline with HEIC support ([acefc83](https://github.com/Xerrion/xerrion-io/commit/acefc83de817ea832b6aa603c7453b47d4c311c3))
* add multi-select with bulk delete to gallery admin ([7c5cd76](https://github.com/Xerrion/xerrion-io/commit/7c5cd76321e5096b426273f857acf902d3064f70))
* add multi-select with bulk delete to gallery admin ([63c1a4a](https://github.com/Xerrion/xerrion-io/commit/63c1a4ab05f901cceb65692c951e56799cf63682))
* add per-file upload progress bars with 3 concurrent uploads ([a48918d](https://github.com/Xerrion/xerrion-io/commit/a48918dcf2a6e723e0bed598b21906d960f36b6f))
* add photo listing and management ([54c9495](https://github.com/Xerrion/xerrion-io/commit/54c949552c6c6a89c3042ff2e626fb444c24224f))
* add pinned repos support with GitHub GraphQL API ([3e1ff2d](https://github.com/Xerrion/xerrion-io/commit/3e1ff2db75ededd3e262f8989e1f54f7d2aa3ae7))
* add superforms, formsnap, zod v4, and svelte-motion dependencies ([1ac8bdf](https://github.com/Xerrion/xerrion-io/commit/1ac8bdf16ed7c91c9ee2af5a7a9374831d3deeeb))
* add svelte-motion animations to admin panel ([81486d2](https://github.com/Xerrion/xerrion-io/commit/81486d25739891df590b0c8a62f5433a38e6511f))
* add Turso database client, schema, and admin seed script ([07a4c3b](https://github.com/Xerrion/xerrion-io/commit/07a4c3b4b60a353537f8aceaa4c002fb4188a6df))
* add Umami and Google Analytics tracking ([#33](https://github.com/Xerrion/xerrion-io/issues/33)) ([0fad8b5](https://github.com/Xerrion/xerrion-io/commit/0fad8b58d9938784293f2906ece1a9b3820d8fe1))
* add visual distinction for pinned repos ([1385e00](https://github.com/Xerrion/xerrion-io/commit/1385e000b51c6fe7b35c6fa674393fbdd1f7c324))
* auth-gated admin backend with gallery management and image upload pipeline ([71e04c2](https://github.com/Xerrion/xerrion-io/commit/71e04c2e9d5e42c0d0d7888f2060d0049bfe6e9d))
* block robots and crawlers from admin routes ([f80ebf7](https://github.com/Xerrion/xerrion-io/commit/f80ebf7905c86c412d7a6a0d6cc006e3932dcd05))
* display pinned GitHub repos first ([0987012](https://github.com/Xerrion/xerrion-io/commit/0987012a232e850c1d4ef05deb2da572b7bbbe32))
* **gallery:** redesign with masonry layout, animations, and improved lightbox ([#14](https://github.com/Xerrion/xerrion-io/issues/14)) ([1cb6128](https://github.com/Xerrion/xerrion-io/commit/1cb61286e172718211cd9c476828fbfbee3bad30))
* **gallery:** support category.yaml config files for metadata ([#13](https://github.com/Xerrion/xerrion-io/issues/13)) ([12a628b](https://github.com/Xerrion/xerrion-io/commit/12a628b80b43bda630ba14185e0544bf2c571fb1))
* integrate superforms and formsnap into admin login ([a51a2a9](https://github.com/Xerrion/xerrion-io/commit/a51a2a9bcf97b50405fac635c1bdd2b09062a994))
* integrate superforms into category management ([1684d5f](https://github.com/Xerrion/xerrion-io/commit/1684d5f92d8f909ed193c575e4f482c9788d71fc))
* migrate gallery from Supabase to Vercel Blob Storage ([#12](https://github.com/Xerrion/xerrion-io/issues/12)) ([fa9a873](https://github.com/Xerrion/xerrion-io/commit/fa9a8731b6dad69149a560c0047dc21297bd2a12))
* migrate hosting from Cloudflare Workers to Vercel ([#6](https://github.com/Xerrion/xerrion-io/issues/6)) ([a6430d5](https://github.com/Xerrion/xerrion-io/commit/a6430d5cd8f26bd14a1609942859e27fb232d337))
* optimize HEIC pipeline — remove PNG intermediate and parallelize resizes ([#27](https://github.com/Xerrion/xerrion-io/issues/27)) ([32097bd](https://github.com/Xerrion/xerrion-io/commit/32097bdf1f3bea67a4ee00a994cdcffcc0f93005))
* replace inline success/error messages with toast notifications ([2044251](https://github.com/Xerrion/xerrion-io/commit/204425109ea285df43195e0e8b26ff41c6d74dcb))
* restructure admin sidebar with collapsible gallery nav ([#29](https://github.com/Xerrion/xerrion-io/issues/29)) ([ea6f324](https://github.com/Xerrion/xerrion-io/commit/ea6f3244d9adf33d91695cdfacdc5f049e54cbc5))
* restructure routes with layout groups to isolate admin layout ([b7dc432](https://github.com/Xerrion/xerrion-io/commit/b7dc4322874f2c814270f7618988401856e5cbaf))
* SEO overhaul with Lighthouse performance and accessibility fixes ([#5](https://github.com/Xerrion/xerrion-io/issues/5)) ([9c5673f](https://github.com/Xerrion/xerrion-io/commit/9c5673fdfe60c6485836b9644f25a8904639eb10))
* show individual WebP sizes per photo in gallery admin ([#28](https://github.com/Xerrion/xerrion-io/issues/28)) ([0de797c](https://github.com/Xerrion/xerrion-io/commit/0de797cbb5dbfc5aed515ec84c7dd6a5fbefa96c))
* stream processing progress via SSE with animated progress bars ([e6e6c1a](https://github.com/Xerrion/xerrion-io/commit/e6e6c1a0f973457537880d9c8a632d05c6a7b30d))
* stream processing progress via SSE with animated progress bars ([71c6719](https://github.com/Xerrion/xerrion-io/commit/71c67192c5373b7bcad844fcc507699fe2548d56))
* switch upload pipeline to client-side Vercel Blob uploads ([66ef61e](https://github.com/Xerrion/xerrion-io/commit/66ef61ebf1bf84bb88ec21fac17e5db1e322884f))
* toast notifications and client-side upload pipeline ([ba7c24d](https://github.com/Xerrion/xerrion-io/commit/ba7c24d0ea908dbfe2106df778250e7ff5ebebbf))
* wire public gallery to Turso with blob fallback ([d342e8e](https://github.com/Xerrion/xerrion-io/commit/d342e8e1ff30dab57e35505cdf28b32c500d5264))


### Bug Fixes

* add sveltekit-superforms to ssr.noExternal for dev compatibility ([87a47d5](https://github.com/Xerrion/xerrion-io/commit/87a47d584f8fd22490d01299b6180dc9590cc9bf))
* add wrangler config for Cloudflare Pages deployment ([ad350aa](https://github.com/Xerrion/xerrion-io/commit/ad350aa80b5b54bc061d93925a64f9b2977cae76))
* close edit row after category update to prevent form reset ([be08fe8](https://github.com/Xerrion/xerrion-io/commit/be08fe83d3045394a97fff2f0c5d0c4174750dab))
* **gallery:** improve lightbox mobile experience with touch gestures ([53064ea](https://github.com/Xerrion/xerrion-io/commit/53064eabf99bf8fe5697c41001d9292d00e68290))
* **gallery:** improve lightbox mobile experience with touch gestures ([b030b42](https://github.com/Xerrion/xerrion-io/commit/b030b420cea5301f943f0c76748f454454817c9f))
* gracefully handle gallery database errors ([50e91da](https://github.com/Xerrion/xerrion-io/commit/50e91dad4b774691efdf19ab396f22132f1a7717))
* gracefully handle gallery database errors instead of crashing ([650c66c](https://github.com/Xerrion/xerrion-io/commit/650c66c7d313572d90b66963456d0975219daa4b))
* make login form inputs clickable and suppress superforms warning ([8f46cde](https://github.com/Xerrion/xerrion-io/commit/8f46cde155bc0bca511fba5e4ea378ed38413d22))
* mark @node-rs/argon2 as external for Vercel serverless compatibility ([e48d09b](https://github.com/Xerrion/xerrion-io/commit/e48d09b8d24dfc01a2f6c52f8a46b8684ffc3af8))
* normalize HEIC raw pixels to PNG before resize passes ([#24](https://github.com/Xerrion/xerrion-io/issues/24)) ([b1352e1](https://github.com/Xerrion/xerrion-io/commit/b1352e14fa12960d9497db3996936e4b5ac05b01))
* pass clean ArrayBuffer to heic-decode to avoid shared buffer issues ([#22](https://github.com/Xerrion/xerrion-io/issues/22)) ([e4bc58d](https://github.com/Xerrion/xerrion-io/commit/e4bc58dc4fcd4cacfaeb86cf3a1f81c5a40e93f1))
* pass explicit blob token from env for local dev compatibility ([81f4673](https://github.com/Xerrion/xerrion-io/commit/81f4673ba7015586f5858c9def8f3e90dc9cf108))
* pass Uint8Array instead of ArrayBuffer to heic-decode ([#23](https://github.com/Xerrion/xerrion-io/issues/23)) ([a7440d6](https://github.com/Xerrion/xerrion-io/commit/a7440d67f30412375c830b075a9f7e84399a60b2))
* pass Uint8Array to heic-convert to fix spread syntax error ([cb21b23](https://github.com/Xerrion/xerrion-io/commit/cb21b23e9f4b734552509479a735a2aa21026f40))
* remove blob fallback causing gallery images to appear 3x on Vercel ([643858a](https://github.com/Xerrion/xerrion-io/commit/643858a71c531f1d40a06c0cc991fd9a6aa5e1d6))
* remove blob fallback that caused gallery images to appear 3x on Vercel ([66b50b9](https://github.com/Xerrion/xerrion-io/commit/66b50b9e33d1a3723e2a6d46b0c0e274a59a2ecb))
* replace beatlabs/delete-old-branches-action with gh CLI script ([#34](https://github.com/Xerrion/xerrion-io/issues/34)) ([1cbd9c1](https://github.com/Xerrion/xerrion-io/commit/1cbd9c184fc893b099ed5cddcdf2452755ba3893))
* update wrangler config for Cloudflare Pages deployment ([#3](https://github.com/Xerrion/xerrion-io/issues/3)) ([b8a1221](https://github.com/Xerrion/xerrion-io/commit/b8a1221de6c1167735e9bc6c86c39b1fb7748b36))
* update wrangler config for Workers Static Assets deployment ([60a4996](https://github.com/Xerrion/xerrion-io/commit/60a499648c4c399523aa2102b4dcdb08a85e86f4))


### Performance Improvements

* eliminate lossy JPEG intermediate in HEIC processing ([0781d2d](https://github.com/Xerrion/xerrion-io/commit/0781d2daf91312f6a6cf0fe7865d2c8806f28b43))
* eliminate lossy JPEG intermediate in HEIC processing pipeline ([f41248b](https://github.com/Xerrion/xerrion-io/commit/f41248b92631014e6486371649b6314ef20939be))
