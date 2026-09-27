# SubstoreConfig

用于将 Sub-Store 组合订阅整理为适合 Mihomo / Clash Party 使用的配置。主脚本会接收 Sub-Store 注入的节点，完成节点整理、策略组生成、规则分流、DNS/TUN 配置，以及策略组图标内嵌。

## 主要功能

- 保留 Sub-Store 的节点顺序，并按完整连接配置精确去重。
- 保留同名但配置不同的节点，自动追加 `-2`、`-3` 等后缀。
- 自动生成香港、美国、日本、新加坡、台湾和其它地区策略组。
- 为 OpenAI、Claude、Gemini、Google、GitHub、Telegram、Netflix 等服务提供独立分流。
- 将未单独匹配的国外流量交给“国际”，未匹配流量交给“兜底策略”。
- 检测名称含“住宅”的 SOCKS/SOCKS5 节点，并通过“机场入口”建立链式代理。
- 启用 TUN、Sniffer、Fake-IP 和区分代理/直连的 DNS 配置。
- 将策略组图标以 Base64 Data URI 内嵌，客户端显示图标时不依赖外部图标 CDN。

## 使用方法

### 1. 在 Sub-Store 中使用脚本

1. 在 Sub-Store 中创建组合订阅，并加入需要合并的节点订阅。
2. 为组合订阅添加“脚本操作”或同类脚本处理步骤。
3. 使用下面的远程脚本地址：

```text
https://raw.githubusercontent.com/love-iu520/substore-config/main/scripts/mihomo-clash-party.js
```

4. 生成组合订阅地址并导入 Clash Party。
5. 修改本仓库并推送到 GitHub 后，需要在 Sub-Store 中重新生成/刷新组合订阅，再在 Clash Party 中更新订阅，客户端才会取得新配置。

> 不要使用 GitHub 文件浏览页地址；Sub-Store 需要的是上面的 `raw.githubusercontent.com` 原始文件地址。

私用版本 `scripts/mihomo-clash-party-preserve-dns.js` 保留已有 `config.dns`；没有 DNS 且节点服务器属于 `quandao.com` 或 `jiandaoyun.com` 时，自动补充狗狗加速专用 DNS。它包含账号专用地址，仅用于 Sub-Store 的本地内容，不应公开提交或上传。已有 DNS 不会自动合并或修正。其余处理与桌面版一致，仍保留原版的 TUN、DNS 劫持和顶层 IPv6 设置。该副本的内嵌图标不会由现有同步入口自动更新。

### 2. 机场入口与住宅节点

只有订阅中存在名称含“住宅”、类型为 SOCKS 或 SOCKS5 的节点时，脚本才会创建“机场入口”。住宅节点会自动设置 `dialer-proxy: 机场入口`。

机场入口只接收名称中同时满足以下条件的普通节点：

- 带 `🍃` 或 `🌏`；
- 带“美国”“美國”或“香港”。

例如 `🍃美国-01` 可以进入机场入口，普通的 `美国高速`、`US` 或 `HK` 不会进入。存在住宅节点但没有合格入口时，“机场入口”只包含 `REJECT`，以避免住宅节点绕过链式代理直接连接。

## 项目结构

| 路径 | 作用 |
|---|---|
| `scripts/mihomo-clash-party.js` | Sub-Store 后处理主脚本，也是实际发布给客户端的文件 |
| `scripts/mihomo-clash-party-preserve-dns.js` | 私用桌面版：保留已有 DNS，无 DNS 时为狗狗加速节点补充专用解析 |
| `icons/` | 策略组 PNG 图标源文件 |
| `sync-icons.py` | Python 图标同步脚本 |
| `sync-icons.js` | Node.js 图标同步脚本，作为 Python 不可用时的替代入口 |
| `一键同步图标.bat` | Windows 一键同步入口，优先使用 Python，找不到 Python 时再使用 Node.js |

`scripts/mihomo-clash-party.js` 中以下标记之间的 `groupIcons` 内容是自动生成的，不要手动编辑：

