-- Políticas de storage para o bucket files
-- Permite upload, leitura e exclusão para todos

DROP POLICY IF EXISTS "Allow all uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow all reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow all deletes" ON storage.objects;

CREATE POLICY "Allow all uploads" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'files');

CREATE POLICY "Allow all reads" ON storage.objects
  FOR SELECT USING (bucket_id = 'files');

CREATE POLICY "Allow all deletes" ON storage.objects
  FOR DELETE USING (bucket_id = 'files');
