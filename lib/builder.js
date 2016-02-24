var Q = require('q')
  , _ = require('lodash')
  , util = require('util')
  , child_process = require('child_process')
  , fs = require('fs')
  , Evaluator = require('./evaluator')
;

function Builder(formula) {
  this.formula = formula || {};
  this._visited = {};
  this.evaluator = new Evaluator(this);
};
_.extend(Builder.prototype, {

  /** Build a target and return a promise for it */
  build: function (targetName) {
    var self = this;
    var info = this.formula[targetName];

    if (this._visited.hasOwnProperty(targetName))
      return Q();
    else
      this._visited[targetName] = 1;

    return this._buildDependencies((info || {}).dependsOn).
      then(function(mtime) {
        return Q.ninvoke(fs, 'stat', targetName).
          then(function(stats) {
            if (info && mtime && mtime.getTime() > stats.mtime.getTime())
              return self._performCommands(info.commands);
            else
              return stats.mtime;
          }).
          catch(function(err) {
            if (err.code === 'ENOENT' && info)
              return self._performCommands(info.commands);
            else if (err.code === 'ENOENT')
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

  /** Return a promise for executing a set of commands */
  _performCommands: function (steps) {
    var self = this;

    return this._asArray(steps).reduce(function(promise, step) {
      return promise.then(function () {
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
  }

});

module.exports = Builder;
