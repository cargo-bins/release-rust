import {runHook} from '../common/exec';
import {InputsType} from '../schemata/index';
import {CargoPackage} from '../cargo/metadata';

export default async function tagPhase(
	inputs: InputsType,
	crates: CargoPackage[]
): Promise<void> {
	if (inputs.tag.enabled) {
		if (!inputs.publish.allCrates && !inputs.release.separately) {
			// TODO
		} else {
			// TODO
		}

		// TODO: push tags
	}

	await runHook(inputs, 'post-tag');
}
