# React + shadcn + Tailwind bootstrap

The current marketing site is a static HTML/Node server. To actually render the provided React components (such as `ShaderAnimation`) you need a framework that supports the shadcn project layout, Tailwind CSS, and TypeScript.

## 1. Scaffold a Next.js + TypeScript workspace
1. `npx create-next-app@latest aseby-app --typescript --eslint --tailwind --app --src-dir --import-alias "@/*"`
2. `cd aseby-app`
3. The default style entry lives at `src/app/globals.css`. Keep Tailwind's `@tailwind base/components/utilities` directives there so every route picks up the design tokens.

## 2. Install and initialize shadcn/ui
1. `npx shadcn@latest init`
2. Accept the defaults so shadcn generates components inside `/components/ui`. This folder does **not** exist in the current static site, so creating it keeps parity with shadcn's generators and the import path used by `DemoOne`.
3. Run `npx shadcn@latest add button card` (or whichever primitives you need) to populate `/components/ui` with Tailwind-ready building blocks.

## 3. Wire up the shader component
1. Copy `components/ui/shader-animation.tsx` from this repo into `aseby-app/components/ui/shader-animation.tsx`.
2. Ensure `tsconfig.json` contains `"paths": { "@/*": ["./src/*"] }` so imports like `@/components/ui/shader-animation` resolve.
3. Create an example route such as `src/app/demo/page.tsx` and paste the `DemoOne` component so you can verify the effect renders.

## 4. Dependencies
Run `npm install three` (and optionally `npm install --save-dev @types/three`) inside the Next.js app; Three.js is required for the shader component.

> **Note:** The dependency was added to `package.json` here, but installing inside this container failed due to upstream registry restrictions. Run the install in your own environment to fetch the package successfully.

## 5. Tailwind utilities
shadcn/ui expects Tailwind's config to expose CSS variables for color tokens. Make sure `tailwind.config.js` includes the `content` entries for `./src/**/*.{ts,tsx}` and extend the theme to include the Aseby Studio palette so components share the same brand colors.
