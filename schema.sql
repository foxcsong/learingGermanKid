-- German Hacker Kid - D1 Database Schema
-- Run this in your Cloudflare D1 Console

DROP TABLE IF EXISTS user_sessions;

CREATE TABLE user_sessions (
    username TEXT PRIMARY KEY,
    session_data TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);
