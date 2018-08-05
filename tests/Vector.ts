import { Vector } from "../src/Vector";
import { Stream } from "../src/Stream";
import { MyClass } from "./SampleData";
import { typeOf } from "../src/Comparison";
import * as SeqTest from "./Seq";
import * as assert from 'assert'

SeqTest.runTests("Vector",
                 Vector.ofIterable,
                 Vector.of,
                 Vector.empty,
                 Vector.unfoldRight);

describe("Vector toString", () => {
    it("serializes to string correctly", () => assert.equal(
        "Vector(1, 2, 3)", Vector.of(1,2,3).toString()));
    it("serializes to string correctly - arrays & strings", () => assert.equal(
        "Vector([1,'a'])", Vector.of([1,'a']).toString()));
    it("serializes to string correctly - custom toString", () => assert.equal(
        "Vector({field1: hi, field2: 99})", Vector.of(new MyClass("hi", 99)).toString()));
    it("serializes to string correctly - plain map", () => assert.equal(
        "Vector({\"name\":\"hi\",\"age\":99})", Vector.of({name:"hi", age:99}).toString()));
});

// tests with over 32 elements
describe("Vector over one node", () => {
    it("maps also on longer lists", () => assert.deepEqual(
        [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,
         25,26,27,28,29,30,31,32,33,34,35,36,37,38,39],
        Stream.iterate(1,x=>x+1).take(40).toVector().map(x=>x-1).toArray()));
    it("iterator is correct also on longer lists", () => assert.deepEqual(
        [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,
         25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40],
        Array.from(Stream.iterate(1,x=>x+1).take(40).toVector())));
    it("actually broke once", () => assert.ok(
        Stream.iterate(0,i=>i+1).take(33).toVector().equals(
            Stream.iterate(0,i=>i+1).take(31).toVector().appendAll([31,32]))));
    it("prepends correctly on longer lists", () => assert.deepEqual(
        Stream.iterate(0,i=>i+1).take(10000).toVector().prepend(-1).toArray(),
        Stream.iterate(0,i=>i+1).take(10000).prepend(-1).toArray()));
    it("drops correctly on longer lists", () => assert.deepEqual(
        Stream.iterate(0,i=>i+1).take(10000).toVector().drop(9700).toArray(),
        Stream.iterate(9700,i=>i+1).take(300).toArray()
    ))
})

describe("Vector extra methods", () => {
    it("map calls the conversion function once per element", () => {
        let i = 0;
        Vector.of(1,2,3).map(x=>{i+=1; return x+4;});
        assert.equal(3, i);
    });
    it("handles init correctly on a non-empty vector", () => assert.deepEqual(
        [1,2,3], Vector.of(1,2,3,4).init().toArray()));
    it("handles init correctly on an empty vector", () => assert.deepEqual(
        [], Vector.empty<number>().init().toArray()));
    it("handles init correctly on a single-element vector", () => assert.deepEqual(
        [], Vector.of(1).init().toArray()));
    it("doesn't modify the receiver on init", () => {
        const x = Vector.of(1,2,3);
        x.init();
        assert.deepEqual(
            [1,2,3], x.toArray())
    });
    it("handles replace correctly on a simple example", () => assert.deepEqual(
        [1,4,3], Vector.of(1,2,3).replace(1,4).toArray()));
    it("should throw on replace on negative index", () => assert.throws(
        () => Vector.of(1,2,3).replace(-1,0)));
    it("should throw on replace on out of bounds index", () => assert.throws(
        () => Vector.of(1,2,3).replace(5,0)));
    it("doesn't modify the receiver on replace", () => {
        const x = Vector.of(1,2,3);
        x.replace(1,4);
        assert.deepEqual(
            [1,2,3], x.toArray())
    });
    it("correctly infers the more precise left type on partition in case of typeguard", () => {
        // just checking that this compiles. 'charAt' is available on strings not numbers.
        // the get(0) is to make sure that partition returns me a Vector
        // not a Collection or something less precise than Vector.
        Vector.of<string|number>(1,"test",2,"a")
            .partition(typeOf("string"))[0]
            .get(0).getOrThrow().charAt(0);
    });
});

