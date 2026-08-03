# Theme Forge — tema seu Hermes Desktop

**Plugin para o Hermes Desktop que faz o que o app não faz nativamente: temas
com imagem de fundo ou vídeo animado, paleta estendida, bold, tamanho de fonte,
cores de destaque no markdown e fundos animados (matrix rain, scanlines).**

- ✅ Sem build, sem tocar no código do app — um arquivo ESM + um backend Python opcional
- ✅ Aplicação em **1 clique** ("Aplicar") via o mecanismo nativo de skins do Hermes
- ✅ Edição ao vivo: as mudanças repintam na hora com o tema ativo
- ✅ 13 temas prontos, incluindo uma linha inspirada em filmes

## Temas incluídos

| Tema | Visual | Extras |
|---|---|---|
| **Forge Matrix** | Preto + verde fósforo | 🌧️ **Chuva digital animada** |
| **Forge Hacker** | Verde limão / roxo / amarelo, terminal | 📺 Scanlines CRT |
| **Forge Terminator** | HUD vermelho sobre gunmetal | 📺 Scanlines CRT |
| **Forge Spider-Man** | Preto + vermelho aranha | — |
| **Forge Wolverine** | Adamantium amarelo-mostarda + vermelho | — |
| **Forge Deadpool** | Vermelho mercenário sobre preto | — |
| **Forge Iron Man** | Vermelho arc-reactor + dourado | — |
| **Forge Batman** | Preto Gotham + amarelo bat-sinal | — |
| **Forge Dune** | Areia de Arrakis + âmbar de especiaria | — |
| **Forge Sith** | Preto imperial + sabre vermelho | — |
| Forge Cyber / Glass / Paper | Presets clássicos do Hermes | — |
| **Forge Custom** | Seu tema editável (persiste) | Tudo |

## O que ele faz que o Hermes não faz

| Recurso | Por que não existe nativamente |
|---|---|
| **Fundo com imagem ou vídeo animado** + overlay/blur | O modelo `DesktopTheme` só tem cores sólidas |
| **Paleta estendida** — `--ui-red/green/blue/purple/yellow/cyan/orange/warm` | Essas cores são fixas no `styles.css` do app |
| **Bold no texto** (3 níveis) | Sem controle de peso tipográfico por tema |
| **Tamanho da fonte da conversa** (11–18px) | Token existe mas sem UI |
| **Cores de destaque** (títulos, links, código no chat) | Não configurável |
| **Matrix rain animada** / scanlines CRT | Impossível no modelo de tema |
| **Aplicar tema com 1 clique** | O desktop não expõe `setTheme` a plugins |

## Instalação

### 1. Plugin desktop (obrigatório)

Copie a pasta para o diretório de plugins do Hermes Desktop:

```bash
mkdir -p ~/.hermes/desktop-plugins
cp -R theme-forge ~/.hermes/desktop-plugins/
```

(com perfil nomeado: `~/.hermes/profiles/<nome>/desktop-plugins/`)

### 2. Backend Python (recomendado — habilita o botão "Aplicar")

```bash
mkdir -p ~/.hermes/plugins
cp -R theme-forge ~/.hermes/plugins/           # usa dashboard/manifest.json + plugin_api.py
hermes plugins enable theme-forge 2>/dev/null || true
# garanta plugins.enabled no config.yaml:
hermes config set plugins.enabled '["theme-forge"]'
hermes gateway restart
```

> O backend monta `POST /api/plugins/theme-forge/activate` — grava o tema como
> skin Hermes real (`~/.hermes/skins/<nome>.yaml`) e ativa em ~1s em **todas as
> superfícies** (CLI, TUI, desktop). Sem ele, use ⌘K → Themes para ativar
> manualmente (os temas do forge aparecem na grade).

### 3. Ative o plugin no app

No Hermes Desktop: **⌘K → Reload desktop plugins**. A entrada **Theme Forge**
aparece na sidebar (ao lado de Capabilities/Messaging/Artifacts) e o painel
editor na barra lateral direita.

## Uso

1. **Aplicar um tema**: no painel, escolha o tema no seletor e clique **Aplicar**
   — ou selecione em **⌘K → Themes** (a grade nativa).
2. **Editar**: abas **Cores** (núcleo + paleta estendida), **Fundo** (imagem ou
   vídeo animado — URL ou "Procurar no Mac…", overlay 0–90%, blur 0–12px),
   **Texto** (fonte, tamanho, bold, cores de destaque para títulos/links/código).
3. **Persistência**: tudo é salvo automaticamente; o Custom persiste entre
   sessões. O tema ativo repinta ao vivo enquanto você edita. **O tema também
   sobrevive a updates do Hermes**: no boot, o plugin re-afirma o skin
   configurado (re-escreve `display.skin` → o watcher do gateway re-emite
   `skin.changed` → o desktop re-aplica o tema mesmo quando o update reseta o
   armazenamento local do app).

## Arquitetura

- `plugin.js` — contribui 13 temas (`THEMES_AREA`), painel + página
  (`ROUTES_AREA` + `SIDEBAR_NAV_AREA`) e um **CSS injection engine**: um
  `MutationObserver` no `<html>` detecta o tema ativo (`data-hermes-theme`) e
  injeta `<style>` com cores/bold/tamanho; o fundo (imagem **ou** vídeo
  `<video autoplay muted loop>`) é uma **camada de mídia** num container
  `position:fixed; z-index:-1` (blur só no fundo, não na UI), com overlay, rain
  e scanlines empilhados acima (z-index 0–3). Re-registrar um tema bumpa
  `$registryVersion` → o app repinta ao vivo.
- `dashboard/plugin_api.py` — endpoint `POST /activate`: valida tokens hex
  (whitelist), grava `skins/<nome>.yaml` e seta `display.skin`. O watcher do
  gateway emite `skin.changed` e todas as superfícies repintam. O formato do
  skin é o canônico do Hermes (`apps/shared/src/skin.ts`).

## Limitações conhecidas

- Imagem local vira **data URI** (limite ~2.5MB) e vídeo local ~3.5MB — acima
  disso o fundo funciona na sessão mas não persiste (quota do armazenamento);
  o plugin avisa. Para fundos grandes/definitivos, cole uma URL.
- O "Aplicar" usa a paleta do skin (conversão terminal-first); os **extras**
  (imagem, bold, cores, rain) continuam vindo do plugin quando o tema está ativo.
- A ativação é global (skin do Hermes) — vale para CLI/TUI/desktop.

## Desenvolvimento / publicação

- Hot-reload: o app observa o arquivo; salve e aguarde ~5s (ou ⌘K → Reload
  desktop plugins). Diagnóstico: `console.error` aparece em
  `~/.hermes/logs/desktop.log`.
- Este plugin é distribuído como exemplo oficial —
  [`NousResearch/hermes-example-plugins`](https://github.com/NousResearch/hermes-example-plugins).
  Não há marketplace de desktop plugins ainda; temas de filme são inspirações
  de paleta, sem associação oficial com os estúdios.

## Licença

MIT — veja `LICENSE`.
