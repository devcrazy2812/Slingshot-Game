/**
 * @file haptics.js
 * High-Precision Tactile Haptic Feedback Engine for iOS (Apple Taptic Engine), Android & Mobile Web.
 * Uses @capacitor/haptics for native iOS/Android micro-impulses with graceful Web Vibration API fallback.
 */

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export class HapticEngine {
    constructor() {
        const stored = (typeof localStorage !== 'undefined') ? localStorage.getItem('slingshot_haptics') : null;
        this.enabled = stored !== 'false';
        this.hasVibration = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
    }

    setEnabled(enabled) {
        this.enabled = !!enabled;
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('slingshot_haptics', this.enabled ? 'true' : 'false');
        }
    }

    vibrate(pattern) {
        if (!this.enabled || !this.hasVibration) return;
        try {
            navigator.vibrate(pattern);
        } catch (_) {}
    }

    async buttonTap() {
        if (!this.enabled) return;
        try {
            await Haptics.impact({ style: ImpactStyle.Light });
        } catch (_) {
            this.vibrate(10);
        }
    }

    async tetherAttach() {
        if (!this.enabled) return;
        try {
            await Haptics.impact({ style: ImpactStyle.Medium });
        } catch (_) {
            this.vibrate(18);
        }
    }

    async slingshotRelease(multiplier = 1.0) {
        if (!this.enabled) return;
        try {
            if (multiplier >= 2.0) {
                await Haptics.impact({ style: ImpactStyle.Heavy });
            } else {
                await Haptics.impact({ style: ImpactStyle.Medium });
            }
        } catch (_) {
            if (multiplier >= 2.0) {
                this.vibrate([35, 25, 60]);
            } else {
                this.vibrate([20, 20, 30]);
            }
        }
    }

    async perfectLaunch() {
        if (!this.enabled) return;
        try {
            await Haptics.notification({ type: NotificationType.Success });
        } catch (_) {
            this.vibrate([35, 25, 75]);
        }
    }

    async wormholeWarp() {
        if (!this.enabled) return;
        try {
            await Haptics.notification({ type: NotificationType.Warning });
        } catch (_) {
            this.vibrate([40, 25, 60, 25, 90]);
        }
    }

    async planetTouchdown() {
        if (!this.enabled) return;
        try {
            await Haptics.impact({ style: ImpactStyle.Heavy });
        } catch (_) {
            this.vibrate([60, 30, 80]);
        }
    }

    async hullDamage() {
        if (!this.enabled) return;
        try {
            await Haptics.notification({ type: NotificationType.Error });
        } catch (_) {
            this.vibrate([80, 40, 110]);
        }
    }

    async directiveComplete() {
        if (!this.enabled) return;
        try {
            await Haptics.notification({ type: NotificationType.Success });
        } catch (_) {
            this.vibrate([30, 30, 30, 30, 60]);
        }
    }

    async phaseShift() {
        if (!this.enabled) return;
        try {
            await Haptics.impact({ style: ImpactStyle.Light });
        } catch (_) {
            this.vibrate([25, 20, 25]);
        }
    }

    async timeDilation() {
        if (!this.enabled) return;
        try {
            await Haptics.impact({ style: ImpactStyle.Medium });
        } catch (_) {
            this.vibrate([40, 30, 20]);
        }
    }
}

export const haptics = new HapticEngine();
if (typeof window !== 'undefined') {
    window.haptics = haptics;
}
