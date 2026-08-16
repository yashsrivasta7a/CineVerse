/**
 * Ambient declarations for static asset imports.
 *
 * Expo SDK 57 no longer ships these (nothing under `expo/types` declares
 * `*.png`), so every `import logo from '@/assets/...'` was a TS2307 error even
 * though Metro resolves it fine at runtime. Without this, `tsc --noEmit` can
 * never be clean, which makes it useless as a gate for the phases that
 * deliberately produce a one-time error sweep.
 */

declare module '*.png' {
  import type { ImageSourcePropType } from 'react-native';
  const content: ImageSourcePropType;
  export default content;
}

declare module '*.jpg' {
  import type { ImageSourcePropType } from 'react-native';
  const content: ImageSourcePropType;
  export default content;
}

declare module '*.jpeg' {
  import type { ImageSourcePropType } from 'react-native';
  const content: ImageSourcePropType;
  export default content;
}

declare module '*.gif' {
  import type { ImageSourcePropType } from 'react-native';
  const content: ImageSourcePropType;
  export default content;
}

declare module '*.webp' {
  import type { ImageSourcePropType } from 'react-native';
  const content: ImageSourcePropType;
  export default content;
}
