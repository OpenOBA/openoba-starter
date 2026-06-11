# Contributing to OpenOBA

鎰熻阿浣犲叧娉?OpenOBA锛?
OpenOBA 鏄?*浼佷笟鐨?AI 鎵ц瀹?*鈥斺€斾竴涓?AI Agent 鎿嶄綔绯荤粺锛岃浼佷笟閫氳繃鑷劧璇█瀹屾垚杩愯惀鍜屽紑鍙戙€?
## 琛屼负鍑嗗垯

鏈」鐩伒寰?[Contributor Covenant](https://www.contributor-covenant.org/) 琛屼负鍑嗗垯銆傝闃呰 CODE_OF_CONDUCT.md銆?
## 濡備綍璐＄尞

### 馃悰 鎶ュ憡 Bug

1. 鍦?GitHub Issues 鎼滅储鏄惁宸叉湁鐩稿悓闂
2. 鏂板缓 Issue锛屼娇鐢?Bug Report 妯℃澘
3. 鍖呭惈锛?   - 鐗堟湰鍙凤紙`/api/health` 鍙煡锛?   - 澶嶇幇姝ラ
   - 棰勬湡 vs 瀹為檯琛屼负
   - 鐜淇℃伅锛圤S銆丯ode.js 鐗堟湰銆佹暟鎹簱鐗堟湰锛?
### 馃挕 鍔熻兘寤鸿

1. 鍦?Issues 涓垱寤?Feature Request
2. 鎻忚堪浣跨敤鍦烘櫙鍜屾湡鏈涚殑琛屼负
3. 绛夊緟 maintainer 纭鏂瑰悜鍚庡啀寮€濮嬬紪鐮?
### 馃敡 鎻愪氦浠ｇ爜

#### 寮€鍙戠幆澧?
- **Node.js** >= 18
- **MySQL** >= 8.0
- **npm** >= 9

```bash
# 鍏嬮殕骞跺畨瑁?git clone <repo-url>
cd openoba-starter
npm install

# 缂栬瘧鍚庣
npm run build:backend

# 鍚姩寮€鍙戞ā寮?npm run start:backend    # 鍚庣 http://localhost:3000
npm run start:frontend   # 鍓嶇 http://localhost:5173

# 杩愯娴嬭瘯
npm test -w packages/backend
npm run test -w frontend
```

#### 鍒嗘敮绛栫暐

- `master` 鈥?绋冲畾鐗堟湰
- `feat/xxx` 鈥?鏂板姛鑳?- `fix/xxx` 鈥?Bug 淇
- `docs/xxx` 鈥?鏂囨。鍙樻洿

#### Commit 瑙勮寖

浣跨敤 [Conventional Commits](https://www.conventionalcommits.org/)锛?
```
feat: 鏂板 Wizard 鍒濆鍖栧悜瀵?fix: 淇 Swagger 鐢熶骇鐜鏆撮湶
docs: 鏇存柊 API 鏂囨。
chore: 鍗囩骇 TypeScript 鑷?5.1
refactor: 鎷嗗垎 OrderService
test: 鏂板搴撳瓨妯″潡闆嗘垚娴嬭瘯
```

#### 鎻愪氦鍓嶆鏌?
```bash
npm run lint          # ESLint 妫€鏌?npm run format:check  # Prettier 鏍煎紡妫€鏌?npm test -w packages/backend  # 鍚庣娴嬭瘯
```

鎵€鏈?PR 鍚堝苟鍓嶅繀椤婚€氳繃 CI 娴佹按绾裤€?
#### Pull Request 娴佺▼

1. Fork 浠撳簱
2. 鍒涘缓鍔熻兘鍒嗘敮
3. 缂栧啓浠ｇ爜 + 娴嬭瘯
4. 杩愯 `npm run lint` 鍜?`npm test`
5. 鎻愪氦 PR锛屽～鍐欐ā鏉?6. 绛夊緟 Code Review

### 馃摉 鏂囨。

- 鏂板 API 绔偣闇€瑕佸悓姝ユ洿鏂?Swagger 娉ㄨВ
- 鏋舵瀯鍙樻洿闇€瑕佹洿鏂?`docs/` 涓殑瀵瑰簲鏂囨。
- 浣跨敤涓枃缂栧啓鏂囨。锛堟敞閲婂彲鐢ㄨ嫳鏂囷級

## 椤圭洰缁撴瀯

```
openoba-starter/
鈹溾攢鈹€ packages/
鈹?  鈹溾攢鈹€ backend/         # NestJS 鍚庣锛堣涓?ERP 閫昏緫锛?鈹?  鈹?  鈹斺攢鈹€ src/
鈹?  鈹?      鈹溾攢鈹€ common/      # 閫氱敤缁勪欢锛堝畧鍗?鎷︽埅鍣?杩囨护鍣級
鈹?  鈹?      鈹溾攢鈹€ config/      # 閰嶇疆
鈹?  鈹?      鈹溾攢鈹€ modules/     # 涓氬姟妯″潡锛坧roduct/customer/order/...锛?鈹?  鈹?      鈹斺攢鈹€ schemas/     # ERDL Schema 瀹氫箟
鈹?  鈹斺攢鈹€ types/           # @openoba/types 鍏变韩绫诲瀷鍖?鈹溾攢鈹€ frontend/            # Vue 3 鍓嶇
鈹?  鈹斺攢鈹€ src/
鈹?      鈹溾攢鈹€ api/         # API 灏佽
鈹?      鈹溾攢鈹€ components/  # 閫氱敤缁勪欢
鈹?      鈹溾攢鈹€ composables/ # 缁勫悎寮忓嚱鏁?鈹?      鈹溾攢鈹€ views/       # 椤甸潰瑙嗗浘
鈹?      鈹斺攢鈹€ stores/      # Pinia 鐘舵€?鈹溾攢鈹€ openoba-core/        # CORE 寮曟搸锛堥棴婧?BSL锛?鈹溾攢鈹€ docs/                # 鍐呴儴鏂囨。
鈹斺攢鈹€ database/            # 鏁版嵁搴撹剼鏈?```

## 璁稿彲

OpenOBA Starter 鍚庣鍜屽墠绔噰鐢?**MIT** 璁稿彲銆侽penOBA Core 寮曟搸閲囩敤 **BSL**锛圔usiness Source License锛夈€?
鎻愪氦浠ｇ爜鍗宠〃绀轰綘鍚屾剰鍦?MIT 璁稿彲涓嬪垎鍙戜綘鐨勮础鐚€?
