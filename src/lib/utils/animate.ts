/** Browser animation actions. Content remains visible without JavaScript. */
export interface AnimateOptions {
  duration?: number
  delay?: number
  easing?: string
  fill?: FillMode
}

export interface StaggerOptions extends AnimateOptions {
  staggerDelay?: number
  selector?: string
  type?: 'fadeInUp' | 'fadeIn' | 'scaleIn' | 'slideInLeft'
}

export interface RevealOptions extends AnimateOptions {
  threshold?: number
  rootMargin?: string
  once?: boolean
  type?: 'fadeInUp' | 'fadeIn' | 'scaleIn' | 'slideInLeft'
}

export interface StaggerRevealOptions extends StaggerOptions {
  threshold?: number
  rootMargin?: string
  once?: boolean
}

interface MotionAction {
  destroy(): void
}

const DEFAULT_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)'
const frames = {
  fadeInUp: [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }],
  fadeInDown: [{ opacity: 0, transform: 'translateY(-12px)' }, { opacity: 1, transform: 'translateY(0)' }],
  fadeIn: [{ opacity: 0 }, { opacity: 1 }],
  scaleIn: [{ opacity: 0, transform: 'scale(0.97)' }, { opacity: 1, transform: 'scale(1)' }],
  slideInLeft: [{ opacity: 0, transform: 'translateX(-12px)' }, { opacity: 1, transform: 'translateX(0)' }],
  slideInRight: [{ opacity: 0, transform: 'translateX(12px)' }, { opacity: 1, transform: 'translateX(0)' }],
  slideUp: [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }]
} satisfies Record<string, Keyframe[]>

type MotionType = keyof typeof frames

function motionAction(
  root: HTMLElement,
  elements: HTMLElement[],
  keyframes: Keyframe[],
  opts: AnimateOptions & { staggerDelay?: number },
  scroll?: { threshold?: number; rootMargin?: string; once?: boolean }
): MotionAction {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
  const animations = new Set<Animation>()
  let observer: IntersectionObserver | null = null
  let disposed = false
  let revealed = false

  function cancelAnimations(): void {
    for (const animation of animations) animation.cancel()
    animations.clear()
  }

  function createAnimations(paused: boolean): void {
    elements.forEach((element, index) => {
      const animation = element.animate(keyframes, {
        duration: opts.duration ?? 500,
        delay: (opts.delay ?? 0) + Math.min(index * (opts.staggerDelay ?? 0), 240),
        easing: opts.easing ?? DEFAULT_EASING,
        fill: opts.fill ?? 'both'
      })
      if (paused) {
        animation.pause()
        animation.currentTime = 0
      }
      animations.add(animation)
      // Remove the effect after completion so CSS hover transforms can apply.
      void animation.finished.then(() => {
        animation.cancel()
        animations.delete(animation)
      }, () => { animations.delete(animation) })
    })
  }

  function show(): void {
    if (disposed || preference.matches || revealed) return
    revealed = true
    for (const animation of animations) animation.play()
    if (scroll?.once !== false) observer?.disconnect()
  }

  function handlePreference(): void {
    if (!preference.matches) return
    observer?.disconnect()
    cancelAnimations()
    root.removeEventListener('focusin', showOnFocus)
  }

  function showOnFocus(): void {
    revealed = true
    cancelAnimations()
    observer?.disconnect()
  }

  if (!preference.matches) {
    createAnimations(!!scroll)
    if (scroll) {
      observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            show()
          } else if (scroll.once === false && revealed) {
            revealed = false
            cancelAnimations()
            createAnimations(true)
          }
        }
      }, { threshold: scroll.threshold ?? 0, rootMargin: scroll.rootMargin ?? '0px 0px -24px 0px' })
      observer.observe(root)
      // Keyboard navigation must never land on content held transparent.
      root.addEventListener('focusin', showOnFocus)
    }
  }
  preference.addEventListener('change', handlePreference)

  return {
    destroy(): void {
      disposed = true
      observer?.disconnect()
      cancelAnimations()
      preference.removeEventListener('change', handlePreference)
      root.removeEventListener('focusin', showOnFocus)
    }
  }
}

function entrance(el: HTMLElement, type: MotionType, opts: AnimateOptions): MotionAction {
  return motionAction(el, [el], frames[type], opts)
}

export function fadeInUp(el: HTMLElement, opts: AnimateOptions = {}): MotionAction {
  return entrance(el, 'fadeInUp', opts)
}

export function fadeInDown(el: HTMLElement, opts: AnimateOptions = {}): MotionAction {
  return entrance(el, 'fadeInDown', opts)
}

export function fadeIn(el: HTMLElement, opts: AnimateOptions = {}): MotionAction {
  return entrance(el, 'fadeIn', opts)
}

export function scaleIn(el: HTMLElement, opts: AnimateOptions = {}): MotionAction {
  return entrance(el, 'scaleIn', opts)
}

export function slideInLeft(el: HTMLElement, opts: AnimateOptions = {}): MotionAction {
  return entrance(el, 'slideInLeft', opts)
}

export function slideInRight(el: HTMLElement, opts: AnimateOptions = {}): MotionAction {
  return entrance(el, 'slideInRight', { duration: 300, ...opts })
}

export function slideUp(el: HTMLElement, opts: AnimateOptions = {}): MotionAction {
  return entrance(el, 'slideUp', { duration: 300, ...opts })
}

export function stagger(el: HTMLElement, opts: StaggerOptions = {}): MotionAction {
  const children = Array.from(el.querySelectorAll<HTMLElement>(opts.selector ?? ':scope > *'))
  return motionAction(el, children, frames[opts.type ?? 'fadeInUp'], { staggerDelay: 60, ...opts })
}

export function reveal(el: HTMLElement, opts: RevealOptions = {}): MotionAction {
  return motionAction(el, [el], frames[opts.type ?? 'fadeInUp'], opts, opts)
}

export function staggerReveal(el: HTMLElement, opts: StaggerRevealOptions = {}): MotionAction {
  const children = Array.from(el.querySelectorAll<HTMLElement>(opts.selector ?? ':scope > *'))
  return motionAction(el, children, frames[opts.type ?? 'fadeInUp'], { staggerDelay: 60, ...opts }, opts)
}

export async function animateOut(
  el: HTMLElement,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions = {}
): Promise<void> {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const animation = el.animate(keyframes, { duration: 200, easing: 'ease-in', fill: 'forwards', ...options })
  try {
    await animation.finished
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'AbortError')) throw error
  }
}
