CREATE TABLE IF NOT EXISTS spotify_connections (
  user_id text PRIMARY KEY NOT NULL,
  spotify_user_id text NOT NULL,
  display_name text,
  access_token_enc text NOT NULL,
  refresh_token_enc text NOT NULL,
  expires_at integer NOT NULL,
  scopes text NOT NULL,
  data_epoch integer NOT NULL,
  updated_at integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS spotify_oauth_states (
  state_hash text PRIMARY KEY NOT NULL,
  cookie_hash text NOT NULL,
  user_id text NOT NULL,
  verifier_enc text NOT NULL,
  data_epoch integer NOT NULL,
  expires_at integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS spotify_oauth_states_user ON spotify_oauth_states(user_id);
