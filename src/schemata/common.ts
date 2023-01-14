export function newlineList(str: string): string[] {
	return str
		.split('\n')
		.map(s => s.trim())
		.filter(s => s.length > 0 && !s.startsWith('#'));
}

export type Pattern = `*` | `!${string}` | string;
export type PatternMap = {[key: Pattern]: string};
