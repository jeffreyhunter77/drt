var assert = require('assert')
  , index = require('../../index')
;

describe("index", function() {
  it("exports Builder", function() {
    assert(index.Builder);
  });

  it("exports Runner", function() {
    assert(index.Runner);
  });
})
