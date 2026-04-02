SELECT table_name, column_name, character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND character_maximum_length = 20
ORDER BY table_name, column_name;
