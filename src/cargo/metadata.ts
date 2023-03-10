import {execAndSucceedWithOutput} from '../common/exec';

export async function cargoMetadata(): Promise<CargoMetadata> {
	const {stdout: json} = await execAndSucceedWithOutput('cargo', [
		'metadata',
		'--format-version',
		'1'
	]);
	return JSON.parse(json);
}

export interface CargoMetadata {
	packages: CargoPackage[];
	target_directory: string;
	version: 1;
	workspace_members: string[];
	workspace_root: string;
}

export interface CargoPackage {
	id: string;
	name: string;
	version: string;
	source: null | string;
	targets: CargoPackageTarget[];
	features: {
		[name: string]: string[];
	};
	manifest_path: string;
	publish: null | boolean | string;
	repository: string | null;
	rust_version: string | null;
}

export interface CargoPackageTarget {
	kind: TargetKind[];
	crate_types: CrateType[];
	name: string;
	src_path: string;
	test: boolean;
}

export type TargetKind =
	| 'bin'
	| 'lib'
	| 'example'
	| 'test'
	| 'bench'
	| 'custom-build';
export type CrateType =
	| 'bin'
	| 'lib'
	| 'rlib'
	| 'dylib'
	| 'cdylib'
	| 'staticlib'
	| 'proc-macro';
