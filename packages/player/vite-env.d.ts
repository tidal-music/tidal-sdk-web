/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly PACKAGE_VERSION: string;
  readonly TEST_USER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
