/**
 * Web Animations API (WAAPI) utilities for Svelte 5.
 *
 * Provides reusable Svelte actions for entrance animations, stagger effects,
 * and scroll-triggered reveals — all using the browser-native WAAPI instead
 * of CSS @keyframes.
 *
 * Every helper respects `prefers-reduced-motion: reduce`.
 */

const REDUCED_MOTION =
	typeof window !== 'undefined' &&
	window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------------ */
/*  Shared types & defaults                                            */
/* ------------------------------------------------------------------ */

export interface AnimateOptions {
	/** Duration in ms (default 400) */
	duration?: number;
	/** Delay in ms (default 0) */
	delay?: number;
	/** CSS easing string (default ease-out spring-like curve) */
	easing?: string;
	/** Fill mode (default 'both') */
	fill?: FillMode;
}

const DEFAULT_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';

/* ------------------------------------------------------------------ */
/*  Low-level helper                                                   */
/* ------------------------------------------------------------------ */

function safeAnimate(
	el: HTMLElement,
	keyframes: Keyframe[],
	options: KeyframeAnimationOptions
): Animation | null {
	if (REDUCED_MOTION) {
		// Jump straight to final state
		const last = keyframes[keyframes.length - 1];
		if (last) Object.assign(el.style, last);
		return null;
	}
	return el.animate(keyframes, options);
}

/* ------------------------------------------------------------------ */
/*  Svelte actions                                                     */
/* ------------------------------------------------------------------ */

/**
 * Fade-in from below (translateY + opacity).
 *
 * Usage: `<div use:fadeInUp={{ delay: 100 }}>...</div>`
 */
export function fadeInUp(el: HTMLElement, opts: AnimateOptions = {}) {
	const { duration = 500, delay = 0, easing = DEFAULT_EASING, fill = 'both' } = opts;

	safeAnimate(
		el,
		[
			{ opacity: 0, transform: 'translateY(20px)' },
			{ opacity: 1, transform: 'translateY(0)' }
		],
		{ duration, delay, easing, fill }
	);
}

/**
 * Fade-in from above (translateY negative + opacity).
 *
 * Usage: `<div use:fadeInDown>...</div>`
 */
export function fadeInDown(el: HTMLElement, opts: AnimateOptions = {}) {
	const { duration = 500, delay = 0, easing = DEFAULT_EASING, fill = 'both' } = opts;

	safeAnimate(
		el,
		[
			{ opacity: 0, transform: 'translateY(-20px)' },
			{ opacity: 1, transform: 'translateY(0)' }
		],
		{ duration, delay, easing, fill }
	);
}

/**
 * Simple fade-in (opacity only).
 */
export function fadeIn(el: HTMLElement, opts: AnimateOptions = {}) {
	const { duration = 400, delay = 0, easing = 'ease-out', fill = 'both' } = opts;

	safeAnimate(el, [{ opacity: 0 }, { opacity: 1 }], { duration, delay, easing, fill });
}

/**
 * Scale-in with fade (scale + opacity).
 */
export function scaleIn(el: HTMLElement, opts: AnimateOptions = {}) {
	const { duration = 400, delay = 0, easing = DEFAULT_EASING, fill = 'both' } = opts;

	safeAnimate(
		el,
		[
			{ opacity: 0, transform: 'scale(0.95)' },
			{ opacity: 1, transform: 'scale(1)' }
		],
		{ duration, delay, easing, fill }
	);
}

/**
 * Slide-in from left.
 */
export function slideInLeft(el: HTMLElement, opts: AnimateOptions = {}) {
	const { duration = 450, delay = 0, easing = DEFAULT_EASING, fill = 'both' } = opts;

	safeAnimate(
		el,
		[
			{ opacity: 0, transform: 'translateX(-20px)' },
			{ opacity: 1, transform: 'translateX(0)' }
		],
		{ duration, delay, easing, fill }
	);
}

/**
 * Slide-in from right (used for toasts, slide-out panels, etc.).
 */
export function slideInRight(el: HTMLElement, opts: AnimateOptions = {}) {
	const { duration = 300, delay = 0, easing = DEFAULT_EASING, fill = 'both' } = opts;

	safeAnimate(
		el,
		[
			{ opacity: 0, transform: 'translateX(20px)' },
			{ opacity: 1, transform: 'translateX(0)' }
		],
		{ duration, delay, easing, fill }
	);
}

/**
 * Slide-up with fade (for bottom bars, modals, etc.).
 */
export function slideUp(el: HTMLElement, opts: AnimateOptions = {}) {
	const { duration = 300, delay = 0, easing = DEFAULT_EASING, fill = 'both' } = opts;

	safeAnimate(
		el,
		[
			{ opacity: 0, transform: 'translateY(16px)' },
			{ opacity: 1, transform: 'translateY(0)' }
		],
		{ duration, delay, easing, fill }
	);
}

/* ------------------------------------------------------------------ */
/*  Stagger helper                                                     */
/* ------------------------------------------------------------------ */

export interface StaggerOptions extends AnimateOptions {
	/** Delay between each child in ms (default 60) */
	staggerDelay?: number;
	/** CSS selector to select children (default ':scope > *') */
	selector?: string;
	/** Animation type (default 'fadeInUp') */
	type?: 'fadeInUp' | 'fadeIn' | 'scaleIn' | 'slideInLeft';
}

