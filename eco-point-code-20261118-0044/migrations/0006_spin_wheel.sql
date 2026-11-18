-- Eco-Point voucher spin workflow, preserving historical report and redemption records.
CREATE TABLE spin_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  purchase_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','used')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  UNIQUE(user_id,purchase_key)
);
CREATE INDEX ix_spin_voucher_user_status ON spin_vouchers(user_id,status,created_at);
CREATE TABLE wheel_spins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  voucher_id UUID NOT NULL UNIQUE REFERENCES spin_vouchers(id),
  reward_id UUID NOT NULL REFERENCES rewards(id),
  redemption_id UUID NOT NULL UNIQUE REFERENCES redemptions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_wheel_spins_user ON wheel_spins(user_id,created_at DESC);
UPDATE waste_categories SET points=CASE 
  WHEN lower(name) IN ('organic','other') THEN 5
  WHEN lower(name)='paper' THEN 7
  WHEN lower(name)='plastic' THEN 8
  WHEN lower(name)='metal' THEN 10
  ELSE LEAST(10,GREATEST(5,points)) END;
ALTER TABLE waste_categories ADD CONSTRAINT ck_eco_category_points_5_10 CHECK (points BETWEEN 5 AND 10);
INSERT INTO rewards (name,description,point_cost,stock,is_active,category,pickup_instructions)
VALUES 
 ('Gantungan Kunci Eco-Point','Gantungan kunci bertema lingkungan untuk menemani aktivitasmu.',150,10,true,'spin_wheel','Tunjukkan status Siap diambil kepada petugas Eco-Point di lokasi pengambilan kampus.'),
 ('Sedotan Stainless Steel','Sedotan reusable untuk mengurangi sampah plastik sekali pakai.',150,10,true,'spin_wheel','Tunjukkan status Siap diambil kepada petugas Eco-Point di lokasi pengambilan kampus.'),
 ('Pembatas Buku Kertas Daur Ulang','Pembatas buku kreatif dari kertas daur ulang.',150,10,true,'spin_wheel','Tunjukkan status Siap diambil kepada petugas Eco-Point di lokasi pengambilan kampus.'),
 ('Pin atau Badge Eco-Point','Pin bertema daur ulang yang bisa dipasang pada tas atau pakaian.',150,10,true,'spin_wheel','Tunjukkan status Siap diambil kepada petugas Eco-Point di lokasi pengambilan kampus.'),
 ('Sachet Benih Tanaman','Benih untuk memulai kebiasaan menanam di rumah.',150,10,true,'spin_wheel','Tunjukkan status Siap diambil kepada petugas Eco-Point di lokasi pengambilan kampus.'),
 ('Pensil Ramah Lingkungan','Pensil dengan bahan berorientasi ramah lingkungan.',150,10,true,'spin_wheel','Tunjukkan status Siap diambil kepada petugas Eco-Point di lokasi pengambilan kampus.'),
 ('Magnet dari Material Daur Ulang','Magnet kecil bertema lingkungan dari material daur ulang.',150,10,true,'spin_wheel','Tunjukkan status Siap diambil kepada petugas Eco-Point di lokasi pengambilan kampus.'),
 ('Paket Stiker Edukasi Lingkungan','Stiker bertema gaya hidup berkelanjutan.',150,10,true,'spin_wheel','Tunjukkan status Siap diambil kepada petugas Eco-Point di lokasi pengambilan kampus.');