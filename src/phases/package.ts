import {CargoPackage} from '../cargo/metadata';
import { runHook } from '../common/exec';
import {InputsType} from '../schemata/index';

export default async function packagePhase(
	inputs: InputsType,
	crates: CargoPackage[],
	buildOutput?: string
): Promise<void> {
	await runHook(inputs, 'post-package');
}
