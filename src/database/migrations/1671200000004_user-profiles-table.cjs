exports.shorthands = undefined;

const resourceType="TABLE"
const resourceName="user_profiles"

exports.up = (pgm) => {
  pgm.sql(`
    CREATE ${resourceType} ${resourceName} (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES user_ids(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      username VARCHAR(24) NOT NULL UNIQUE,
      role user_role NOT NULL DEFAULT 'user',
      status user_status NOT NULL DEFAULT 'active',
      ban_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
    );
    `);
};

exports.down = (pgm) => {
  pgm.sql(`
        DROP ${resourceType} ${resourceName};
    `);
};
