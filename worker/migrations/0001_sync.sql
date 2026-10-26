CREATE TABLE owners (id TEXT PRIMARY KEY, created_at TEXT NOT NULL);
CREATE TABLE devices (
  owner_id TEXT NOT NULL REFERENCES owners(id), id TEXT NOT NULL,
  label TEXT NOT NULL, created_at TEXT NOT NULL, revoked_at TEXT,
  PRIMARY KEY (owner_id, id)
);
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY, owner_id TEXT NOT NULL, device_id TEXT NOT NULL,
  csrf TEXT NOT NULL, created_at TEXT NOT NULL, expires_at INTEGER NOT NULL,
  FOREIGN KEY (owner_id, device_id) REFERENCES devices(owner_id, id)
);
CREATE INDEX session_device ON sessions(owner_id, device_id);
CREATE INDEX session_expiry ON sessions(expires_at);
CREATE TABLE oauth_flows (
  token_hash TEXT PRIMARY KEY, state TEXT NOT NULL, verifier TEXT NOT NULL,
  device_id TEXT NOT NULL, label TEXT NOT NULL, expires_at INTEGER NOT NULL
);
CREATE INDEX oauth_expiry ON oauth_flows(expires_at);
CREATE TABLE session_history (
  owner_id TEXT NOT NULL REFERENCES owners(id), id TEXT NOT NULL, payload TEXT NOT NULL,
  PRIMARY KEY (owner_id, id)
);
CREATE TRIGGER session_history_conflict BEFORE UPDATE ON session_history
WHEN OLD.payload <> NEW.payload BEGIN SELECT RAISE(ABORT, 'session_conflict'); END;
CREATE TABLE events (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id TEXT NOT NULL REFERENCES owners(id), event_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('attempt', 'review', 'completion')),
  schema_version INTEGER NOT NULL CHECK(schema_version = 1),
  device_id TEXT NOT NULL, hash TEXT NOT NULL, payload TEXT NOT NULL,
  created_at TEXT NOT NULL, received_at TEXT NOT NULL,
  attempt_id TEXT, session_id TEXT,
  UNIQUE (owner_id, event_id),
  FOREIGN KEY (owner_id, attempt_id) REFERENCES events(owner_id, event_id),
  FOREIGN KEY (owner_id, session_id) REFERENCES session_history(owner_id, id)
);
CREATE INDEX event_download ON events(owner_id, sequence);
CREATE UNIQUE INDEX review_attempt ON events(owner_id, attempt_id) WHERE kind = 'review';
CREATE TRIGGER event_conflict BEFORE UPDATE ON events
WHEN OLD.hash <> NEW.hash OR OLD.payload <> NEW.payload
BEGIN SELECT RAISE(ABORT, 'event_conflict'); END;
CREATE TRIGGER review_reference BEFORE INSERT ON events WHEN NEW.kind = 'review'
AND NOT EXISTS (
  SELECT 1 FROM events a WHERE a.owner_id = NEW.owner_id AND a.event_id = NEW.attempt_id
  AND a.kind = 'attempt'
  AND json_extract(a.payload, '$.data.exerciseId') = json_extract(NEW.payload, '$.data.exerciseId')
)
BEGIN SELECT RAISE(ABORT, 'review_reference'); END;
