import { Either } from "../src/Either";
import { Vector } from "../src/Vector";
import { assertFailCompile } from "./TestHelpers";
import * as assert from 'assert'

describe("either comparison", () => {
    it("should mark equal eithers as equal", () =>
       assert.ok(Either.right(5).equals(Either.right(5))))
    it("should mark different eithers as not equal", () =>
       assert.ok(!Either.right(5).equals(Either.right(6))))
    it("should mark left as equals to left", () =>
       assert.ok(Either.left("x").equals(Either.left<string,string>("x"))));
    it("should mark left and right as not equal", () =>
       assert.ok(!Either.right(5).equals(Either.left<number,number>(5))));
    it("should mark left and right as not equal", () =>
       assert.ok(!Either.left(5).equals(Either.right(5))));
    it("should return true on contains", () =>
       assert.ok(Either.right(5).contains(5)));
    it("should return false on contains on left", () =>
       assert.ok(!Either.left(5).contains(5)));
    it("should return false on contains", () =>
       assert.ok(!Either.right(6).contains(5)));
    it("doesn't throw when given another type on equals", () => assert.equal(
        false, Either.right(1).equals(<any>[1,2])));
    it("doesn't throw when given null on equals", () => assert.equal(
        false, Either.right(1).equals(<any>null)));
    it("empty doesn't throw when given another type on equals", () => assert.equal(
        false, Either.left(1).equals(<any>[1,2])));
    it("empty doesn't throw when given null on equals", () => assert.equal(
        false, Either.left(1).equals(<any>null)));
    it("should throw when comparing eithers without true equality", () => assert.throws(
        () => Either.right(Vector.of([1])).equals(Either.right(Vector.of([1])))));
    it("should fail compilation on an obviously bad equality test", () =>
       assertFailCompile(
           "Either.right([1]).equals(Either.right([1]))", "is not assignable to parameter"));
    it("should fail compilation on an obviously bad contains test", () =>
       assertFailCompile(
           "Either.right([1]).contains([1])",
           "is not assignable to parameter"));
});

describe("either transformation", () => {
    it("should transform with map", () => {
        assert.ok(Either.right(5).equals(Either.right<number,number>(4).map(x=>x+1)));
    });
    it("should handle null as Right", () =>
       assert.ok(Either.right(5).map<number|null>(x => null).equals(Either.right(null))));
    it("should transform a Right to string properly", () =>
       assert.equal("Right(5)", Either.right(5).toString()));
    it("should transform a Left to string properly", () =>
       assert.equal("Left(5)", Either.left(5).toString()));
    it("should transform with flatMap x->y", () => {
        assert.ok(Either.right(5).equals(
            Either.right<number,number>(4).flatMap(x=>Either.right(x+1))));
    });
    it("should transform with flatMap x->left", () => {
        assert.ok(Either.left<number,number>(5).equals(
            Either.right<number,number>(4).flatMap(x=>Either.left<number,number>(5))));
    });
    it("should transform with flatMap left->left", () => {
        assert.ok(Either.left(4).equals(
            Either.left<number,number>(4).flatMap(x=>Either.right<number,number>(x+1))));
    });
});

describe("either retrieval", () => {
    it("should return the value on Right.getOrElse", () =>
       assert.equal(5, Either.right(5).getOrElse(6)));
    it("should return the alternative on Left.getOrElse", () =>
       assert.equal(6, Either.left<number,number>(5).getOrElse(6)));
    it("should return the value on Right.toVector", () =>
       assert.deepEqual([5], Either.right(5).toVector().toArray()));
    it("should return empty on Left.toVector", () =>
       assert.deepEqual([], Either.left<number,number>(5).toVector().toArray()));
    it("should not throw on Right.getOrThrow", () =>
       assert.equal(5, Either.right(5).getOrThrow()));
    it("should throw on Left.getOrThrow", () =>
       assert.throws(() => Either.left<number,number>(5).getOrThrow()));
    it("should throw on Left.getOrThrow with custom msg", () =>
       assert.throws(() => Either.left<number,number>(5).getOrThrow("my custom msg"), /^my custom msg$/));
});