/**
 * Stagger-animate direct children of a container.
 *
 * Usage: `<div use:stagger={{ staggerDelay: 80 }}>...children...</div>`
 */
export function stagger(el: HTMLElement, opts: StaggerOptions = {}) {
	const {
		duration = 450,
		delay = 0,
		staggerDelay = 60,
		easing = DEFAULT_EASING,
		fill = 'both',
		selector = ':scope > *',
		type = 'fadeInUp'
	} = opts;

	const children = el.querySelectorAll<HTMLElement>(selector);

	const keyframesByType: Record<string, Keyframe[]> = {
		fadeInUp: [
			{ opacity: 0, transform: 'translateY(20px)' },
			{ opacity: 1, transform: 'translateY(0)' }
		],
		fadeIn: [{ opacity: 0 }, { opacity: 1 }],
		scaleIn: [
			{ opacity: 0, transform: 'scale(0.95)' },
			{ opacity: 1, transform: 'scale(1)' }
		],
		slideInLeft: [
			{ opacity: 0, transform: 'translateX(-20px)' },
			{ opacity: 1, transform: 'translateX(0)' }
		]
	};

	const keyframes = keyframesByType[type] || keyframesByType.fadeInUp;

	children.forEach((child, i) => {
		safeAnimate(child, keyframes, {
			duration,
			delay: delay + i * staggerDelay,
			easing,
			fill
		});
	});
}

/* ------------------------------------------------------------------ */
/*  Scroll-triggered reveal (IntersectionObserver + WAAPI)             */
/* ------------------------------------------------------------------ */

export interface RevealOptions extends AnimateOptions {
	/** IntersectionObserver threshold (default 0.1) */
	threshold?: number;
	/** Root margin for triggering earlier/later (default '0px 0px -40px 0px') */
	rootMargin?: string;
	/** Only animate once (default true) */
	once?: boolean;
	/** Animation type (default 'fadeInUp') */
	type?: 'fadeInUp' | 'fadeIn' | 'scaleIn' | 'slideInLeft';
}

/**
 * Reveal an element when it scrolls into view.
 *
 * Usage: `<div use:reveal={{ duration: 600 }}>...</div>`
 */
export function reveal(el: HTMLElement, opts: RevealOptions = {}) {
	const {
		duration = 500,
		delay = 0,
		easing = DEFAULT_EASING,
		fill = 'both',
		threshold = 0.1,
		rootMargin = '0px 0px -40px 0px',
		once = true,
		type = 'fadeInUp'
	} = opts;

	if (REDUCED_MOTION) return;

	// Start hidden
	el.style.opacity = '0';

	const animMap: Record<string, () => void> = {
		fadeInUp: () => fadeInUp(el, { duration, delay, easing, fill }),
		fadeIn: () => fadeIn(el, { duration, delay, easing, fill }),
		scaleIn: () => scaleIn(el, { duration, delay, easing, fill }),
		slideInLeft: () => slideInLeft(el, { duration, delay, easing, fill })
	};

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					(animMap[type] || animMap.fadeInUp)();
					if (once) observer.disconnect();
				}
			}
		},
		{ threshold, rootMargin }
	);

	observer.observe(el);

	return {
		destroy() {
			observer.disconnect();
		}
	};
}

/* ------------------------------------------------------------------ */
/*  Stagger-reveal for containers (scroll-triggered stagger)           */
/* ------------------------------------------------------------------ */

export interface StaggerRevealOptions extends StaggerOptions {
	/** IntersectionObserver threshold (default 0.1) */
	threshold?: number;
	/** Root margin (default '0px 0px -40px 0px') */
	rootMargin?: string;
	/** Only animate once (default true) */
	once?: boolean;
}

/**
 * Stagger-reveal children of a container when it scrolls into view.
 *
 * Usage: `<div use:staggerReveal={{ staggerDelay: 80 }}>...children...</div>`
 */
export function staggerReveal(el: HTMLElement, opts: StaggerRevealOptions = {}) {
	const {
		threshold = 0.1,
		rootMargin = '0px 0px -40px 0px',
		once = true,
		selector = ':scope > *',
		...staggerOpts
	} = opts;

	if (REDUCED_MOTION) return;

	// Start children hidden
	const children = el.querySelectorAll<HTMLElement>(selector);
	children.forEach((child) => {
		child.style.opacity = '0';
	});

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					stagger(el, { selector, ...staggerOpts });
					if (once) observer.disconnect();
				}
			}
		},
		{ threshold, rootMargin }
	);

	observer.observe(el);

	return {
		destroy() {
			observer.disconnect();
		}
	};
}

/* ------------------------------------------------------------------ */
/*  Programmatic animate-out (for toast dismiss, modal close, etc.)     */
/* ------------------------------------------------------------------ */

/**
 * Animate an element out and resolve when done.
 * Useful for exit animations before removing from DOM.
 */
export function animateOut(
	el: HTMLElement,
	keyframes: Keyframe[],
	options: KeyframeAnimationOptions = {}
): Promise<void> {
	if (REDUCED_MOTION) return Promise.resolve();

	const anim = el.animate(keyframes, {
		duration: 200,
		easing: 'ease-in',
		fill: 'forwards',
		...options
	});

	return anim.finished.then(() => undefined);
}