// that's needed due to node's assert.deepEqual
// saying that new Array(2) is NOT the same as
// [undefined, undefined].
// (empty vs undefined)
// => forcing undefined
function arraySetUndefineds(ar:any[]) {
    if (!ar) {return ar;}
    for (let i=0;i<ar.length;i++) {
        if (Array.isArray(ar[i])) {
            arraySetUndefineds(ar[i]);
        }
        if (typeof ar[i] === "undefined") {
            ar[i] = undefined;
        }
    }
    return ar;
}

function checkTake<T>(longer: Vector<T>, n: number, shorter: Vector<T>, regenerated: boolean) {
    const arrayBefore = longer.toArray();
    assert.deepEqual(
        shorter.toArray(),
        longer.take(n).toArray());
    if (regenerated) {
        // if the vector was just kept as-is by the take,
        // we wouldn't want to check these
        assert.equal(0, (<any>shorter).getHeadLength());
        assert.equal(0, (<any>shorter)._head.length);
        assert.equal(n%32, (<any>shorter)._tail.length);
    }
    // check the tail has the proper length, longer would make
    // us keep some pointers in memory which could be GC'd otherwise.
    assert.equal((<any>shorter)._tail.length, (<any>shorter).getTailLength());
    // taking should not have modified the original vector
    assert.deepEqual(arrayBefore, longer.toArray());
}

// check that the internal structure of the vector trie
// is correct after take, that means also root killing and so on.
describe("Vector.take() implementation", () => {
    it("handles simple cases correctly", () =>
       checkTake(Vector.of(1,2,3,4,5,6), 3, Vector.of(1,2,3), true));
    it("handles root killing correctly", () => checkTake(
        Vector.ofIterable(Stream.iterate(1,i=>i+1).take(40)),
        3, Vector.of(1,2,3), true));
    it("handles double root killing correctly", () => checkTake(
        Vector.ofIterable(Stream.iterate(1,i=>i+1).take(1100)),
        3, Vector.of(1,2,3), true));
    it("handles taking all on length multiple of node size correctly", () => checkTake(
        Stream.iterate(1,i=>i+1).take(128).toVector(),
        128, Stream.iterate(1,i=>i+1).take(128).toVector(), false));
    it("handles taking more than the whole length on length multiple of node size correctly", () => checkTake(
        Stream.iterate(1,i=>i+1).take(128).toVector(),
        129, Stream.iterate(1,i=>i+1).take(128).toVector(), false));
});

function checkAppend<T>(base: Vector<T>, toAppend: Iterable<T>, combined: Vector<T>) {
    const arrayBefore = base.toArray();
    assert.deepEqual(
        arraySetUndefineds((<any>combined)._content),
        (<any>base.appendAll(toAppend))._content);
    // appending should not have modified the original vector
    assert.deepEqual(arrayBefore, base.toArray());
}

describe("Vector.appendAll() implementation", () => {
    it("handles simple cases correctly", () => {
        checkAppend(Vector.of(1,2,3), [4,5,6,7,8], Vector.of(1,2,3,4,5,6,7,8));
    });
    it("handles adding nodes correctly", () => {
        checkAppend(Vector.of(1,2,3), Stream.iterate(4,i=>i+1).take(70),
                    Vector.ofIterable(Stream.iterate(0,i=>i+1).take(74)));
    });
    it("handles adding nodes correctly, adding an array", () => {
        checkAppend(Vector.of(1,2,3), Stream.iterate(4,i=>i+1).take(70).toArray(),
                    Vector.ofIterable(Stream.iterate(0,i=>i+1).take(74)));
    });
    it("handles adding nodes correctly, adding a vector", () => {
        checkAppend(Vector.of(1,2,3), Stream.iterate(4,i=>i+1).take(70).toVector(),
                    Vector.ofIterable(Stream.iterate(0,i=>i+1).take(74)));
    });
});
