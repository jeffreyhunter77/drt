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
        return Q.ninvoke(child_process, 'exec', item, {}).then(this._pipeOutput);
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

  _pipeOutput: function(args) {
    // stderr
    if (args && args[1] && args[1].length > 0)
      process.stderr.write(args[1]);

    // stdout
    if (args && args[0] && args[0].length > 0)
      process.stdout.write(args[0]);

    return true;
  },

  _beforeRun: function(command) {
    if (this.options.echo)
      console.log(command);
  }

});

module.exports = Evaluator;
