import { add } from '@lib/math';
import { add as add2 } from '@app/lib/math';

const [bin, script, a, b] = process.argv;

console.log(add(parseInt(a, 10), parseInt(b, 10)));
console.log(add2(parseInt(a, 10), parseInt(b, 10)));