```javascript
// ===== 策略组图标 (由 sync-icons.py 自动生成，Base64 纯离线内联) =====
// ...
// ===== 策略组图标生成结束 =====
```

## 日后新增分组并同步

新增一个策略组不是只增加一个名称。请按下面顺序完成代码、规则、图标和远端订阅的同步。

### 第一步：增加策略组

编辑 `scripts/mihomo-clash-party.js`：

1. 将新分组名称加入文件开头的 `reservedProxyNames` 列表，防止订阅节点与策略组重名。
2. 在 `proxyGroups` 构建区域加入新策略组。可按用途复用现有列表：
   - `aiServiceProxyList()`：AI 子服务，可跟随 AI、Proxy、美国或选择实际节点；
   - `foreignServiceProxyList()`：普通海外服务；
   - `domesticServiceProxyList()`：默认直连的国内服务；
   - `safeProxyList()`：地区组或自定义节点列表为空时使用 `REJECT` 兜底。
3. 如果流量需要自动进入新分组，在 `config.rules` 中加入对应规则。具体服务规则必须放在 Google、Microsoft、`geolocation-!cn` 等覆盖面更大的规则之前。
4. 如果使用新的 `RULE-SET` 名称，还要在 `config["rule-providers"]` 中增加同名 provider；只写 `DOMAIN`、`DOMAIN-SUFFIX` 等内联规则时不需要 provider。

示例（仅展示结构，域名和候选策略需按实际用途调整）：

```javascript
// 1. reservedProxyNames 中加入 "Example"

// 2. proxyGroups 中创建分组
proxyGroups.push(createSelectGroup("Example", foreignServiceProxyList()));

// 3. config.rules 中加入分流，并放在更宽泛的规则之前
"DOMAIN-SUFFIX,example.com,Example",
```

### 第二步：增加图标映射

1. 将新分组的 PNG 图标放入 `icons/`，例如 `icons/Example.png`。
2. 在 `sync-icons.py` 的 `ICON_MAPPING` 中加入映射。
3. 在 `sync-icons.js` 的 `ICON_MAPPING` 中加入完全相同的映射，确保 Python 和 Node 两个同步入口结果一致。

```text
策略组显示名称 -> icons/ 下的文件名
Example          -> Example.png
```

映射键必须与 `proxyGroups` 中的 `name` 完全一致，包括大小写、空格和中文字符。若只新增分组而不配置映射，分组仍能工作，但不会获得内嵌图标。

### 第三步：生成内嵌图标

Windows 下直接双击：

```text
一键同步图标.bat
```

也可以在项目根目录手动选择一个入口：

```bash
py sync-icons.py
```

```bash
node sync-icons.js
```

同步脚本会读取 `icons/`，重新生成完整的 `groupIcons` 区域，并写回 `scripts/mihomo-clash-party.js`。输出中每个映射都应显示 `[OK]`；如果出现“缺少图标文件”警告，应先修正文件名或映射再发布。

### 第四步：同步到 Sub-Store 和客户端

1. 提交本次修改并推送到 GitHub 的 `main` 分支。
2. 在 Sub-Store 中重新生成或刷新组合订阅，使其重新拉取远程脚本。
3. 在 Clash Party 中更新对应订阅。
4. 确认新策略组、分流规则和图标均已出现。

只替换现有图标时，无需修改策略组和规则：保持图标文件名不变，覆盖 `icons/` 中的文件，重新运行同步脚本并完成上面的远端同步即可。

## 修改时的注意事项

- 主脚本会删除输入配置中的 `proxy-providers`，节点应由 Sub-Store 组合订阅注入到 `config.proxies`。
- 主脚本会重建 `proxy-groups`、`rules` 和 `rule-providers`；不要依赖输入配置中同名内容继续保留。
- 规则按从上到下匹配。新增具体服务规则时，应放在能够覆盖它的通用规则之前。
- 图标只在客户端展示时离线；远程规则集仍需要 Mihomo 能访问对应的 GitHub 规则源。
- 项目没有第三方包依赖；图标同步只需要 Python 3 或 Node.js 中任意一个运行环境。
