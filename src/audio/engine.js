/**
 * @file engine.js
 * Comprehensive Procedural Web Audio Engine: SFX & Generative Synthwave Music
 * Pure Web Audio API synthesis adhering to strict hearing safety ceilings.
 */

import { Config } from '../config.js';

export class SoundSystem {
    constructor() {
        this.ctx = null;
        this.isMuted = !Config.audio.enabled;
        this.initialized = false;
        this.droneGain = null;
        this.musicGain = null;
        this.masterGain = null;
        this.tetherOsc = null;
        this.tetherGain = null;

        // Music sequencer state
        this.musicInterval = null;
        this.currentStep = 0;
        this.tempo = Config.audio.tempo || 124; // BPM
        this.isPlayingMusic = false;
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.initialized = true;

            // Master safety gain cap
            this.masterGain = this.ctx.createGain();
            const maxCap = Math.min(Config.audio.masterGain || 0.3, 0.3);
            this.masterGain.gain.setValueAtTime(maxCap, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);

            // Master music gain routed through master safety gain
            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.setValueAtTime(this.isMuted ? 0 : 0.18, this.ctx.currentTime);
            this.musicGain.connect(this.masterGain);

            this.startAmbientDrone();
            this.startMusic();
        } catch (e) {
            console.warn("Web Audio API not supported", e);
        }
    }

    resume() {
        if (!this.initialized) {
            this.init();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.droneGain && this.ctx) {
            this.droneGain.gain.setValueAtTime(this.isMuted ? 0 : 0.12, this.ctx.currentTime);
        }
        if (this.musicGain && this.ctx) {
            this.musicGain.gain.setValueAtTime(this.isMuted ? 0 : 0.18, this.ctx.currentTime);
        }
        return this.isMuted;
    }

    startAmbientDrone() {
        if (!this.ctx || this.isMuted) return;

        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        this.droneGain = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(55, this.ctx.currentTime); // A1

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(82.4, this.ctx.currentTime); // E2

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(140, this.ctx.currentTime);

        this.droneGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(this.droneGain);
        this.droneGain.connect(this.masterGain || this.ctx.destination);

        osc1.start();
        osc2.start();
    }

    // Generative 124 BPM Synthwave Sequencer
    startMusic() {
        if (!this.ctx || this.musicInterval) return;
        this.isPlayingMusic = true;

        // Bassline frequencies for Am -> F -> C -> G progression
        const chordRoots = [
            [55, 110, 164.8, 220],       // A minor (A1, A2, E3, A3)
            [43.65, 87.3, 130.8, 174.6], // F major (F1, F2, C3, F3)
            [65.4, 130.8, 196, 261.6],   // C major (C2, C3, G3, C4)
            [49, 98, 146.8, 196]         // G major (G1, G2, D3, G3)
        ];

        const stepTime = (60 / this.tempo) / 4; // 16th note in seconds

        const scheduleNote = () => {
            if (!this.isPlayingMusic || this.isMuted || !this.ctx) return;
            const now = this.ctx.currentTime;

            const chordIdx = Math.floor(this.currentStep / 16) % chordRoots.length;
            const subStep = this.currentStep % 16;
            const notes = chordRoots[chordIdx];

            // 1. Kick on beats 0, 4, 8, 12
            if (subStep % 4 === 0) {
                this.playKick(now);
            }

            // 2. Hi-hat on every off-beat
            if (subStep % 2 === 1) {
                this.playHiHat(now, subStep % 4 === 2);
            }

            // 3. Rolling synth bassline arpeggio
            const noteFreq = notes[subStep % notes.length];
            this.playBassNote(noteFreq, now, stepTime * 0.9);

            // 4. Subtle atmospheric lead melody
            if (subStep === 0 || subStep === 6 || subStep === 10 || subStep === 14) {
                const leadFreq = noteFreq * 2.0;
                this.playLeadNote(leadFreq, now, stepTime * 1.5);
            }

            this.currentStep = (this.currentStep + 1) % 64;
        };

        this.musicInterval = setInterval(scheduleNote, stepTime * 1000);
    }

    playKick(time) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.frequency.setValueAtTime(140, time);
        osc.frequency.exponentialRampToValueAtTime(32, time + 0.12);

        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

        osc.connect(gain);
        gain.connect(this.musicGain);

        osc.start(time);
        osc.stop(time + 0.15);
    }

    playHiHat(time, isAccent = false) {
        if (!this.ctx) return;
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.04);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(7000, time);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(isAccent ? 0.12 : 0.06, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        noise.start(time);
    }

    playBassNote(freq, time, duration) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(650, time);
        filter.frequency.exponentialRampToValueAtTime(200, time + duration);

        gain.gain.setValueAtTime(0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        osc.start(time);
        osc.stop(time + duration);
    }

    playLeadNote(freq, time, duration) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0.08, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

        osc.connect(gain);
        gain.connect(this.musicGain);

        osc.start(time);
        osc.stop(time + duration);
    }

    // Sound Effects
    playTetherAttach() {
        if (!this.ctx || this.isMuted) return;
        this.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const now = this.ctx.currentTime;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(780, now + 0.15);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(gain);
        gain.connect(this.masterGain || this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.2);
    }

    startTetherHum(frequency = 220) {
        if (!this.ctx || this.isMuted) return;
        this.resume();

        if (!this.tetherOsc) {
            this.tetherOsc = this.ctx.createOscillator();
            this.tetherGain = this.ctx.createGain();
            this.tetherOsc.type = 'triangle';
            this.tetherGain.gain.setValueAtTime(0.08, this.ctx.currentTime);
            this.tetherOsc.connect(this.tetherGain);
            this.tetherGain.connect(this.masterGain || this.ctx.destination);
            this.tetherOsc.start();
        }
        if (this.tetherOsc) {
            this.tetherOsc.frequency.setTargetAtTime(frequency, this.ctx.currentTime, 0.05);
        }
    }

    stopTetherHum() {
        if (this.tetherGain && this.ctx) {
            this.tetherGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
            setTimeout(() => {
                if (this.tetherOsc) {
                    try {
                        this.tetherOsc.stop();
                        this.tetherOsc.disconnect();
                    } catch (e) {}
                    this.tetherOsc = null;
                }
            }, 60);
        }
    }

    playSlingshotRelease(speedMultiplier = 1.0) {
        if (!this.ctx || this.isMuted) return;
        this.resume();
        this.stopTetherHum();

        const now = this.ctx.currentTime;

        const bufferSize = Math.floor(this.ctx.sampleRate * 0.25);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(400 * speedMultiplier, now);
        filter.frequency.exponentialRampToValueAtTime(1800 * speedMultiplier, now + 0.2);
        filter.Q.setValueAtTime(3.0, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain || this.ctx.destination);

        noise.start(now);
    }

    playPerfectLaunch() {
        if (!this.ctx || this.isMuted) return;
        this.resume();
        const now = this.ctx.currentTime;
        const chord = [523.25, 659.25, 783.99, 1046.50];

        chord.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const startTime = now + idx * 0.04;

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);

            gain.gain.setValueAtTime(0.18, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

            osc.connect(gain);
            gain.connect(this.masterGain || this.ctx.destination);

            osc.start(startTime);
            osc.stop(startTime + 0.36);
        });
    }

    playBoost() {
        if (!this.ctx || this.isMuted) return;
        this.resume();
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(380, now + 0.25);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain || this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.32);
    }

    playCollect() {
        if (!this.ctx || this.isMuted) return;
        this.resume();
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1760, now + 0.12);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(this.masterGain || this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.16);
    }

    playPhaseShift() {
        if (!this.ctx || this.isMuted) return;
        this.resume();
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.25);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.5);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.connect(gain);
        gain.connect(this.masterGain || this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.55);
    }

    playTimeDilation() {
        if (!this.ctx || this.isMuted) return;
        this.resume();
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.4);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.connect(gain);
        gain.connect(this.masterGain || this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.55);
    }

    playWormholeWarp() {
        if (!this.ctx || this.isMuted) return;
        this.resume();
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.linearRampToValueAtTime(1200, now + 0.4);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.8);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

        osc.connect(gain);
        gain.connect(this.masterGain || this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.85);
    }

    playWarningAlarm() {
        if (!this.ctx || this.isMuted) return;
        this.resume();
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(440, now + 0.08);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

        osc.connect(gain);
        gain.connect(this.masterGain || this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.18);
    }

    playExplosion() {
        if (!this.ctx || this.isMuted) return;
        this.resume();
        const now = this.ctx.currentTime;

        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(140, now);
        sub.frequency.exponentialRampToValueAtTime(25, now + 0.7);
        subGain.gain.setValueAtTime(0.5, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
        sub.connect(subGain);
        subGain.connect(this.masterGain || this.ctx.destination);
        sub.start(now);
        sub.stop(now + 0.75);

        const bufferSize = Math.floor(this.ctx.sampleRate * 0.6);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        noise.connect(gain);
        gain.connect(this.masterGain || this.ctx.destination);
        noise.start(now);
    }
}

export const sounds = new SoundSystem();
if (typeof window !== 'undefined') {
    window.sounds = sounds;
}
