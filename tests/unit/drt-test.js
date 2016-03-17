var vm = require('vm')
  , fs = require('fs')
  , path = require('path')
  , sinon = require('sinon')
  , Q = require('q')
  , _ = require('lodash')
  , assert = require('assert')
  , util = require('util')
;

var fname = path.join(__dirname, '..', '..', 'bin', 'drt');
var src = fs.readFileSync(fname, 'utf8').split("\n");

src.shift(); // skip shebang (#!)
src = src.join("\n");

var script = new vm.Script(src, {filename: fname, lineOffset: 1});

var Runner;

function fakeRequire(path) {
  if (path == '../')
    return {Runner: Runner};
  else
    return require.apply(global, arguments);
}

function runScript(args) {
  args = ['node', 'drt'].concat(args || []);

  return script.runInNewContext(_.extend({},
    global,
    {
      process: _.extend({}, process, {argv: args}),
      require: fakeRequire
    }
  ));
}

function assertRunnerCalledWith() {
  assert(Runner.calledOnce);
  assert.deepEqual(Runner.firstCall.args, [].slice.call(arguments));
  assert(Runner.prototype.run.calledOnce);
}

describe('drt', function() {

  beforeEach(function() {
    Runner = sinon.stub();
    Runner.prototype.run = sinon.stub().returns(Q());
  });

  afterEach(function() {
  });

  context('called with no arguments', function() {
    it('runs the default script and target', function() {
      runScript([]);
      assertRunnerCalledWith(null, [], {}, {});
    });
  });

  context('called with one or more arguments', function() {
    it('accepts the arguments as target names', function() {
      runScript(['one', 'two', 'three']);
      assertRunnerCalledWith(null, ['one', 'two', 'three'], {}, {});
    });
  });

  context('command line options', function() {
    it('-f filename specifies the script to load in place of the default', function() {
      runScript(['-f', 'test.drt']);
      assertRunnerCalledWith('test.drt', [], {}, {});
    });

    it('--file=filename specifies the script to load in place of the default', function() {
      runScript(['--file=test.drt']);
      assertRunnerCalledWith('test.drt', [], {}, {});
    });

    it('--echo turns on command echoing', function() {
      runScript(['--echo']);
      assertRunnerCalledWith(undefined, [], {}, {echo: true});
    })
  });

});
