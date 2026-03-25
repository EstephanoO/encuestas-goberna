import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://getwaibphvtnfqhizrer.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdldHdhaWJwaHZ0bmZxaGl6cmVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTkyNzIsImV4cCI6MjA4OTU5NTI3Mn0.UF-re3QUhMC7z2IMpa3wbZo6_61Uxh1BULZ9BFi6EZc',
);
