import { browser } from '$app/environment';

type Theme = 'light' | 'dark';

function createThemeStore() {
	let theme = $state<Theme>('dark');

	function initialize() {
		if (!browser) return;

		// Check localStorage first
		const stored = localStorage.getItem('theme') as Theme | null;
		if (stored && (stored === 'light' || stored === 'dark')) {
			theme = stored;
		} else {
			// Check system preference
			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			theme = prefersDark ? 'dark' : 'light';
		}

		applyTheme(theme);

		// Listen for system preference changes
		window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
			if (!localStorage.getItem('theme')) {
				theme = e.matches ? 'dark' : 'light';
				applyTheme(theme);
			}
		});
	}

	function applyTheme(t: Theme) {
		if (!browser) return;
		document.documentElement.setAttribute('data-theme', t);
	}

	function toggle() {
		theme = theme === 'dark' ? 'light' : 'dark';
		if (browser) {
			localStorage.setItem('theme', theme);
			applyTheme(theme);
		}
	}

	function set(t: Theme) {
		theme = t;
		if (browser) {
			localStorage.setItem('theme', theme);
			applyTheme(theme);
		}
	}

	return {
		get current() {
			return theme;
		},
		initialize,
		toggle,
		set
	};
}

export const themeStore = createThemeStore();
