/**
 * Mongoose Plugin for Append-Only / Immutable Collections
 * Rejects in-place updates and deletions per rules.md §9 and architecture.md §10.1
 */
function appendOnlyPlugin(schema) {
  // Prevent instance modification after initial creation
  schema.pre('save', function (next) {
    if (!this.isNew) {
      const err = new Error(
        `Immutable document violation: records in collection '${this.constructor.collection.name}' are append-only and cannot be modified`
      );
      err.code = 'IMMUTABLE_RECORD';
      return next(err);
    }
    next();
  });

  // Block query-based update operators
  const updateHooks = [
    'updateOne',
    'updateMany',
    'findOneAndUpdate',
    'findByIdAndUpdate',
    'replaceOne',
    'findOneAndReplace',
  ];

  updateHooks.forEach((hook) => {
    schema.pre(hook, function () {
      const err = new Error(
        `Immutable document violation: updates are prohibited on append-only collection '${this.model.collection.name}'`
      );
      err.code = 'IMMUTABLE_RECORD';
      throw err;
    });
  });

  // Block query-based deletion operators
  const deleteHooks = [
    'deleteOne',
    'deleteMany',
    'findOneAndDelete',
    'findByIdAndDelete',
  ];

  deleteHooks.forEach((hook) => {
    schema.pre(hook, function () {
      const err = new Error(
        `Immutable document violation: deletions are prohibited on append-only collection '${this.model.collection.name}'`
      );
      err.code = 'IMMUTABLE_RECORD';
      throw err;
    });
  });
}

module.exports = appendOnlyPlugin;

