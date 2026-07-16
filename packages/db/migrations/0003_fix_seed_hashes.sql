-- Update placeholder password hashes with actual bcrypt hash for 'Admin@1234'
UPDATE users 
SET password_hash = '$2a$12$Iyfvd9u4dYScMZrFOGEYEOUbS80sLiZx6z7miek8kFcDwvN5Nn78K' 
WHERE id IN ('user-admin', 'user-mgr01', 'user-ba01', 'user-dev01', 'user-qa01');
