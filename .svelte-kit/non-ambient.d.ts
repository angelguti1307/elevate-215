
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	type MatcherParam<M> = M extends (param : string) => param is (infer U extends string) ? U : string;

	export interface AppTypes {
		RouteId(): "/" | "/api" | "/api/schools" | "/api/schools/[schoolNumber]" | "/api/schools/[schoolNumber]/latest-visit";
		RouteParams(): {
			"/api/schools/[schoolNumber]": { schoolNumber: string };
			"/api/schools/[schoolNumber]/latest-visit": { schoolNumber: string }
		};
		LayoutParams(): {
			"/": { schoolNumber?: string | undefined };
			"/api": { schoolNumber?: string | undefined };
			"/api/schools": { schoolNumber?: string | undefined };
			"/api/schools/[schoolNumber]": { schoolNumber: string };
			"/api/schools/[schoolNumber]/latest-visit": { schoolNumber: string }
		};
		Pathname(): "/" | `/api/schools/${string}/latest-visit` & {};
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): string & {};
	}
}