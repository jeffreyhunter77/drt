var assert = require('assert')
  , mockfs = require('mock-fs')
  , sinon = require('sinon')
  , Runner = require('../../lib/runner')
  , Builder = require('../../lib/builder')
  , Q = require('q')
;

var build = Builder.prototype.build;

describe('Runner', function() {

  describe('.run', function() {
    context('with a file name', function() {
      beforeEach(function() {
        var validDrt = "echo = 'echo';\n" +
                       "\n" +
                       "rules = {\n" +
                       "  all: {\n" +
                       "    dependsOn: 'greet'\n" +
                       "  },\n" +
                       "  \n" +
                       "  greet: {\n" +
                       "    commands: (echo + ' hello!')\n" +
                       "  }\n" +
                       "}\n" +
                       "";

        var varsDrt = "rules = {all: {commands: ('echo ' + [val1, val2].join(', '))}};"

        var invalidDrt = validDrt.replace("'echo'", "'echo");

        mockfs({
          'test.drt': validDrt,
          'empty.drt': '',
          'vars.drt': varsDrt,
          'invalid.drt': invalidDrt
        });

        Builder.prototype.build = sinon.stub().returns(Q());
      });

      afterEach(function() {
        mockfs.restore();
        Builder.prototype.build = build;
      });

      it('loads the file', function() {
        var runner = new Runner('test.drt', 'all');

        return runner.run().then(function() {
          assert.equal(runner.rules.greet.commands, 'echo hello!');
        });
      });

      it('builds the named target', function() {
        var runner = new Runner('test.drt', 'greet');

        return runner.run().then(function() {
          assert(Builder.prototype.build.calledOnce);
          assert(Builder.prototype.build.calledWith('greet'));
        });
      });
      
      it('builds all targets if multiple are given', function() {
        var runner = new Runner('test.drt', ['greet', 'all']);

        return runner.run().then(function() {
          assert(Builder.prototype.build.calledTwice);
          assert(Builder.prototype.build.firstCall.calledWith('greet'));
          assert(Builder.prototype.build.secondCall.calledWith('all'));
        });
      });

      it('builds the first target in the file if none is given', function() {
        var runner = new Runner('test.drt');

        return runner.run().then(function() {
          assert(Builder.prototype.build.calledOnce);
          assert(Builder.prototype.build.calledWith('all'));
        });
      });

      it('builds the first target in the file if an empty array is given', function() {
        var runner = new Runner('test.drt', []);

        return runner.run().then(function() {
          assert(Builder.prototype.build.calledOnce);
          assert(Builder.prototype.build.calledWith('all'));
        });
      });

      it('throws an error if called without a target and the file does not define any targets', function() {
        var runner = new Runner('empty.drt');

        return runner.run().then(function() {
          assert.fail(null, Error, "missing rule did not generate an error");
        }).
        catch(function(err) {
          assert(/No targets defined/.test(err.message), "Unexpected error: "+err.message);
        });
      });

      it('passes provided variables to the file', function() {
        var runner = new Runner('vars.drt', 'all', {val1: 'hello', val2: 'there!'});

        return runner.run().then(function() {
          assert.equal(runner.rules.all.commands, 'echo hello, there!');
        });
      });

      it('throws an error if the file cannot be parsed', function() {
        var runner = new Runner('invalid.drt');

        return runner.run().then(function() {
          assert.fail(null, Error, "invalid javascript did not generate an error");
        }).
        catch(function(err) {
          assert(/invalid\.drt:1/.test(err.message), "Unexpected error: "+err.message);
        });
      });

      it('throws an error if the file does not exist', function() {
        var runner = new Runner('nonexistent.drt');

        return runner.run().then(function() {
          assert.fail(null, Error, "missing file did not generate an error");
        }).
        catch(function(err) {
          assert(err.code == 'ENOENT', "Unexpected error: "+err.message);
        });
      });

      it('throws any errors produced during the build process', function() {
        var runner = new Runner('nonexistent.drt');

        return runner.run().then(function() {
          assert.fail(null, Error, "missing file did not generate an error");
        }).
        catch(function(err) {
          assert(err.code == 'ENOENT', "Unexpected error: "+err.message);
        });
      });
    });

    context('without a file name', function() {
      beforeEach(function() {
        var buildDrt = "rules = {all: {commands: 'echo hello'}};"

        mockfs({'build.drt': buildDrt});

        Builder.prototype.build = sinon.stub().returns(Q());
      });

      afterEach(function() {
        mockfs.restore();
        Builder.prototype.build = build;
      });

      it('loads build.drt', function() {
        var runner = new Runner();

        return runner.run().then(function() {
          assert.equal(runner.rules.all.commands, 'echo hello');
        });
      });

      it('throws an error if build.drt does not exist', function() {
        mockfs.restore();
        mockfs({});

        var runner = new Runner();

        return runner.run().then(function() {
          assert.fail(null, Error, "missing build.drt did not generate an error");
        }).
        catch(function(err) {
          assert(err.code == 'ENOENT', "Unexpected error: "+err.message);
        });
      });
    });

    describe("global definitions", function() {
      beforeEach(function() {
        var defaultRules = "rules = {all: {commands: 'echo hello'}};";

        var buildDrt = "drt.include_path = ['.', 'a', 'b'];\n" +
                       "\n" +
                       "include('name.drt');\n" +
                       "\n" +
                       "if (name !== 'A')\n" +
                       "  throw new Error('name is not equal to A');\n" +
                       "\n" +
                       defaultRules;

        var aName = "name = 'A';";
        var bName = "name = 'B';";

        var badInclude = "include('noSuchFile.drt');" + defaultRules;

        var circleInclude = "include('loop.drt');" + defaultRules;
        var loop          = "include('circle.drt');";

        mockfs({
          'badInclude.drt': badInclude,
          'build.drt': buildDrt,
          'a/name.drt': aName,
          'b/name.drt': bName,
          'circle.drt': circleInclude,
          'loop.drt': loop
        });

        Builder.prototype.build = sinon.stub().returns(Q());
      });

      afterEach(function() {
        mockfs.restore();
        Builder.prototype.build = build;
      });

      describe("include()", function() {
        it("evaluates the first file found in drt.include_path in the current context", function() {
          var runner = new Runner();
          return runner.run()
        });

        it("throws an error if no file is found", function() {
          var runner = new Runner('badInclude.drt');

          return runner.run().then(function() {
            assert.fail(null, Error, "missing include did not generate an error");
          }).
          catch(function(err) {
            assert(/File not found/.test(err.message), "Unexpected error: "+err.message);
          });
        });

        it("allows circular references", function() {
          var runner = new Runner('circle.drt');
          return runner.run()
        });
      });
    });
  });

});
