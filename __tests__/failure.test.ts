import {expect, test} from '@jest/globals';
import {runAction} from './runAction';

test('no data', () => {
	expect(() => runAction({})).toThrow();
});
