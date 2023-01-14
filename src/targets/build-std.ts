import { InputsType } from "../schemata/index";
import { nightlyDate } from "../toolchain";

const BUILD_STD_TARGETS = [
	// macOS
	'x86_64-apple-darwin',
	'aarch64-apple-darwin',

	// Linux GNU
	'x86_64-unknown-linux-gnu',
	'armv7-unknown-linux-gnueabihf',
	'aarch64-unknown-linux-gnu',

	// Linux musl
	'x86_64-unknown-linux-musl',
	'armv7-unknown-linux-musleabihf',
	'aarch64-unknown-linux-musl',

	// Windows
	'x86_64-pc-windows-msvc',
	'aarch64-pc-windows-msvc'
];

const BUILD_STD_MINIMUM_NIGHTLY = new Date('2020-01-01');

export function buildStdEnabled(inputs: InputsType): boolean {
	if (
		(nightlyDate(inputs.setup.toolchain) ?? new Date(0)) <
		BUILD_STD_MINIMUM_NIGHTLY
	) {
		return false;
	}

	if (!BUILD_STD_TARGETS.includes(inputs.setup.target)) {
		return false;
	}

	return inputs.build.buildstd;
}
