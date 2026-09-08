/**
 * Mongoose Plugin for Append-Only / Immutable Collections
 * Rejects in-place updates and deletions per rules.md §9 and architecture.md §10.1
 */
function appendOnlyPlugin(schema, options = {}) {
  const allowedUpdates = Array.isArray(options.allowedUpdateFields)
    ? options.allowedUpdateFields
    : [];

  // Prevent unauthorized instance modification after initial creation
  schema.pre('save', function (next) {
    if (!this.isNew) {
      if (allowedUpdates.length > 0) {
        const modified = this.modifiedPaths ? this.modifiedPaths() : [];
        const forbidden = modified.filter(
          (p) => !allowedUpdates.includes(p) && p !== 'updated_at'
        );
        if (forbidden.length > 0) {
          const err = new Error(
            `Immutable document violation: records in collection '${this.constructor.collection.name}' cannot modify append-only fields: ${forbidden.join(', ')}`
          );
          err.code = 'IMMUTABLE_RECORD';
          return next(err);
        }
        return next();
      }

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
      if (allowedUpdates.length > 0 && typeof this.getUpdate === 'function') {
        const update = this.getUpdate();
        if (update) {
          const touchedFields = new Set();
          for (const [op, val] of Object.entries(update)) {
            if (op.startsWith('$')) {
              if (typeof val === 'object' && val !== null) {
                Object.keys(val).forEach((k) => touchedFields.add(k.split('.')[0]));
              }
            } else {
              touchedFields.add(op.split('.')[0]);
            }
          }
          const forbidden = Array.from(touchedFields).filter(
            (k) => !allowedUpdates.includes(k) && k !== 'updated_at'
          );
          if (forbidden.length > 0) {
            const err = new Error(
              `Immutable document violation: updates to append-only fields (${forbidden.join(', ')}) are prohibited on collection '${this.model.collection.name}'`
            );
            err.code = 'IMMUTABLE_RECORD';
            throw err;
          }
          return;
        }
      }

      const err = new Error(
        `Immutable document violation: updates are prohibited on append-only collection '${this.model.collection.name}'`
      );
      err.code = 'IMMUTABLE_RECORD';
      throw err;
    });
  });

  // Block query-based deletion operators completely
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

