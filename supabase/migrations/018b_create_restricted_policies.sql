CREATE POLICY "Authenticated full access" ON cashback_rules FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON cashback_balance FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON cashback_transactions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON coupons FOR ALL USING (auth.role() = 'authenticated');
