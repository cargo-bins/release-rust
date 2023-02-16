import {info} from '@actions/core';
import {CargoPackage} from '../cargo/metadata';
import {execAndSucceedWithOutput, hookEnv, runHook} from '../common/exec';
import {extraFlags} from '../common/flags';
import {InputsType} from '../schemata/index';
import {runnerHostTarget} from '../schemata/setup';
import {allowedCrossTarget} from '../targets/cross';

export default async function buildPhase(
	inputs: InputsType,
	crates: CargoPackage[]
): Promise<string | undefined> {
	let useCross;
	if (inputs.build.useCross !== undefined) {
		useCross = inputs.build.useCross;
	} else if (inputs.setup.target === runnerHostTarget()) {
		useCross = false;
	} else if (allowedCrossTarget(inputs.setup.target)) {
		useCross = true;
	} else {
		useCross = false;
	}

	let output;
	if (inputs.hooks.customBuild) {
		await runHook(inputs, 'custom-build');
	} else {
		const buildCommand = useCross ? 'cross' : 'cargo';
		const buildArgs = [
			'--release',
			'--target',
			inputs.setup.target,
			...crates.flatMap(crate => [`--package`, crate.name])
		];
		const rustflags = [];

		if (inputs.build.features.length > 0) {
			buildArgs.push('--features', inputs.build.features.join(','));
		}

		if (inputs.build.buildstd) {
			buildArgs.push('-Z', 'build-std=std');
		}

		if (inputs.build.debuginfo) {
			buildArgs.push(
				`--config='profile.release.split-debuginfo=\"packed\"'`,
				`--config='profile.release.debug=2'`
			);
		}

		if (
			inputs.build.muslLibGcc &&
			inputs.setup.target.includes('-linux-') &&
			inputs.setup.target.includes('musl')
		) {
			rustflags.push(
				'-C',
				'link-arg=-lgcc',
				'-C',
				'link-arg=-static-libgcc'
			);
		}

		if (inputs.build.crtStatic !== undefined) {
			rustflags.push(
				'-C',
				`target-feature=${inputs.build.crtStatic ? '+' : '-'}crt-static`
			);
		} else if (inputs.setup.target.includes('-alpine-linux-musl')) {
			rustflags.push('-C', 'target-feature=-crt-static');
		} else if (inputs.setup.target.endsWith('-windows-msvc')) {
			rustflags.push('-C', 'target-feature=+crt-static');
		}

		if (inputs.extras.rustcFlags) {
			rustflags.push(...extraFlags(inputs, 'rustcFlags'));
		}

		if (inputs.extras.cargoFlags) {
			buildArgs.push(...extraFlags(inputs, 'cargoFlags'));
		}

		info(`Rust flags: ${rustflags.join(' ')}`);
		info(`Build command: ${buildCommand} ${buildArgs.join(' ')}`);
		output = (
			await execAndSucceedWithOutput(buildCommand, buildArgs, {
				env: {
					...hookEnv(inputs),
					RUSTFLAGS: rustflags.join(' ')
				}
			})
		).stdout;
	}

	await runHook(inputs, 'post-build');
	return output;
}
