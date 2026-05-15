# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  # SAFPA Frontend

  This is the React + TypeScript + Vite frontend for SAFPA FPOS.

  Key capabilities:
  - role-based route guards and dashboards
  - tenant-aware parlour branding
  - member, policy, collections, funeral-case, document, communication, and reporting workflows
  - SAFPA admin adoption and active-usage visibility across dashboard and parlour management screens

  Default URLs:
  - frontend: `http://localhost:5173`
  - backend: `http://localhost:4000`

  Common commands:
  ```bash
  npm install
  npm run dev
  npm run build
  npm run lint
  ```

  Recommended project docs:
  - `../FRONTEND_CODEBASE_GUIDE.md`
  - `../FULL_PROJECT_RUN_AND_INTERACTION_GUIDE.md`
  - `../SAFPA FPOS — Role & Page Reference.md`
You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:
