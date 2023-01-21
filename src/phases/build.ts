import {CargoPackage} from '../cargo/metadata';
import {InputsType} from '../schemata/index';

export default async function buildPhase(
	inputs: InputsType,
	crates: CargoPackage[],
): Promise<void> {
}
