CREATE TABLE IF NOT EXISTS workout_path_choices (
  user_id text PRIMARY KEY NOT NULL,
  data_epoch integer NOT NULL,
  paths text NOT NULL,
  created_at integer NOT NULL
);
