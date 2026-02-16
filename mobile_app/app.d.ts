/// <reference types="nativewind/types" />

// We use a global augmentation which is conflict-free and covers ALL components
// including third-party ones like expo-linear-gradient.

import 'react';

declare module 'react' {
    interface Attributes {
        className?: string;
    }
}

// Optional: Specific augmentations if the global one misses compile-time checks for some props
// But strict module checking often causes the "Red Squiggles" inside this file itself.
// Keeping it simple prevents app.d.ts from being the source of errors.
