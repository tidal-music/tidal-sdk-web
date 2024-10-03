/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PLAYER_VERSION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
