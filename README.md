# MITOSIS

2D-аркада с видом сверху в духе клеточной стадии Spore: выживи в микроскопическом
бульоне, накопи ДНК, эволюционируй и доведи свою клетку до митоза за 20–30 минут.

**Играть:** https://arthurkorol.github.io/MITOSIS/

## Разработка

```bash
pnpm install
pnpm dev        # локальный сервер
pnpm test       # vitest (чистая логика симуляции)
pnpm typecheck  # tsc --noEmit
pnpm build      # прод-сборка в dist/
```

Стек: TypeScript (strict) + Canvas 2D, без игрового движка и runtime-зависимостей.
Сборка Vite, тесты vitest, деплой на GitHub Pages через Actions.

Дизайн-документ: [docs/mitosis_doc.md](docs/mitosis_doc.md).

Отладка: `?debug` — FPS и seed, `?seed=N` — воспроизводимый мир.
