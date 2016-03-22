var _ = require('lodash')
  , Q = require('q')
  , child_process = require('child_process')
;

function Evaluator(context, options) {
  this.context = context;
  this.options = _.extend({echo: false}, options);
}
_.extend(Evaluator.prototype, {

  evaluate: function(item) {
    try {

      if (_.isFunction(item)) {
        return Q(item.apply(this.context)).then(this._applyResult.bind(this));
      } else {
        this._beforeRun(item);

        var defer = Q.defer();
        child_process.exec(item, {}, this._execComplete.bind(this, defer));

        return defer.promise;
      }

    } catch (e) {
      return Q.reject(e);
    }
  },

  _applyResult: function(result) {
    if (_.isString(result))
      return this.evaluate(result);
    else
      return result;
  },

  _execComplete: function(defer, err, stdout, stderr) {
    this._pipeOutput(stderr, stdout);

    if (err)
      defer.reject(err);
    else
      defer.resolve(true);
  },

  _pipeOutput: function(stderr, stdout) {
    // stderr
    if (stderr && stderr.length > 0)
      process.stderr.write(stderr);

    // stdout
    if (stdout && stdout.length > 0)
      process.stdout.write(stdout);
  },

  _beforeRun: function(command) {
    if (this.options.echo)
      console.log(command);
  }

});

module.exports = Evaluator;
