var _ = require('lodash')
  , Q = require('q')
  , child_process = require('child_process')
;

function Evaluator(builder) {
  this.builder = builder;
}
_.extend(Evaluator.prototype, {

  evaluate: function(item) {
    try {

      if (_.isFunction(item)) {
        return Q(item.apply(this.builder)).then(this._applyResult.bind(this));
      } else {
        return Q.ninvoke(child_process, 'exec', item, {});
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
  }

});

module.exports = Evaluator;
