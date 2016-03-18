var assert = require('assert')
  , mockfs = require('mock-fs')
  , sinon = require('sinon')
  , child_process = require('child_process')
  , Builder = require('../../lib/builder')
;

var exec = child_process.exec;
var anError = new Error("An error!");
var builder;
var formula;
var now = new Date();
var oneMinuteAgo = new Date(now.getTime() - (60 * 1000));

describe("Builder", function() {

  describe(".build", function() {

    beforeEach(function() {
      mockfs({
        'existingTarget': mockfs.file({content: '', mtime: now})
      });

      child_process.exec = sinon.stub();
      child_process.exec.callsArg(2);

      formula = {
        target: {
          commands: ["touch target"]
        },

        multiStepTarget: {
          commands: [
            "sleep 1",
            "touch multiStepTarget"
          ]
        },

        existingTarget: {
          commands: ["touch existingTarget"]
        }
      };

      builder = new Builder(formula);
    });

    afterEach(function() {
      mockfs.restore();
      child_process.exec = exec;
    });

    context("called for an undefined target", function() {
      it("uses an existing file of the same name as the target", function() {
        mockfs.restore();
        mockfs({undefinedTarget: mockfs.file({content: '', mtime: now})});

        return builder.build('undefinedTarget').
          then(function(mtime) {
            assert.equal(mtime, now);
            assert(!child_process.exec.called);
          });
      });

      it("otherwise, it produces an error", function() {
        return builder.build('undefinedTarget').
          then(function() {
            assert.fail(null, Error, "invalid input did not generate an error");
          }).
          catch(function(err) {
            assert(/undefinedTarget/.test(err.message), "Unexpected error: "+err.message);
          });
      });
    });

    context("with a non-existent target", function() {

      it("invokes the build command", function() {
        return builder.build('target').
          then(function() {
            assert(child_process.exec.calledOnce)
            assert(child_process.exec.calledWith("touch target"));
          });
      });

      it("returns the last modified time of the target", function() {
        var now = new Date();

        return builder.build('target').
          then(function(mtime) {
            assert(mtime.getTime() >= now.getTime());
          });
      });

      it("allows commands to be specified as a string or array", function() {
        formula.target.commands = 'touch target';

        return builder.build('target').
          then(function() {
            assert(child_process.exec.calledOnce)
            assert(child_process.exec.calledWith("touch target"));
          });
      });

      it("invokes multiple build commands if provided", function() {
        return builder.build('multiStepTarget').
          then(function() {
            assert(child_process.exec.calledTwice)
            assert(child_process.exec.firstCall.calledWith("sleep 1"));
            assert(child_process.exec.secondCall.calledWith("touch multiStepTarget"));
          });
      });

      context("when a build command fails", function() {
        beforeEach(function() {
          child_process.exec = sinon.stub().callsArgWith(2, anError);
        });

        it("fails", function() {
          return builder.build('target').
            then(function() {
              assert.fail(null, Error, "failed command did not generate an error");
            }).
            catch(function(error) {
              assert.equal(error, anError);
            });
        });

        it("stops execution of subsequent commands", function() {
          return builder.build('multiStepTarget').
            catch(function(error) {
              assert(child_process.exec.calledOnce)
            });
        });
      });

    });

    context("with an existing target without dependencies", function() {
      it("does not execute any build commands", function() {
        return builder.
          build('existingTarget').
          then(function() {
            assert(!child_process.exec.called);
          });
      });

      it("returns the last modified time of the target", function() {
        return builder.build('existingTarget').
          then(function(mtime) {
            assert.strictEqual(mtime.getTime(), now.getTime());
          });
      });
    });

    context("with dependencies", function() {
      beforeEach(function() {
        formula = {
          targetA: {
            commands: ["touch targetA"]
          },

          targetB: {
            commands: ["touch targetB"]
          },

          targetC: {
            dependsOn: ["targetB"],
            commands: ["touch targetC"]
          },

          targetD: {
            dependsOn: ["targetA", "targetC"],
            commands: ["touch targetD"]
          }
        };

        builder = new Builder(formula);
      });

      it("builds all dependencies and the target", function() {
        return builder.build('targetD').
          then(function() {
            assert.equal(child_process.exec.callCount, 4)
            assert(child_process.exec.firstCall.calledWith("touch targetA"));
            assert(child_process.exec.secondCall.calledWith("touch targetB"));
            assert(child_process.exec.thirdCall.calledWith("touch targetC"));
            assert(child_process.exec.lastCall.calledWith("touch targetD"));
          });
      });

      it("handles circular dependencies", function() {
        formula.targetB.dependsOn = ['targetC'];

        return builder.build('targetD').
          then(function() {
            assert.equal(child_process.exec.callCount, 4)
            assert(child_process.exec.firstCall.calledWith("touch targetA"));
            assert(child_process.exec.secondCall.calledWith("touch targetB"));
            assert(child_process.exec.thirdCall.calledWith("touch targetC"));
            assert(child_process.exec.lastCall.calledWith("touch targetD"));
          });
      });

      it("allows dependencies to be given as a string or array", function() {
        formula.targetC.dependsOn = 'targetB';

        return builder.build('targetC').
          then(function() {
            assert(child_process.exec.calledTwice)
            assert(child_process.exec.firstCall.calledWith("touch targetB"));
            assert(child_process.exec.secondCall.calledWith("touch targetC"));
          });
      });

      context("all dependencies and the target are up to date", function() {
        beforeEach(function() {
          mockfs.restore(); // start from scratch
          mockfs({
            'targetB': mockfs.file({content: '', mtime: now}),
            'targetC': mockfs.file({content: '', mtime: now})
          });
        });

        it("does not build anything", function() {
          return builder.build('targetC').
            then(function() {
              assert(!child_process.exec.called)
            });
        });

        it("returns the newest modification time", function() {
          return builder.build('targetC')
            .then(function(mtime) {
              assert.strictEqual(mtime, now);
            });
        });
      });

      context("shared dependencies newer than the target", function() {
        beforeEach(function() {
          formula = {
            all: {
              dependsOn: ['objectA', 'objectB']
            },

            objectA: {
              dependsOn: 'srcA',
              commands: 'touch objectA'
            },

            objectB: {
              dependsOn: 'srcB',
              commands: 'touch objectB'
            },

            srcA: {
              dependsOn: ['headerA', 'headerB']
            },

            srcB: {
              dependsOn: ['headerA', 'headerB']
            }
          };

          builder = new Builder(formula);

          mockfs.restore(); // start from scratch
          mockfs({
            'headerA': mockfs.file({content: '', mtime: now}),
            'headerB': mockfs.file({content: '', mtime: oneMinuteAgo}),
            'srcA':    mockfs.file({content: '', mtime: oneMinuteAgo}),
            'srcB':    mockfs.file({content: '', mtime: oneMinuteAgo}),
            'objectA': mockfs.file({content: '', mtime: oneMinuteAgo}),
            'objectB': mockfs.file({content: '', mtime: oneMinuteAgo})
          });
        });

        it("builds all affected dependents", function() {
          return builder.build('all').
            then(function() {
              assert.equal(child_process.exec.callCount, 2)
              assert(child_process.exec.firstCall.calledWith("touch objectA"));
              assert(child_process.exec.secondCall.calledWith("touch objectB"));
            });
        });
      });

      context("one or more dependencies are newer than the target", function() {
        beforeEach(function() {
          var now = new Date();
          var oneMinuteAgo = new Date(now.getTime() - (60 * 1000));

          mockfs.restore(); // start from scratch
          mockfs({
            'targetB': mockfs.file({content: '', mtime: now}),
            'targetA': mockfs.file({content: '', mtime: oneMinuteAgo}),
            'targetC': mockfs.file({content: '', mtime: oneMinuteAgo}),
            'targetD': mockfs.file({content: '', mtime: oneMinuteAgo})
          });
        });

        it("rebuilds all dependents", function() {
          return builder.build('targetD').
            then(function() {
              assert(child_process.exec.calledTwice)
              assert(child_process.exec.firstCall.calledWith("touch targetC"));
              assert(child_process.exec.secondCall.calledWith("touch targetD"));
            });
        });
      });

      context("script variable assignment", function() {
        beforeEach(function() {
          formula = {
            targetA: {
            },

            targetB: {
              dependsOn: 'targetA'
            },
          };

          builder = new Builder(formula);
        });

        it("sets the 'target' variable to the current target name", function() {
          formula.targetA.commands = function() {
            assert.equal(this.target, 'targetA');
          }

          return builder.build('targetA');
        });

        it("sets the 'prerequisites' variable to the list of dependencies", function() {
          formula.targetB.commands = function() {
            assert.deepEqual(this.prerequisites, ['targetA']);
          }

          return builder.build('targetB');
        });

        it("sets the 'prerequisites' variable to an empty array when there are none", function(){
          formula.targetA.commands = function() {
            assert.deepEqual(this.prerequisites, []);
          }

          return builder.build('targetA');
        });
      });

    });

  });

});
