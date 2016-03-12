var Q = require('q')
  , _ = require('lodash')
  , fs = require('fs')
  , vm = require('vm')
  , path = require('path')
  , Builder = require('./builder')
;


function Runner(file, target, vars) {
  this.file = file || 'build.drt';
  this.target = target;
  this.vars = vars || {};
  this._included = {};
}
_.extend(Runner.prototype, {

  run: function() {
    var self = this;

    return this._ruleDefinition().
      then(function(rules) {
        var builder = new Builder(rules, this.scriptGlobal);
        return self._buildTargets(rules).reduce(function(promise, target) {
            return promise.then(function() { return builder.build(target); });
          }, Q());
      });
  },

  /** Returns a promise for the rules definition in file */
  _ruleDefinition: function() {
    var self = this;

    if (this.rules)
      return Q(this.rules);

    return Q.ninvoke(fs, 'readFile', this.file, 'utf8').
      then(function(data) {
        self._included[path.resolve(self.file)] = 1;
        vm.runInContext(data, self._context(), {filename: self.file});
        self.rules = self.scriptContext.rules;
        return self.rules;
      });
  },

  /** Returns the context to use for evaluating drt files */
  _context: function() {
    this.scriptGlobal = _.extend({}, this.vars, this._initialGlobals());
    return this.scriptContext = vm.createContext(this.scriptGlobal);
  },

  /** Returns the default initial variable set for a script */
  _initialGlobals: function() {
    return {
      drt: {
        include_path: ['.']
      },

      rules: {},

      include: this._includeBuiltin.bind(this)
    };
  },

  /** Returns the build target to use for a given set of rules */
  _buildTargets: function(rules) {
    if (this.target)
      return _.isArray(this.target) ? this.target : [this.target];

    targets = Object.keys(rules);

    if(targets.length < 1)
      throw new Error("No targets defined in "+this.file);

    return [targets[0]];
  },

  /** include() builtin function */
  _includeBuiltin: function(name) {
    var includePath = _.get(this.scriptGlobal, ['drt', 'include_path'], []);

    if (!_.isArray(includePath))
      includePath = [includePath];

    var dir = _.find(includePath, function(p) {

      try {
        stats = fs.statSync(path.join(p, name));
        return stats && stats.isFile();
      } catch (e) { /* continue */ }

      return false;
    });

    if (!dir)
      throw new Error("Could not include '"+name+"': File not found");

    var filePath = path.join(dir, name);
    var resolvedPath = path.resolve(filePath);

    if (this._included[resolvedPath])
      return;

    var script = fs.readFileSync(filePath, 'utf8');

    this._included[resolvedPath] = 1;

    return vm.runInContext(script, this.scriptContext, {filename: name});
  }

});

module.exports = Runner;
