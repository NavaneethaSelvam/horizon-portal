# Horizon Portal — Task 1

A Next.js App Router + TypeScript + Tailwind CSS design-system showcase for the GrowMar Aura Workforce Horizon Portal training project.

> **Scope:** Task 1 only. This project does not include a database, Prisma, seed data, employee API, authentication, role-based access, or employee directory.

## Included

- Next.js App Router and TypeScript
- Tailwind CSS v4
- Design tokens in `design/design_tokens.json`
- Reusable Button, Input, Card, and Badge components
- Light/dark mode toggle
- Responsive `/design` showcase
- Simple home page with a link to `/design`
- Accessibility features such as labels, error associations, focus states, and disabled states

**Design-token note:** The included palette is a Horizon-inspired implementation default because the official `design_tokens.json` and `HORIZON_DESIGN_SYSTEM.html` were not supplied during generation. Replace these defaults with the official kit files if your programme provides them.

## Prerequisites

- Node.js 20 or newer (Node.js 22 LTS is recommended)
- npm
- VS Code

Check your installed versions in a terminal:

```powershell
node --version
npm --version
```

## Install and run on Windows

1. Extract `horizon-portal-task1.zip`.
2. Open the extracted `horizon-portal` folder in VS Code.
3. In VS Code, select **Terminal → New Terminal**.
4. Run:

```powershell
npm install
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000).
6. Open [http://localhost:3000/design](http://localhost:3000/design) to review the four components.

Stop the development server with `Ctrl+C`.

## Build and lint

```powershell
npm run lint
npm run build
```

Start the production build after a successful build:

```powershell
npm run start
```

## Folder structure

```text
horizon-portal/
├── design/design_tokens.json
├── src/
│   ├── app/
│   │   ├── design/page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── theme-provider.tsx
│   │   └── ui/
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       └── theme-toggle.tsx
│   └── lib/utils.ts
├── package.json
├── README.md
└── ...
```

## Design tokens and colours

The JSON token catalogue is stored at `design/design_tokens.json`. Runtime theme variables are declared in `src/app/globals.css` so Tailwind CSS v4 can use them as named utilities. Keep colour values centralised in these token declarations; components should use utilities such as `bg-primary`, `text-foreground`, `border-border`, and `text-muted`.

The runtime CSS variables mirror the JSON token catalogue. When changing the palette, update both files so they stay aligned.

### Check for hard-coded hex colours

The task's intended rule is no hard-coded hex colours in application code outside the design token file. In this starter implementation, runtime CSS variable declarations in `src/app/globals.css` are the runtime token layer and mirror `design/design_tokens.json`; this is documented because CSS variables must be defined for the browser to apply the theme.

To search source files in PowerShell:

```powershell
Get-ChildItem src -Recurse -File | Select-String -Pattern '#[0-9A-Fa-f]{3,8}\b'
```

This reports the CSS variable token declarations in `globals.css`. If your reviewer strictly requires all hex values to exist only in one JSON file, move the values into a generated CSS token file or adopt the official token pipeline supplied in your kit, then repeat the search.

## Theme

Use the **Dark mode / Light mode** toggle in the header. The preference is managed by `next-themes` and applied through a class on the HTML element.

## Git setup

```powershell
git init
git add .
git commit -m "Complete Horizon Portal Task 1 design system"
```

Create a private GitHub repository named `horizon-portal`, then follow GitHub's instructions to add the remote and push the repository. Do not commit credentials or `.env` files.

## Troubleshooting

### `npm` or `npx` scripts are blocked in PowerShell

Try `npm.cmd install` or `npm.cmd run dev` instead of `npm`.

### Port 3000 is already in use

Stop the other development server or run:

```powershell
npm run dev -- --port 3001
```

### Dependencies appear broken

Delete `node_modules` and `package-lock.json`, then run `npm install` again. Do not delete your source files.

### Dark mode looks unchanged

Use the theme toggle in the page header and refresh once. Ensure JavaScript is enabled and the `next-themes` package installed successfully.

## Verification status

This ZIP is generated from source files. A real dependency installation, browser run, lint, and production build must be executed in your environment before claiming those checks passed. No test is represented as passed here unless it has actually been run.
