const assert=require('assert'); const {cleanData,validRoom}=require('./server');
assert(validRoom('anf-test_01')); assert(!validRoom('bad room'));
const d=cleanData({seq:1,ok:true,acc:99.5,name:'A',perfect:100}); assert.equal(d.acc,99.5); assert.equal(d.perfect,100); assert.equal(d.early,0);
console.log('Basic validation tests passed.');
