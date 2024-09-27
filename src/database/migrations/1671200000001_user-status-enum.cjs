exports.shorthands = undefined;

const resourceName = "user_status";

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TYPE ${resourceName} as ENUM (
      'active',
      'locked_out',
      'banned'
    );
    `);
};

exports.down = (pgm) => {
  pgm.sql(`
        DROP TYPE ${resourceName};
    `);
};
