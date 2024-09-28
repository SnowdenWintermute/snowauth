exports.shorthands = undefined;

const resourceType="TABLE"
const resourceName="session_series"

exports.up = (pgm) => {
  pgm.sql(`
    CREATE ${resourceType} ${resourceName} (
      id VARCHAR(16) PRIMARY KEY,
      user_id INTEGER REFERENCES user_ids(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      hashed_token VARCHAR(32)
    );
    `);
};

exports.down = (pgm) => {
  pgm.sql(`
        DROP ${resourceType} ${resourceName};
    `);
};
