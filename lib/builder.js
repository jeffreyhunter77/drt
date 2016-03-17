var Q = require('q')
  , _ = require('lodash')
  , util = require('util')
  , child_process = require('child_process')
  , fs = require('fs')
  , Evaluator = require('./evaluator')
;

function Builder(formula, evalContext, options) {
  this.formula = formula || {};
  this._visited = {};
  this.evalContext = evalContext || {};
  this.options = options || {};
  this.evaluator = new Evaluator(this.evalContext, this.options);

  this._debug("rules = ", this.formula);
};
_.extend(Builder.prototype, {

  /** Build a target and return a promise for it */
  build: function (targetName) {
    var self = this;
    var info = this.formula[targetName];

    this._debug("building %s", targetName);

    if (this._visited.hasOwnProperty(targetName))
      return Q();
    else
      this._visited[targetName] = 1;

    return this._buildDependencies((info || {}).dependsOn).
      then(function(mtime) {
        self._setBuildContext(targetName, (info || {}));

        return Q.ninvoke(fs, 'stat', targetName).
          then(function(stats) {
            if (info && mtime && mtime.getTime() > stats.mtime.getTime()) {
              self._debug("running commands for %s, out of date", targetName);
              return self._performCommands(info.commands);
            } else {
              self._debug("%s is up to date", targetName);
              return stats.mtime;
            }
          }).
          catch(function(err) {
            if (err.code === 'ENOENT' && info) {
              self._debug("running commands for %s, does not exist", targetName);
              return self._performCommands(info.commands);
            } else if (err.code === 'ENOENT')
              throw new Error("Cannot build undefined target '"+targetName+"'");
            else
              throw err;
          });
      });
  },

  /** Builds a list of dependencies */
  _buildDependencies: function (depends) {
    var self = this;

    return this._asArray(depends).reduce(function(promise, dependent) {
      return promise.then(function(mtime1) {
        self._debug("checking dependency %s", dependent);
        return self.build(dependent).then(self._maxDate.bind(self, mtime1));
      });
    }, Q());
  },

  /** Picks the greater of two dates */
  _maxDate: function (dte1, dte2) {
    if (!dte1)
      return dte2;
    else if (!dte2)
      return dte1;
    else
      return dte1.getTime() >= dte2.getTime() ? dte1 : dte2;
  },

  /** Set variables related to the build step in the context */
  _setBuildContext: function(targetName, info) {
    this.evalContext.target = targetName;
    this.evalContext.prerequisites = this._asArray(info.dependsOn);
  },

  /** Return a promise for executing a set of commands */
  _performCommands: function (steps) {
    var self = this;

    return this._asArray(steps).reduce(function(promise, step) {
      return promise.then(function () {
        self._debug("evaluating %s", step);
        return self.evaluator.evaluate(step);
      });
    }, Q()).
    then(function() {
      return new Date();
    });
  },

  /** Ensures the given argument is an array */
  _asArray: function(value) {
    if (value === null || value === undefined)
      return [];
    else if (util.isArray(value))
      return value;
    else
      return [value];
  },

  _debug: function() {
    if (this.options.debug)
      console.log.apply(console, arguments);
  }

});

module.exports = Builder;
