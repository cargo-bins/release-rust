import globLib, {IOptions} from 'glob';

export async function glob(
	pattern: string,
	options: IOptions = {}
): Promise<string[]> {
	return new Promise((resolve, reject) => {
		globLib(pattern, options, (error, matches) => {
			if (error) {
				reject(error);
			} else {
				resolve(matches);
			}
		});
	});
}
