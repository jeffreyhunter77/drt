var Q = require('q')
  , _ = require('lodash')
  , fs = require('fs')
  , vm = require('vm')
  , Builder = require('./builder')
;

function Runner(file, target, vars) {
  this.file = file || 'build.drt';
  this.target = target;
  this.vars = vars || {};
}
_.extend(Runner.prototype, {

  run: function() {
    var self = this;

    return this._ruleDefinition().
      then(function(rules) {
        var builder = new Builder(rules);
        return builder.build(self._buildTarget(rules));
      });
  },

  /** Returns a promise for the rules definition in file */
  _ruleDefinition: function() {
    var self = this;

    if (this.rules)
      return Q(this.rules);

    return Q.ninvoke(fs, 'readFile', this.file, 'utf8').
      then(function(data) {
        vm.runInNewContext(data, self._context(), {filename: self.file});
        self.rules = self.scriptContext.rules;
        return self.rules;
      });
  },

  /** Returns the context to use for evaluating drt files */
  _context: function() {
    return this.scriptContext = _.extend({}, this.vars, { rules: {} });
  },

  /** Returns the build target to use for a given set of rules */
  _buildTarget: function(rules) {
    if (this.target)
      return this.target;

    targets = Object.keys(rules);

    if(targets.length < 1)
      throw new Error("No targets defined in "+this.file);

    return targets[0];
  }

});

module.exports = Runner;
