var assert = require('assert')
  , sinon = require('sinon')
  , child_process = require('child_process')
  , Evaluator = require('../../lib/evaluator')
  , Q = require('q')
  , util = require('util')
;

var exec = child_process.exec;
var anError = new Error("An error!");
var evalContext;
var evaluator;
var log = console.log;
var logs;

describe("Evaluator", function() {

  describe("evaluate", function() {

    beforeEach(function() {
      child_process.exec = sinon.stub();
      child_process.exec.callsArg(2);

      evalContext = {};
      evaluator = new Evaluator(evalContext);
    });

    afterEach(function() {
      child_process.exec = exec;
    });

    context("string input", function() {

      it("executes the string in a shell", function() {
        return evaluator
                .evaluate("touch target")
                .then(function() {
                  assert(child_process.exec.calledOnce);
                  assert(child_process.exec.calledWith("touch target"));
                });
      });

      it("throws any errors produced by the shell", function() {
        child_process.exec = sinon.stub().callsArgWith(2, anError);

        return evaluator
                .evaluate("touch target")
                .then(function() {
                  assert.fail(null, Error, "failed command did not generate an error");
                })
                .catch(function(error) {
                  assert.equal(error, anError);
                });
      });

    });

    context("function input", function() {

      it("calls the function", function() {
        var f = sinon.stub();
        
        return evaluator
                .evaluate(f)
                .then(function() {
                  assert(f.calledOnce);
                });
      });

      it("uses the context provided by the constructor", function() {
        var f = function() { assert.strictEqual(this, evalContext); }
        
        return evaluator.evaluate(f);
      });

      it("throws any errors thrown by the function", function() {
        var f = function() { throw anError; }

        return evaluator
                .evaluate(f)
                .then(function() {
                  assert.fail(null, Error, "failed command did not generate an error");
                })
                .catch(function(error) {
                  assert.equal(error, anError);
                });
      });

      it("evaluates any string returned by the function", function() {
        var f = function() { return "touch target"; }

        return evaluator
                .evaluate(f)
                .then(function() {
                  assert(child_process.exec.calledWith("touch target"));
                });
      });

      it("evaluates any string promised by the function", function() {
        var f = function() { return Q("touch target"); }

        return evaluator
                .evaluate(f)
                .then(function() {
                  assert(child_process.exec.calledWith("touch target"));
                });
      });

    });

  });

  describe("constructor options", function() {
    describe("echo", function() {

      beforeEach(function() {
        child_process.exec = sinon.stub();
        child_process.exec.callsArg(2);

        logs = [];
        console.log = function() { logs.push(util.format.apply(util, arguments)); }
      });

      afterEach(function() {
        child_process.exec = exec;
        console.log = log;
      });

      it("echoes executed commands when true", function() {
        evaluator = new Evaluator({}, {echo: true});
        evaluator.evaluate("echo ok");
        assert.deepEqual(logs, ["echo ok"]);
      });

      it("does not execute commands when false", function() {
        evaluator = new Evaluator({}, {echo: false});
        evaluator.evaluate("echo ok");
        assert.deepEqual(logs, []);
      });
    });
  });

});
