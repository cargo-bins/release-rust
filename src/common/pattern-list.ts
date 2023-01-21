import {debug, isDebug} from '@actions/core';
import {Minimatch} from 'minimatch';

export class PatternList {
	readonly patterns: Minimatch[];

	constructor(patterns: string[]) {
		this.patterns = patterns.map(
			pattern =>
				new Minimatch(pattern, {
					debug: isDebug()
				})
		);
	}

	static fromString(patterns: string): PatternList {
		return new PatternList(
			patterns
				.split(/\r?\n/)
				.map(line => line.trim())
				.filter(line => line.length > 0 && !line.startsWith('#'))
		);
	}

	matchOne(value: string): boolean {
		debug(`Matching: "${value}"`);
		return (
			this.patterns.some(pattern => pattern.match(value)) &&
			!this.patterns.some(
				pattern => pattern.negate && pattern.match(value)
			)
		);
	}

	matchList(values: string[]): string[] {
		return values.filter(value => this.matchOne(value));
	}

	matchListBy<T>(values: T[], fn: (value: T) => string): T[] {
		return values.filter(value => this.matchOne(fn(value)));
	}
}
