import * as process from 'process';
import * as cp from 'child_process';
import * as path from 'path';

export function runAction(inputs: {[key: string]: string}): {
	[key: string]: string;
} {
	const np = process.execPath;
	const ip = path.join(__dirname, '..', 'lib', 'main.js');
	const options: cp.ExecFileSyncOptions = {
		env: Object.fromEntries(
			Object.entries(inputs).map(([key, value]) => [
				`INPUT_${key.toUpperCase()}`,
				value
			])
		)
	};

	return Object.fromEntries(
		cp
			.execFileSync(np, [ip], options)
			.toString()
			.split('\n')
			.filter(line => line.startsWith('::set-output name='))
			.map(line => {
				const match = /^::set-output name=(.+)::(.*)$/.exec(line);
				if (!match) throw new Error(`Invalid output: ${line}`);
				return [match[1], match[2]];
			})
	);
}
